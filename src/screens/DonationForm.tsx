import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useTheme, fonts, Theme } from '../theme';
import { Card, PillButton, ProBadge } from '../components';
import { useApp, FREE_PHOTOS_PER_ITEM, PRO_PHOTOS_PER_ITEM } from '../state';
import {
  addCharity,
  addPhoto,
  countDonations,
  deleteDonation,
  deletePhoto,
  getCharities,
  getDonation,
  getPhotos,
  insertDonation,
  updateDonation,
  Charity,
  Photo,
  DonationKind,
  CONDITION_OPTIONS,
} from '../db';
import { deletePhotoFile, deletePhotoFiles, photoUri, storePhoto } from '../photos';
import { centsToEditable, formatCents, parseDollarsToCents } from '../money';
import { maybeRequestReview } from '../reviews';
import { VALUE_CATEGORIES, VALUE_GUIDE, ValueGuideItem, guideMidCents } from '../values';

interface Props {
  visible: boolean;
  donationId: number | null; // null = new donation
  onClose: () => void;
}

function todayIso(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function shiftDate(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
}

function prettyDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

const KINDS: { key: DonationKind; label: string; icon: string }[] = [
  { key: 'cash', label: 'Cash', icon: '💵' },
  { key: 'goods', label: 'Goods', icon: '📦' },
  { key: 'mileage', label: 'Mileage', icon: '🚗' },
];

/**
 * Value-guide picks accumulate into the description. Tapping the same item
 * twice should read "Jeans x2", not repeat the word — otherwise a bag of
 * clothes turns the year-end PDF into an unreadable run-on list.
 */
export function appendGuideItem(current: string, name: string): string {
  const parts = current.trim() ? current.trim().split(/,\s*/) : [];
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^${esc}(?: \u00d7(\\d+))?$`);
  for (let i = 0; i < parts.length; i++) {
    const m = parts[i].match(re);
    if (m) {
      const n = m[1] ? parseInt(m[1], 10) : 1;
      parts[i] = `${name} \u00d7${n + 1}`;
      return parts.join(', ');
    }
  }
  parts.push(name);
  return parts.join(', ');
}

export default function DonationFormModal({ visible, donationId, onClose }: Props) {
  const theme = useTheme();
  const { isPro, showPaywall, bumpItems, settings, year } = useApp();
  const [kind, setKind] = useState<DonationKind>('cash');
  const [date, setDate] = useState(todayIso());
  const [charityId, setCharityId] = useState<number | null>(null);
  const [charities, setCharities] = useState<Charity[]>([]);
  const [valueText, setValueText] = useState('');
  const [milesText, setMilesText] = useState('');
  const [description, setDescription] = useState('');
  const [condition, setCondition] = useState('');
  const [method, setMethod] = useState('');
  const [hasReceipt, setHasReceipt] = useState(false);
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [pendingPhotos, setPendingPhotos] = useState<string[]>([]);
  const [guideOpen, setGuideOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const editing = donationId !== null;

  const reset = useCallback(() => {
    setKind('cash');
    // Viewing a past tax year? Default new donations into that year so they
    // don't vanish behind the year filter the moment they're saved.
    setDate(year < Number(todayIso().slice(0, 4)) ? `${year}-12-31` : todayIso());
    setGuideOpen(false);
    setCharityId(null);
    setValueText('');
    setMilesText('');
    setDescription('');
    setCondition('');
    setMethod('');
    setHasReceipt(false);
    setNotes('');
    setPhotos([]);
    setPendingPhotos([]);
  }, [year]);

  useEffect(() => {
    if (!visible) return;
    (async () => {
      setCharities(await getCharities());
      if (donationId !== null) {
        const d = await getDonation(donationId);
        if (d) {
          setKind(d.kind);
          setDate(d.date);
          setCharityId(d.charityId);
          setValueText(centsToEditable(d.valueCents));
          setMilesText(d.miles > 0 ? String(d.miles) : '');
          setDescription(d.description);
          setCondition(d.condition);
          setMethod(d.method);
          setHasReceipt(d.hasReceipt);
          setNotes(d.notes);
          setPhotos(await getPhotos(donationId));
        }
      } else {
        reset();
      }
    })();
  }, [visible, donationId, reset]);

  const miles = Number(milesText.replace(',', '.')) || 0;
  const mileageCents = Math.round(miles * settings.mileageCents);

  const photoCount = editing ? photos.length : pendingPhotos.length;
  const photoCap = isPro ? PRO_PHOTOS_PER_ITEM : FREE_PHOTOS_PER_ITEM;

  const pickPhoto = async (fromCamera: boolean) => {
    if (photoCount >= photoCap) {
      if (!isPro) showPaywall();
      else Alert.alert('Photo limit', `Up to ${PRO_PHOTOS_PER_ITEM} photos per donation.`);
      return;
    }
    try {
      let result: ImagePicker.ImagePickerResult;
      if (fromCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Camera unavailable', 'Allow camera access in iOS Settings to photograph receipts and items.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
      }
      if (result.canceled || !result.assets?.length) return;
      const stored = await storePhoto(result.assets[0].uri);
      if (editing && donationId !== null) {
        await addPhoto(donationId, stored);
        setPhotos(await getPhotos(donationId));
        bumpItems();
      } else {
        setPendingPhotos((p) => [...p, stored]);
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch (e: any) {
      Alert.alert('Photo failed', e?.message ?? 'Please try again.');
    }
  };

  const removePhoto = async (index: number) => {
    if (editing) {
      const p = photos[index];
      const path = await deletePhoto(p.id);
      if (path) deletePhotoFile(path);
      setPhotos(photos.filter((_, i) => i !== index));
      bumpItems();
    } else {
      deletePhotoFile(pendingPhotos[index]);
      setPendingPhotos(pendingPhotos.filter((_, i) => i !== index));
    }
  };

  const onAddCharity = () => {
    Alert.prompt('New charity', 'Name as it appears on the receipt (e.g. Goodwill, Red Cross, St. Mary\'s).', async (text) => {
      try {
        const c = await addCharity(text ?? '');
        if (c) {
          setCharities(await getCharities());
          setCharityId(c.id);
        }
      } catch (e: any) {
        Alert.alert('Could not add charity', e?.message ?? 'Please try again.');
      }
    });
  };

  const applyGuide = (item: ValueGuideItem) => {
    const add = guideMidCents(item);
    const current = parseDollarsToCents(valueText);
    setValueText(centsToEditable(current + add));
    setDescription((d) => appendGuideItem(d, item.name));
    if (!method) setMethod('Thrift-shop value');
    if (!condition) setCondition('Good');
    Haptics.selectionAsync().catch(() => {});
  };

  const save = async () => {
    const valueCents = kind === 'mileage' ? mileageCents : parseDollarsToCents(valueText);
    if (kind === 'mileage' && miles <= 0) {
      Alert.alert('How many miles?', 'Enter the miles you drove for the charity.');
      return;
    }
    if (kind !== 'mileage' && valueCents <= 0) {
      Alert.alert(kind === 'cash' ? 'How much did you give?' : 'What is it worth?', kind === 'cash' ? 'Enter the amount, like 50 or 25.50.' : 'Enter the fair-market value, or pick items from the value guide.');
      return;
    }
    if (kind === 'goods' && !description.trim()) {
      Alert.alert('What did you give?', 'Describe the items — e.g. "2 bags of clothes, coffee table".');
      return;
    }
    setSaving(true);
    try {
      const input = {
        charityId,
        date,
        kind,
        valueCents,
        miles: kind === 'mileage' ? miles : 0,
        description,
        condition: kind === 'goods' ? condition : '',
        method: kind === 'goods' ? method : '',
        hasReceipt,
        notes,
      };
      if (editing && donationId !== null) {
        await updateDonation(donationId, input);
      } else {
        const newId = await insertDonation(input);
        for (const p of pendingPhotos) await addPhoto(newId, p);
        maybeRequestReview(await countDonations());
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      bumpItems();
      reset();
      onClose();
    } catch (e: any) {
      Alert.alert('Could not save', e?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = () => {
    if (!editing || donationId === null) return;
    Alert.alert('Delete this donation?', 'Its photos are removed too. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const paths = await deleteDonation(donationId);
          deletePhotoFiles(paths);
          bumpItems();
          onClose();
        },
      },
    ]);
  };

  const cancel = () => {
    if (!editing && pendingPhotos.length) deletePhotoFiles(pendingPhotos);
    reset();
    onClose();
  };

  const photoTiles = editing
    ? photos.map((p) => ({ key: String(p.id), uri: photoUri(p.path) }))
    : pendingPhotos.map((f, i) => ({ key: `${f}-${i}`, uri: photoUri(f) }));

  const guideSections = useMemo(
    () => VALUE_CATEGORIES.map((c) => ({ title: c, data: VALUE_GUIDE.filter((v) => v.category === c) })),
    []
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={cancel}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Pressable onPress={cancel} hitSlop={10}>
            <Text style={[styles.headerBtn, { color: theme.textSecondary }]}>Cancel</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>{editing ? 'Edit donation' : 'Add donation'}</Text>
          <Pressable onPress={save} hitSlop={10} disabled={saving}>
            <Text style={[styles.headerBtn, { color: theme.accent, fontWeight: fonts.weight.bold }]}>{saving ? '…' : 'Save'}</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.kindRow}>
            {KINDS.map((k) => {
              const active = kind === k.key;
              return (
                <Pressable
                  key={k.key}
                  onPress={() => setKind(k.key)}
                  style={[styles.kindBtn, { backgroundColor: active ? theme.accent : theme.card, borderColor: active ? theme.accent : theme.border }]}
                >
                  <Text style={styles.kindIcon}>{k.icon}</Text>
                  <Text style={[styles.kindText, { color: active ? '#FFFFFF' : theme.textSecondary }]}>{k.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Card theme={theme} style={styles.fieldCard}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Date</Text>
            <View style={styles.dateRow}>
              <Pressable onPress={() => setDate(shiftDate(date, -1))} hitSlop={8}>
                <Text style={[styles.dateArrow, { color: theme.accent }]}>‹</Text>
              </Pressable>
              <Text style={[styles.dateText, { color: theme.text }]}>{prettyDate(date)}</Text>
              <Pressable onPress={() => date < todayIso() && setDate(shiftDate(date, 1))} hitSlop={8}>
                <Text style={[styles.dateArrow, { color: date < todayIso() ? theme.accent : theme.border }]}>›</Text>
              </Pressable>
            </View>
            <View style={styles.quickRow}>
              {[-7, -30, -90].map((n) => (
                <QuickChip key={n} theme={theme} label={`${-n} days ago`} onPress={() => setDate(shiftDate(todayIso(), n))} />
              ))}
              <QuickChip theme={theme} label="Today" onPress={() => setDate(todayIso())} />
            </View>
          </Card>

          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Charity</Text>
          <View style={styles.chips}>
            {charities.map((c) => {
              const active = charityId === c.id;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setCharityId(active ? null : c.id)}
                  style={[styles.chip, { backgroundColor: active ? theme.accent : theme.card, borderColor: active ? theme.accent : theme.border }]}
                >
                  <Text style={[styles.chipText, { color: active ? '#FFF' : theme.textSecondary }]}>{c.name}</Text>
                </Pressable>
              );
            })}
            <Pressable onPress={onAddCharity} style={[styles.chip, { backgroundColor: theme.cardAlt, borderColor: theme.border }]}>
              <Text style={[styles.chipText, { color: theme.accent }]}>+ New charity</Text>
            </Pressable>
          </View>

          {kind === 'mileage' ? (
            <Card theme={theme} style={styles.fieldCard}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Miles driven{miles > 0 ? `  ·  ${formatCents(mileageCents)} at ${settings.mileageCents}¢/mile` : ''}
              </Text>
              <TextInput
                style={[styles.input, { color: theme.text }]}
                value={milesText}
                onChangeText={setMilesText}
                placeholder="24"
                placeholderTextColor={theme.textFaint}
                keyboardType="decimal-pad"
                maxLength={7}
              />
              <Text style={[styles.hint, { color: theme.textFaint }]}>
                Driving in service of a charity (deliveries, volunteering) is valued at {settings.mileageCents}¢ per mile, the rate set by law; parking and tolls can be added in notes.
              </Text>
            </Card>
          ) : (
            <Card theme={theme} style={styles.fieldCard}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                {kind === 'cash' ? 'Amount' : 'Fair-market value (total)'}
              </Text>
              <TextInput
                style={[styles.input, { color: theme.text }]}
                value={valueText}
                onChangeText={setValueText}
                placeholder={kind === 'cash' ? '$50' : '$0'}
                placeholderTextColor={theme.textFaint}
                keyboardType="decimal-pad"
              />
              {kind === 'goods' && (
                <Pressable onPress={() => setGuideOpen(true)} style={[styles.guideBtn, { backgroundColor: theme.accentSoft }]}>
                  <Text style={[styles.guideBtnText, { color: theme.accent }]}>📋  Add items from the value guide</Text>
                </Pressable>
              )}
            </Card>
          )}

          <Card theme={theme} style={styles.fieldCard}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              {kind === 'cash' ? 'What was it for (optional)' : kind === 'goods' ? 'What you gave' : 'Where you drove (optional)'}
            </Text>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              value={description}
              onChangeText={setDescription}
              placeholder={kind === 'cash' ? 'Annual fund, gala ticket (deductible part)' : kind === 'goods' ? '2 bags of clothes, coffee table, 12 books' : 'Food bank deliveries'}
              placeholderTextColor={theme.textFaint}
              multiline
            />
          </Card>

          {kind === 'goods' && (
            <>
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Condition</Text>
              <View style={styles.chips}>
                {CONDITION_OPTIONS.map((c) => {
                  const active = condition === c;
                  return (
                    <Pressable
                      key={c}
                      onPress={() => setCondition(active ? '' : c)}
                      style={[styles.chip, { backgroundColor: active ? theme.accent : theme.card, borderColor: active ? theme.accent : theme.border }]}
                    >
                      <Text style={[styles.chipText, { color: active ? '#FFF' : theme.textSecondary }]}>{c}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Card theme={theme} style={styles.fieldCard}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>How you valued it</Text>
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  value={method}
                  onChangeText={setMethod}
                  placeholder="Thrift-shop value, comparable sales, appraisal"
                  placeholderTextColor={theme.textFaint}
                />
                <View style={styles.quickRow}>
                  {['Thrift-shop value', 'Comparable sales', 'Appraisal'].map((m) => (
                    <QuickChip key={m} theme={theme} label={m} onPress={() => setMethod(m)} />
                  ))}
                </View>
              </Card>
            </>
          )}

          <Card theme={theme} style={styles.fieldCard}>
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: theme.textSecondary, marginBottom: 0 }]}>Receipt or written acknowledgment in hand</Text>
                <Text style={[styles.hint, { color: theme.textFaint, marginTop: 2 }]}>Required for any single gift of $250 or more.</Text>
              </View>
              <Switch value={hasReceipt} onValueChange={setHasReceipt} trackColor={{ true: theme.accent }} />
            </View>
          </Card>

          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Photos (receipt, items)</Text>
          <View style={styles.photoRow}>
            {photoTiles.map((t, i) => (
              <View key={t.key} style={styles.photoWrap}>
                <Image source={{ uri: t.uri }} style={styles.photo} />
                <Pressable onPress={() => removePhoto(i)} style={[styles.photoX, { backgroundColor: theme.danger }]} hitSlop={8}>
                  <Text style={styles.photoXText}>✕</Text>
                </Pressable>
              </View>
            ))}
            {photoTiles.length < PRO_PHOTOS_PER_ITEM && (
              <Pressable
                onPress={() => pickPhoto(true)}
                onLongPress={() => pickPhoto(false)}
                style={[styles.photoAdd, { borderColor: theme.border, backgroundColor: theme.card }]}
              >
                <Text style={styles.photoAddIcon}>📷</Text>
                <Text style={[styles.photoAddText, { color: theme.textSecondary }]}>{photoTiles.length === 0 ? 'Add photo' : 'More'}</Text>
                {!isPro && photoTiles.length >= FREE_PHOTOS_PER_ITEM && <ProBadge theme={theme} />}
              </Pressable>
            )}
          </View>
          <Text style={[styles.hint, { color: theme.textFaint, marginBottom: 14 }]}>Tap for camera · hold to pick from library</Text>

          <Card theme={theme} style={styles.fieldCard}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Notes</Text>
            <TextInput
              style={[styles.input, styles.notes, { color: theme.text }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Check #1042, receipt in email, drop-off at the 86th St location…"
              placeholderTextColor={theme.textFaint}
              multiline
            />
          </Card>

          {editing && (
            <View style={{ marginTop: 18 }}>
              <PillButton theme={theme} label="Delete donation" kind="ghost" onPress={onDelete} />
            </View>
          )}
        </ScrollView>

        <Modal visible={guideOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setGuideOpen(false)}>
          <View style={{ flex: 1, backgroundColor: theme.bg }}>
            <View style={[styles.guideHeader, { borderBottomColor: theme.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Value guide</Text>
                <Text style={[styles.hint, { color: theme.textFaint }]}>
                  Typical thrift-store prices for items in good used condition. Tap to add the midpoint to your total; adjust for brand and condition.
                  {valueText ? `  Running total: ${formatCents(parseDollarsToCents(valueText))}` : ''}
                </Text>
              </View>
              <Pressable onPress={() => setGuideOpen(false)} hitSlop={10}>
                <Text style={[styles.headerBtn, { color: theme.accent, fontWeight: fonts.weight.bold }]}>Done</Text>
              </Pressable>
            </View>
            <SectionList
              sections={guideSections}
              keyExtractor={(it) => it.name}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 60 }}
              stickySectionHeadersEnabled={false}
              renderSectionHeader={({ section }) => (
                <Text style={[styles.guideSection, { color: theme.textSecondary }]}>{section.title}</Text>
              )}
              renderItem={({ item }) => (
                <Pressable onPress={() => applyGuide(item)} style={[styles.guideRow, { borderBottomColor: theme.border }]}>
                  <Text style={[styles.guideName, { color: theme.text }]}>{item.name}</Text>
                  <Text style={[styles.guideRange, { color: theme.textFaint }]}>${item.low}–${item.high}</Text>
                  <Text style={[styles.guideAdd, { color: theme.accent }]}>+ {formatCents(guideMidCents(item))}</Text>
                </Pressable>
              )}
            />
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function QuickChip({ theme, label, onPress }: { theme: Theme; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.quickChip, { backgroundColor: theme.cardAlt }]}>
      <Text style={[styles.quickChipText, { color: theme.textSecondary }]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { fontSize: 16 },
  headerTitle: { fontSize: 17, fontWeight: fonts.weight.bold },
  scroll: { padding: 20, paddingBottom: 60 },
  kindRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  kindBtn: { flex: 1, borderRadius: 14, borderWidth: 1, paddingVertical: 12, alignItems: 'center', gap: 2 },
  kindIcon: { fontSize: 22 },
  kindText: { fontSize: 13, fontWeight: fonts.weight.semibold },
  fieldCard: { marginBottom: 12, paddingVertical: 12 },
  label: { fontSize: 12, fontWeight: fonts.weight.semibold, marginBottom: 4 },
  input: { fontSize: 17, paddingVertical: 2 },
  notes: { minHeight: 60, textAlignVertical: 'top' },
  hint: { fontSize: 12, lineHeight: 17, marginTop: 6 },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  dateArrow: { fontSize: 30, fontWeight: fonts.weight.bold, paddingHorizontal: 10 },
  dateText: { fontSize: 17, fontWeight: fonts.weight.semibold },
  quickRow: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  quickChip: { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6, maxWidth: 220 },
  quickChipText: { fontSize: 13, fontWeight: fonts.weight.medium },
  sectionLabel: { fontSize: 12, fontWeight: fonts.weight.semibold, marginBottom: 8, marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },
  chipText: { fontSize: 13, fontWeight: fonts.weight.medium },
  guideBtn: { marginTop: 10, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, alignSelf: 'flex-start' },
  guideBtnText: { fontSize: 14, fontWeight: fonts.weight.semibold },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoWrap: { position: 'relative' },
  photo: { width: 84, height: 84, borderRadius: 12 },
  photoX: { position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  photoXText: { color: '#FFF', fontSize: 11, fontWeight: fonts.weight.bold },
  photoAdd: { width: 84, height: 84, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 2 },
  photoAddIcon: { fontSize: 20 },
  photoAddText: { fontSize: 11 },
  guideHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  guideSection: { fontSize: 12, fontWeight: fonts.weight.semibold, textTransform: 'uppercase', letterSpacing: 1, marginTop: 20, marginBottom: 6 },
  guideRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  guideName: { flex: 1, fontSize: 15 },
  guideRange: { fontSize: 13, width: 64, textAlign: 'right' },
  guideAdd: { fontSize: 14, fontWeight: fonts.weight.bold, width: 56, textAlign: 'right' },
});
