import React, { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme, fonts, Theme } from '../theme';
import { Card, PillButton, ProBadge, SectionTitle } from '../components';
import { useApp } from '../state';
import { getTotals, Totals, exportCsv } from '../db';
import { generateAndSharePdf } from '../report';
import { maybeRequestReviewAfterExport } from '../reviews';
import { formatCents } from '../money';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';

const PUB_526_URL = 'https://www.irs.gov/publications/p526';
const FORM_8283_URL = 'https://www.irs.gov/forms-pubs/about-form-8283';

export default function ReportScreen() {
  const theme = useTheme();
  const { isPro, showPaywall, itemsVersion, year } = useApp();
  const [totals, setTotals] = useState<Totals | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getTotals({ year }).then(setTotals);
  }, [itemsVersion, year]);

  const requirePro = (fn: () => void) => () => {
    if (!isPro) {
      showPaywall();
      return;
    }
    fn();
  };

  const onPdf = requirePro(async () => {
    if ((totals?.count ?? 0) === 0) {
      Alert.alert('Nothing to report yet', `Log a few ${year} donations first, then create the summary.`);
      return;
    }
    try {
      setBusy(true);
      await generateAndSharePdf(year);
      maybeRequestReviewAfterExport();
    } catch (e: any) {
      Alert.alert('Report failed', e?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  });

  const onCsv = requirePro(async () => {
    try {
      setBusy(true);
      const csv = await exportCsv({ year });
      const file = new File(Paths.cache, `given-donations-${year}.csv`);
      if (file.exists) file.delete();
      file.write(csv);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: `Export your ${year} donations` });
      }
    } catch (e: any) {
      Alert.alert('Export failed', e?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  });

  const flags: string[] = [];
  if (totals?.goodsOver500) flags.push('Noncash donations are over $500 for the year: Form 8283 is generally required. The summary PDF carries the details it asks for.');
  if (totals?.anyGoodsOver5000) flags.push('A single noncash donation is $5,000 or more: a qualified appraisal is generally required.');
  if (totals && totals.unreceiptedOver250 > 0) flags.push(`${totals.unreceiptedOver250} donation${totals.unreceiptedOver250 === 1 ? '' : 's'} of $250 or more not yet marked as having a written acknowledgment from the charity, which the IRS requires for any single gift at that level.`);

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={[styles.title, { color: theme.text }]}>Tax summary</Text>
      <Text style={[styles.sub, { color: theme.textSecondary }]}>
        Everything you gave in {year}, grouped by charity with values, receipts, and photos. The document your preparer or your tax software asks for in April.
      </Text>

      <Card theme={theme} style={styles.statsCard}>
        <View style={styles.statRow}>
          <Stat label="Cash" value={formatCents(totals?.cashCents ?? 0)} theme={theme} />
          <Stat label="Goods" value={formatCents(totals?.goodsCents ?? 0)} theme={theme} />
          <Stat label="Mileage" value={formatCents(totals?.mileageCents ?? 0)} theme={theme} />
        </View>
        <View style={[styles.totalBar, { backgroundColor: theme.accentSoft }]}>
          <Text style={[styles.totalLabel, { color: theme.accent }]}>Total given in {year}</Text>
          <Text style={[styles.totalValue, { color: theme.accent }]}>{formatCents(totals?.totalCents ?? 0)}</Text>
        </View>
      </Card>

      {flags.length > 0 && (
        <Card theme={theme} style={{ ...styles.flagCard, borderColor: theme.accent }}>
          {flags.map((f) => (
            <Text key={f} style={[styles.flagText, { color: theme.text }]}>• {f}</Text>
          ))}
        </Card>
      )}

      <SectionTitle theme={theme}>Export</SectionTitle>
      <Card theme={theme} style={styles.exportCard}>
        <View style={styles.exportTitleRow}>
          <Text style={[styles.exportTitle, { color: theme.text }]}>{year} summary (PDF)</Text>
          {!isPro && <ProBadge theme={theme} />}
        </View>
        <Text style={[styles.exportBody, { color: theme.textSecondary }]}>
          Grouped by charity: date, type, description, condition, fair-market value, receipt status, photos, and totals by type, plus the Form 8283 and $250-acknowledgment notes your preparer looks for.
        </Text>
        <PillButton theme={theme} label={busy ? 'Working…' : 'Create PDF'} onPress={onPdf} disabled={busy} />
      </Card>

      <Card theme={theme} style={styles.exportCard}>
        <View style={styles.exportTitleRow}>
          <Text style={[styles.exportTitle, { color: theme.text }]}>CSV spreadsheet</Text>
          {!isPro && <ProBadge theme={theme} />}
        </View>
        <Text style={[styles.exportBody, { color: theme.textSecondary }]}>
          Every {year} donation as a spreadsheet, ready to hand to a preparer or import into tax software.
        </Text>
        <PillButton theme={theme} label={busy ? 'Working…' : 'Export CSV'} onPress={onCsv} disabled={busy} kind="ghost" />
      </Card>

      <SectionTitle theme={theme}>Good to know</SectionTitle>
      <Card theme={theme}>
        <Text style={[styles.infoText, { color: theme.textSecondary }]}>
          • Starting with tax year 2026, cash gifts to qualifying charities can be deducted even if you don't itemize (up to $1,000 single / $2,000 married filing jointly). Goods and mileage still require itemizing, and itemized charitable deductions now apply only above 0.5% of AGI.{'\n'}
          • Donated clothing and household items count at fair-market value and must be in at least good used condition.{'\n'}
          • Any single gift of $250 or more needs a written acknowledgment from the charity, dated before you file.{'\n'}
          • Noncash gifts over $500 for the year go on Form 8283; a single item at $5,000+ generally needs an appraisal.
        </Text>
        <View style={styles.linkRow}>
          <Pressable onPress={() => Linking.openURL(PUB_526_URL)}>
            <Text style={[styles.link, { color: theme.accent }]}>IRS Publication 526 ›</Text>
          </Pressable>
          <Pressable onPress={() => Linking.openURL(FORM_8283_URL)}>
            <Text style={[styles.link, { color: theme.accent }]}>Form 8283 ›</Text>
          </Pressable>
        </View>
        <Text style={[styles.disclaimer, { color: theme.textFaint }]}>
          Record-keeping aid, not tax advice. Confirm with the IRS or your preparer.
        </Text>
      </Card>
    </ScrollView>
  );
}

