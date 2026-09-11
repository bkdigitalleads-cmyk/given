import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme, fonts, Theme } from '../theme';
import { Card } from '../components';
import { useApp, FREE_ITEM_LIMIT, currentYear } from '../state';
import { countDonations, getCharities, getDonations, getTotals, getYears, Charity, Donation, Totals, KIND_LABEL } from '../db';
import { photoUri } from '../photos';
import { formatCents } from '../money';

const KIND_ICON = { cash: '💵', goods: '📦', mileage: '🚗' } as const;

function prettyDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function HomeScreen({ onAddItem, onOpenItem }: { onAddItem: () => void; onOpenItem: (id: number) => void }) {
  const theme = useTheme();
  const { isPro, showPaywall, itemsVersion, year, updateSettings } = useApp();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [charities, setCharities] = useState<Charity[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [charityFilter, setCharityFilter] = useState<number | 'all'>('all');
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    const opts: { year: number; charityId?: number; query?: string } = { year };
    if (charityFilter !== 'all') opts.charityId = charityFilter;
    if (query.trim()) opts.query = query.trim();
    setDonations(await getDonations(opts));
    setCharities(await getCharities());
    const ys = await getYears();
    const cy = currentYear();
    const merged = [...new Set([cy, year, ...ys])].sort((a, b) => b - a);
    setYears(merged);
    setTotals(await getTotals({ year }));
    setTotalCount(await countDonations());
  }, [year, charityFilter, query]);

  useEffect(() => {
    load();
  }, [load, itemsVersion]);

  const atFreeLimit = !isPro && totalCount >= FREE_ITEM_LIMIT;
  const nearFreeLimit = !isPro && !atFreeLimit && totalCount >= FREE_ITEM_LIMIT - 3;

  const handleAdd = () => {
    if (atFreeLimit) {
      showPaywall();
      return;
    }
    onAddItem();
  };

  const renderItem = ({ item }: { item: Donation }) => (
    <Pressable onPress={() => onOpenItem(item.id)}>
      <Card theme={theme} style={styles.itemCard}>
        <View style={styles.itemRow}>
          {item.coverPath ? (
            <Image source={{ uri: photoUri(item.coverPath) }} style={styles.thumb} />
          ) : (
            <View style={[styles.thumb, styles.thumbEmpty, { backgroundColor: theme.cardAlt }]}>
              <Text style={styles.thumbEmoji}>{KIND_ICON[item.kind]}</Text>
            </View>
          )}
          <View style={styles.itemBody}>
            <Text style={[styles.itemName, { color: theme.text }]} numberOfLines={1}>
              {item.charityName ?? 'No charity set'}
            </Text>
            <Text style={[styles.itemMeta, { color: theme.textFaint }]} numberOfLines={1}>
              {prettyDate(item.date)} · {KIND_LABEL[item.kind]}
              {item.description ? ` · ${item.description}` : ''}
              {item.hasReceipt ? ' · 🧾' : ''}
            </Text>
          </View>
          <Text style={[styles.itemValue, { color: theme.accent }]}>{formatCents(item.valueCents)}</Text>
        </View>
      </Card>
    </Pressable>
  );

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={donations}
        keyExtractor={(it) => String(it.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            <Text style={[styles.brand, { color: theme.accent }]}>Given</Text>

            <View style={styles.yearRow}>
              {years.map((y) => (
                <Chip key={y} theme={theme} label={String(y)} active={y === year} onPress={() => updateSettings({ activeYear: y === currentYear() ? 0 : y })} />
              ))}
            </View>

            <Card theme={theme} style={styles.heroCard}>
              <Text style={[styles.heroLabel, { color: theme.textSecondary }]}>Given in {year}</Text>
              <Text style={[styles.heroValue, { color: theme.text }]}>{formatCents(totals?.totalCents ?? 0)}</Text>
              <View style={styles.breakdown}>
                <Mini theme={theme} label="Cash" value={formatCents(totals?.cashCents ?? 0)} />
                <Mini theme={theme} label="Goods" value={formatCents(totals?.goodsCents ?? 0)} />
                <Mini theme={theme} label="Mileage" value={formatCents(totals?.mileageCents ?? 0)} />
              </View>
              <Text style={[styles.heroMeta, { color: theme.textFaint }]}>
                {totals?.count ?? 0} donation{(totals?.count ?? 0) === 1 ? '' : 's'} · {totals?.charityCount ?? 0} {(totals?.charityCount ?? 0) === 1 ? 'charity' : 'charities'} · {totals?.receiptCount ?? 0} with receipts
              </Text>
            </Card>

            {(atFreeLimit || nearFreeLimit) && (
              <Pressable onPress={showPaywall}>
                <Card theme={theme} style={{ ...styles.limitCard, backgroundColor: theme.accentSoft }}>
                  <Text style={[styles.limitText, { color: theme.accent }]}>
                    {atFreeLimit
                      ? `Free plan is full (${FREE_ITEM_LIMIT} donations). Go Pro for unlimited →`
                      : `${FREE_ITEM_LIMIT - totalCount} free donations left. Go Pro for unlimited →`}
                  </Text>
                </Card>
              </Pressable>
            )}

            <TextInput
              style={[styles.search, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
              placeholder="Search donations, notes, charities…"
              placeholderTextColor={theme.textFaint}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              clearButtonMode="while-editing"
            />

            {charities.length > 0 && (
              <View style={styles.chips}>
                <Chip label="All" active={charityFilter === 'all'} onPress={() => setCharityFilter('all')} theme={theme} />
                {charities.map((c) => (
                  <Chip key={c.id} label={c.name} active={charityFilter === c.id} onPress={() => setCharityFilter(charityFilter === c.id ? 'all' : c.id)} theme={theme} />
                ))}
              </View>
            )}
            <View style={{ height: 14 }} />
          </View>
        }
        ListEmptyComponent={
          <Card theme={theme} style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🎁</Text>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              {query || charityFilter !== 'all' ? 'Nothing here yet' : `Log your first ${year} donation`}
            </Text>
            <Text style={[styles.emptyBody, { color: theme.textSecondary }]}>
              {query || charityFilter !== 'all'
                ? 'Try a different search or charity.'
                : 'Cash gifts, bags for the thrift store, miles driven for a cause — tap ＋ right after you give, while the receipt is still in your hand.'}
            </Text>
          </Card>
        }
      />
      <Pressable
        onPress={handleAdd}
        style={({ pressed }) => [styles.fab, { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 }]}
        accessibilityLabel="Add donation"
      >
        <Text style={styles.fabPlus}>＋</Text>
      </Pressable>
    </View>
  );
}

function Mini({ theme, label, value }: { theme: Theme; label: string; value: string }) {
  return (
    <View style={styles.mini}>
      <Text style={[styles.miniValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.miniLabel, { color: theme.textFaint }]}>{label}</Text>
    </View>
  );
}

function Chip({ label, active, onPress, theme }: { label: string; active: boolean; onPress: () => void; theme: Theme }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, { backgroundColor: active ? theme.accent : theme.card, borderColor: active ? theme.accent : theme.border }]}
    >
      <Text style={[styles.chipText, { color: active ? '#FFFFFF' : theme.textSecondary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { padding: 20, paddingBottom: 120 },
  brand: { fontSize: 15, fontWeight: fonts.weight.bold, marginBottom: 8, letterSpacing: 0.3 },
  yearRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  heroCard: { alignItems: 'center', paddingVertical: 20 },
  heroLabel: { fontSize: 13, fontWeight: fonts.weight.medium },
  heroValue: { fontSize: 40, fontWeight: fonts.weight.bold, letterSpacing: -1, marginVertical: 2 },
  breakdown: { flexDirection: 'row', gap: 22, marginTop: 10 },
  mini: { alignItems: 'center' },
  miniValue: { fontSize: 15, fontWeight: fonts.weight.semibold },
  miniLabel: { fontSize: 11, marginTop: 1 },
  heroMeta: { fontSize: 12, marginTop: 12, textAlign: 'center' },
  limitCard: { marginTop: 10, paddingVertical: 12, borderWidth: 0 },
  limitText: { fontSize: 14, fontWeight: fonts.weight.semibold, textAlign: 'center' },
  search: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16, marginTop: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { fontSize: 13, fontWeight: fonts.weight.medium },
  itemCard: { marginBottom: 10, padding: 12 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumb: { width: 52, height: 52, borderRadius: 10 },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  thumbEmoji: { fontSize: 22 },
  itemBody: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: fonts.weight.semibold },
  itemMeta: { fontSize: 13, marginTop: 2 },
  itemValue: { fontSize: 15, fontWeight: fonts.weight.bold },
  emptyCard: { alignItems: 'center', paddingVertical: 30 },
  emptyEmoji: { fontSize: 40, marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: fonts.weight.bold },
  emptyBody: { fontSize: 14, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  fabPlus: { color: '#FFFFFF', fontSize: 30, lineHeight: 34, fontWeight: fonts.weight.semibold },
});
