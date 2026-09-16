import React, { useEffect, useState } from 'react';
import Constants from 'expo-constants';
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useTheme, fonts } from '../theme';
import { Card, SectionTitle, ProBadge, PillButton } from '../components';
import { useApp } from '../state';
import { addCharity, deleteAllData, deleteCharity, getCharities, updateCharity, Charity, DEFAULT_MILEAGE_CENTS } from '../db';
import { deletePhotoFiles } from '../photos';
import { restorePurchases, isBillingAvailable } from '../purchases';

const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
const PRIVACY_URL = 'https://bkdigitalleads-cmyk.github.io/given/privacy.html';

export default function SettingsScreen() {
  const theme = useTheme();
  const { settings, updateSettings, isPro, setIsPro, showPaywall, bumpItems, itemsVersion } = useApp();
  const [busy, setBusy] = useState(false);
  const [charities, setCharities] = useState<Charity[]>([]);
  const [editing, setEditing] = useState<Charity | null>(null);
  const [eName, setEName] = useState('');
  const [eEin, setEEin] = useState('');
  const [eAddress, setEAddress] = useState('');
  const [mileageText, setMileageText] = useState(String(settings.mileageCents));

  useEffect(() => {
    getCharities().then(setCharities);
  }, [itemsVersion]);

  useEffect(() => {
    setMileageText(String(settings.mileageCents));
  }, [settings.mileageCents]);

  const openEdit = (c: Charity) => {
    setEditing(c);
    setEName(c.name);
    setEEin(c.ein);
    setEAddress(c.address);
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (!eName.trim()) {
      Alert.alert('Name required', 'Give the charity a name.');
      return;
    }
    try {
      await updateCharity(editing.id, eName, eEin, eAddress);
      setEditing(null);
      bumpItems();
    } catch (e: any) {
      Alert.alert('Could not save', /UNIQUE/i.test(String(e?.message)) ? 'A charity with that name already exists.' : e?.message ?? 'Please try again.');
    }
  };

  const onAddCharity = () => {
    Alert.prompt('New charity', 'Name as it appears on the receipt.', async (text) => {
      try {
        const c = await addCharity(text ?? '');
        if (c) bumpItems();
      } catch (e: any) {
        Alert.alert('Could not add charity', e?.message ?? 'Please try again.');
      }
    });
  };

  const onDeleteCharity = (c: Charity) => {
    Alert.alert(`Remove ${c.name}?`, 'Its donations stay in your log, just without a charity name.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await deleteCharity(c.id);
          setEditing(null);
          bumpItems();
        },
      },
    ]);
  };

  const commitMileage = () => {
    const n = Number(mileageText);
    if (!isFinite(n) || n <= 0 || n > 200) {
      setMileageText(String(settings.mileageCents));
      return;
    }
    updateSettings({ mileageCents: Math.round(n) });
  };

  const onToggleLock = async () => {
    if (!isPro) {
      showPaywall();
      return;
    }
    if (!settings.lockEnabled) {
      const hw = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hw || !enrolled) {
        Alert.alert('Face ID unavailable', 'Set up Face ID or a device passcode in iOS Settings first.');
        return;
      }
    }
    await updateSettings({ lockEnabled: !settings.lockEnabled });
  };

  const onRestore = async () => {
    if (!isBillingAvailable()) {
      Alert.alert('Unavailable', 'Purchases are not available right now.');
      return;
    }
    setBusy(true);
    const res = await restorePurchases();
    setBusy(false);
    if (res.ok) {
      setIsPro(res.isPro);
      Alert.alert(res.isPro ? 'Restored!' : 'No purchases found', res.isPro ? 'Your Pro access is back.' : 'We couldn’t find a previous purchase on this Apple ID.');
    } else {
      Alert.alert('Restore failed', res.error ?? 'Please try again.');
    }
  };

  const onDeleteAll = () => {
    Alert.alert('Delete your entire donation log?', 'Every donation, charity, and photo is permanently erased from this device. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete everything',
        style: 'destructive',
        onPress: async () => {
          const paths = await deleteAllData();
          deletePhotoFiles(paths);
          bumpItems();
        },
      },
    ]);
  };

  const rowText = (label: string, pro?: boolean) => (
    <View style={styles.rowLabel}>
      <Text style={[styles.rowText, { color: theme.text }]}>{label}</Text>
      {pro && !isPro ? <ProBadge theme={theme} /> : null}
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Text style={[styles.title, { color: theme.text }]}>Settings</Text>

      {!isPro && (
        <Pressable onPress={showPaywall}>
          <Card theme={theme} style={{ ...styles.upsell, backgroundColor: theme.accentSoft }}>
            <Text style={[styles.upsellTitle, { color: theme.accent }]}>Given Pro</Text>
            <Text style={[styles.upsellSub, { color: theme.text }]}>
              Unlimited donations · 6 photos per donation · Year-end tax PDF · CSV export · Face ID lock
            </Text>
          </Card>
        </Pressable>
      )}

      <SectionTitle theme={theme}>Charities</SectionTitle>
      <Card theme={theme}>
        {charities.map((c) => (
          <Pressable key={c.id} onPress={() => openEdit(c)} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowText, { color: theme.text }]}>{c.name}</Text>
              {(c.ein || c.address) ? (
                <Text style={[styles.rowSub, { color: theme.textFaint }]} numberOfLines={1}>
                  {[c.ein ? `EIN ${c.ein}` : '', c.address].filter(Boolean).join(' · ')}
                </Text>
              ) : null}
            </View>
            <Text style={{ color: theme.textFaint }}>›</Text>
          </Pressable>
        ))}
        <Pressable onPress={onAddCharity} style={styles.row}>
          <Text style={[styles.rowText, { color: theme.accent, fontWeight: fonts.weight.semibold }]}>+ Add charity</Text>
        </Pressable>
        <Text style={[styles.note, { color: theme.textFaint }]}>Tap a charity to add its EIN and address (Form 8283 asks for the donee's address).</Text>
      </Card>

      <SectionTitle theme={theme}>Report details</SectionTitle>
      <Card theme={theme}>
        <Text style={[styles.customLabel, { color: theme.textSecondary }]}>Donor name on the summary</Text>
        <TextInput
          style={[styles.nameInput, { color: theme.text }]}
          value={settings.donorName}
          onChangeText={(v) => updateSettings({ donorName: v })}
          placeholder="Jordan and Sam Rivera"
          placeholderTextColor={theme.textFaint}
        />
        <Text style={[styles.customLabel, { color: theme.textSecondary, marginTop: 14 }]}>Charitable mileage rate (¢ per mile)</Text>
        <View style={styles.mileageRow}>
          <TextInput
            style={[styles.customInput, { color: theme.text, borderColor: theme.border }]}
            keyboardType="number-pad"
            maxLength={3}
            value={mileageText}
            onChangeText={setMileageText}
            onBlur={commitMileage}
            onSubmitEditing={commitMileage}
          />
          <Text style={[styles.note, { color: theme.textFaint, flex: 1, marginTop: 0 }]}>
            The IRS charitable rate is set by law at {DEFAULT_MILEAGE_CENTS}¢. Change it only if the law changes.
          </Text>
        </View>
      </Card>

      <SectionTitle theme={theme}>Security</SectionTitle>
      <Card theme={theme}>
        <View style={styles.row}>
          {rowText('Lock with Face ID', true)}
          <Switch value={settings.lockEnabled} onValueChange={onToggleLock} trackColor={{ true: theme.accent }} />
        </View>
      </Card>

      <SectionTitle theme={theme}>Privacy & data</SectionTitle>
      <Card theme={theme}>
        <Text style={[styles.privacyNote, { color: theme.textSecondary }]}>
          Your giving never leaves this iPhone. No account, no cloud, no tracking. Use the Summary tab to export a copy for your preparer.
        </Text>
      </Card>

      <SectionTitle theme={theme}>Purchases</SectionTitle>
      <Card theme={theme}>
        <Pressable onPress={onRestore} disabled={busy} style={styles.row}>
          {rowText('Restore purchases')}
          <Text style={{ color: theme.textFaint }}>›</Text>
        </Pressable>
        <Pressable onPress={() => Linking.openURL(TERMS_URL)} style={styles.row}>
          {rowText('Terms of Use (EULA)')}
          <Text style={{ color: theme.textFaint }}>›</Text>
        </Pressable>
        <Pressable onPress={() => Linking.openURL(PRIVACY_URL)} style={styles.row}>
          {rowText('Privacy Policy')}
          <Text style={{ color: theme.textFaint }}>›</Text>
        </Pressable>
      </Card>

      <SectionTitle theme={theme}>Danger zone</SectionTitle>
      <Card theme={theme}>
        <Pressable onPress={onDeleteAll} style={styles.row}>
          <Text style={[styles.rowText, { color: theme.danger }]}>Delete all donations & photos</Text>
        </Pressable>
      </Card>

      <Text style={[styles.version, { color: theme.textFaint }]}>Given v{Constants.expoConfig?.version ?? ''} · Made with care in NYC</Text>

      <Modal visible={editing !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditing(null)}>
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.pickerHeader, { borderBottomColor: theme.border }]}>
            <Pressable onPress={() => setEditing(null)} hitSlop={10}>
              <Text style={[styles.rowText, { color: theme.textSecondary }]}>Cancel</Text>
            </Pressable>
            <Text style={[styles.pickerTitle, { color: theme.text }]}>Edit charity</Text>
            <Pressable onPress={saveEdit} hitSlop={10}>
              <Text style={[styles.rowText, { color: theme.accent, fontWeight: fonts.weight.bold }]}>Save</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
            <Card theme={theme} style={styles.fieldCard}>
              <Text style={[styles.customLabel, { color: theme.textSecondary }]}>Name</Text>
              <TextInput style={[styles.nameInput, { color: theme.text }]} value={eName} onChangeText={setEName} placeholder="Goodwill Industries" placeholderTextColor={theme.textFaint} />
            </Card>
            <Card theme={theme} style={styles.fieldCard}>
              <Text style={[styles.customLabel, { color: theme.textSecondary }]}>EIN / tax ID (optional)</Text>
              <TextInput style={[styles.nameInput, { color: theme.text }]} value={eEin} onChangeText={setEEin} placeholder="12-3456789" placeholderTextColor={theme.textFaint} keyboardType="numbers-and-punctuation" />
            </Card>
            <Card theme={theme} style={styles.fieldCard}>
              <Text style={[styles.customLabel, { color: theme.textSecondary }]}>Address (optional)</Text>
              <TextInput style={[styles.nameInput, { color: theme.text }]} value={eAddress} onChangeText={setEAddress} placeholder="123 Main St, Brooklyn, NY 11201" placeholderTextColor={theme.textFaint} multiline />
            </Card>
            <View style={{ marginTop: 18 }}>
              <PillButton theme={theme} label="Remove charity" kind="ghost" onPress={() => editing && onDeleteCharity(editing)} />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingTop: 24, paddingBottom: 48 },
  title: { fontSize: 26, fontWeight: fonts.weight.bold, letterSpacing: -0.5, marginBottom: 8 },
  upsell: { marginTop: 8, borderWidth: 0 },
  upsellTitle: { fontSize: 17, fontWeight: fonts.weight.bold, marginBottom: 4 },
  upsellSub: { fontSize: 14, lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, minHeight: 40 },
  rowLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowText: { fontSize: 16 },
  rowSub: { fontSize: 12, marginTop: 1 },
  note: { fontSize: 11, lineHeight: 16, marginTop: 6 },
  customLabel: { fontSize: 12, fontWeight: fonts.weight.semibold, marginBottom: 4 },
  customInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 16, width: 80 },
  mileageRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nameInput: { fontSize: 17, paddingVertical: 2 },
  fieldCard: { marginBottom: 12, paddingVertical: 12 },
  privacyNote: { fontSize: 13, lineHeight: 19, paddingVertical: 4 },
  version: { textAlign: 'center', marginTop: 28, fontSize: 12 },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerTitle: { fontSize: 17, fontWeight: fonts.weight.bold },
});
