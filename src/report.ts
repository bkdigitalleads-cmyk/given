/**
 * Year-end charitable contributions summary, generated fully on-device with
 * expo-print. This is the app's money moment at tax time: every donation
 * for the year grouped by charity — date, type, description, condition,
 * fair-market value, receipt status, and photos — with totals by type and
 * the substantiation notes a preparer looks for (written acknowledgments
 * at $250+, Form 8283 at $500+ noncash, appraisal at $5,000+).
 */
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDonationsGroupedByCharity, getPhotos, getTotals, Donation, KIND_LABEL } from './db';
import { photoThumbBase64Diag } from './photos';
import { formatCents } from './money';
import { DEFAULT_SETTINGS, SETTINGS_KEY, Settings } from './state';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtMiles(m: number): string {
  const s = m.toFixed(1);
  return s.endsWith('.0') ? s.slice(0, -2) : s;
}

function prettyDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

async function loadSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    // fall through
  }
  return { ...DEFAULT_SETTINGS };
}

async function donationRow(d: Donation): Promise<string> {
  let thumb = '';
  if (d.photoCount > 0) {
    const photos = await getPhotos(d.id);
    if (photos.length > 0) {
      const res = await photoThumbBase64Diag(photos[0].path);
      thumb = res.b64
        ? `<img src="data:image/jpeg;base64,${res.b64}" style="width:52px;height:52px;object-fit:cover;border-radius:6px;" />`
        : `<div class="noimg">photo not available</div>`;
    }
  }
  const meta: string[] = [];
  if (d.kind === 'goods' && d.condition) meta.push(`Condition: ${esc(d.condition)}`);
  if (d.kind === 'goods' && d.method) meta.push(`Valued by: ${esc(d.method)}`);
  if (d.kind === 'mileage') meta.push(`${fmtMiles(d.miles)} miles`);
  if (d.hasReceipt) meta.push('Receipt / acknowledgment on file');
  if (d.notes) meta.push(esc(d.notes));
  return `
    <tr>
      <td class="thumb">${thumb}</td>
      <td class="date">${prettyDate(d.date)}</td>
      <td class="kind">${KIND_LABEL[d.kind]}</td>
      <td>
        <div class="name">${esc(d.description || (d.kind === 'cash' ? 'Cash gift' : d.kind === 'mileage' ? 'Volunteer driving' : 'Donated goods'))}</div>
        ${meta.length ? `<div class="meta">${meta.join(' · ')}</div>` : ''}
      </td>
      <td class="value">${formatCents(d.valueCents)}</td>
    </tr>`;
}