function Stat({ label, value, theme }: { label: string; value: string; theme: Theme }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.textFaint }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 60 },
  title: { fontSize: 26, fontWeight: fonts.weight.bold, letterSpacing: -0.5 },
  sub: { fontSize: 14, lineHeight: 20, marginTop: 6 },
  statsCard: { marginTop: 16, paddingBottom: 12 },
  statRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: fonts.weight.bold },
  statLabel: { fontSize: 12, marginTop: 2 },
  totalBar: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 13, fontWeight: fonts.weight.semibold },
  totalValue: { fontSize: 17, fontWeight: fonts.weight.bold },
  flagCard: { marginTop: 12, borderWidth: 1, gap: 6 },
  flagText: { fontSize: 13, lineHeight: 18 },
  exportCard: { marginBottom: 12, gap: 10 },
  exportTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  exportTitle: { fontSize: 16, fontWeight: fonts.weight.semibold },
  exportBody: { fontSize: 13, lineHeight: 18 },
  infoText: { fontSize: 13, lineHeight: 19 },
  linkRow: { flexDirection: 'row', gap: 18, marginTop: 10 },
  link: { fontSize: 13, fontWeight: fonts.weight.semibold },
  disclaimer: { fontSize: 11, marginTop: 10, lineHeight: 15 },
});