export async function buildReportHtml(year: number): Promise<string> {
  const settings = await loadSettings();
  const groups = await getDonationsGroupedByCharity({ year });
  const totals = await getTotals({ year });
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  let sections = '';
  for (const g of groups) {
    const sum = g.donations.reduce((s, d) => s + d.valueCents, 0);
    const rows: string[] = [];
    for (const d of [...g.donations].reverse()) rows.push(await donationRow(d));
    const details: string[] = [];
    if (g.charity?.ein) details.push(`EIN ${esc(g.charity.ein)}`);
    if (g.charity?.address) details.push(esc(g.charity.address));
    sections += `
      <h2>${esc(g.name)} <span class="grouptotal">${formatCents(sum)}</span></h2>
      ${details.length ? `<div class="charitymeta">${details.join(' · ')}</div>` : ''}
      <table>${rows.join('')}</table>`;
  }

  const flags: string[] = [];
  if (totals.goodsOver500) {
    flags.push(
      'Noncash donations total more than $500 for the year, so Form 8283 (Section A) is generally required with the return. The donee name/address, date, description, and how the value was determined are on this report.'
    );
  }
  if (totals.anyGoodsOver5000) {
    flags.push(
      'At least one noncash donation is $5,000 or more. Items (or groups of similar items) at that level generally require a qualified appraisal and Form 8283 Section B.'
    );
  }
  const unreceipted = groups.flatMap((g) => g.donations).filter((d) => d.valueCents >= 250_00 && !d.hasReceipt);
  if (unreceipted.length) {
    flags.push(
      `${unreceipted.length} donation${unreceipted.length === 1 ? '' : 's'} of $250 or more ${unreceipted.length === 1 ? 'is' : 'are'} not marked as having a written acknowledgment from the charity. The IRS requires a contemporaneous written acknowledgment for any single contribution of $250 or more.`
    );
  }

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<style>
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #241a1e; margin: 32px; }
  h1 { font-size: 22px; margin: 0 0 2px; }
  .sub { color: #6e5a62; font-size: 12px; margin-bottom: 4px; }
  .who { font-size: 13px; margin-top: 12px; }
  .summary { display: flex; gap: 10px; margin: 14px 0 6px; }
  .box { flex: 1; background: #fbeef2; border: 1px solid #efd3dc; border-radius: 10px; padding: 10px 12px; }
  .box .v { font-size: 17px; font-weight: 700; }
  .box .l { font-size: 11px; color: #6e5a62; margin-top: 1px; }
  h2 { font-size: 15px; border-bottom: 2px solid #b4234b; padding-bottom: 4px; margin: 22px 0 4px; }
  .grouptotal { float: right; color: #b4234b; font-weight: 600; font-size: 13px; }
  .charitymeta { font-size: 11px; color: #6e5a62; margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; }
  td { border-bottom: 1px solid #eadde1; padding: 7px 6px; vertical-align: top; font-size: 12px; }
  td.thumb { width: 56px; }
  td.date { white-space: nowrap; width: 90px; }
  td.kind { width: 60px; color: #6e5a62; }
  td.value { text-align: right; white-space: nowrap; font-weight: 600; width: 90px; }
  .name { font-weight: 600; font-size: 13px; }
  .meta { color: #6e5a62; font-size: 11px; margin-top: 2px; }
  .noimg { width: 52px; height: 52px; border-radius: 6px; background: #f4e8ec; color: #a28f97; font-size: 8px; display: flex; align-items: center; justify-content: center; text-align: center; }
  .flags { margin-top: 22px; border: 1px solid #efd3dc; border-radius: 10px; padding: 12px 14px; font-size: 11.5px; line-height: 1.5; page-break-inside: avoid; }
  .flags b { display: block; margin-bottom: 4px; }
  .flags p { margin: 4px 0; }
  .footer { margin-top: 24px; color: #a28f97; font-size: 10px; text-align: center; line-height: 1.5; }
</style></head>
<body>
  <h1>Charitable Contributions — Tax Year ${year}</h1>
  <div class="sub">Generated ${today} · Given for iPhone · All records kept on-device</div>
  <div class="who">Donor: ${settings.donorName ? `<b>${esc(settings.donorName)}</b>` : '____________________'}</div>
  <div class="summary">
    <div class="box"><div class="v">${formatCents(totals.totalCents)}</div><div class="l">total for ${year}</div></div>
    <div class="box"><div class="v">${formatCents(totals.cashCents)}</div><div class="l">cash gifts</div></div>
    <div class="box"><div class="v">${formatCents(totals.goodsCents)}</div><div class="l">goods at fair-market value</div></div>
    <div class="box"><div class="v">${formatCents(totals.mileageCents)}</div><div class="l">${fmtMiles(totals.miles)} charitable miles @ ${settings.mileageCents}¢</div></div>
  </div>
  ${sections || '<p>No donations recorded for this year.</p>'}
  <div class="flags">
    <b>Notes for your preparer</b>
    ${flags.map((f) => `<p>• ${f}</p>`).join('')}
    <p>• ${totals.receiptCount} of ${totals.count} donation${totals.count === 1 ? '' : 's'} marked as having a receipt or written acknowledgment.</p>
    <p>• Values for donated goods are the donor's fair-market-value estimates (what a thrift store would charge for the item today). Clothing and household items must be in at least good used condition to be deductible.</p>
  </div>
  <div class="footer">This summary is a record-keeping aid, not tax advice. Whether and how much you can deduct depends on your return — confirm with IRS Publication 526 or your preparer.<br/>Keep this PDF with your receipts and acknowledgments.</div>
</body></html>`;
}

export async function generateAndSharePdf(year: number): Promise<void> {
  const html = await buildReportHtml(year);
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Your ${year} donation summary`,
      UTI: 'com.adobe.pdf',
    });
  }
}
