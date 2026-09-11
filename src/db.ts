import * as SQLite from 'expo-sqlite';

export type DonationKind = 'cash' | 'goods' | 'mileage';

export const KIND_LABEL: Record<DonationKind, string> = {
  cash: 'Cash',
  goods: 'Goods',
  mileage: 'Mileage',
};

/**
 * Charitable mileage rate in cents per mile. Set by statute at 14 cents
 * (26 U.S.C. §170(i)) and unchanged for decades; editable in Settings in
 * case it ever changes.
 */
export const DEFAULT_MILEAGE_CENTS = 14;

export interface Charity {
  id: number;
  name: string;
  /** Optional EIN / tax ID as printed on the receipt. */
  ein: string;
  /** Optional mailing address (Form 8283 asks for the donee's address). */
  address: string;
  createdAt: number;
}

export interface Donation {
  id: number;
  charityId: number | null;
  charityName: string | null;
  /** YYYY-MM-DD (local). */
  date: string;
  kind: DonationKind;
  /** Cash amount, or total fair-market value of the goods, in cents. For mileage: computed value. */
  valueCents: number;
  /** Miles driven (mileage donations only). */
  miles: number;
  /** What was given ("3 bags of clothes, coffee table"). */
  description: string;
  /** Item condition for goods (IRS: must be at least "good used condition" for clothing/household). */
  condition: string;
  /** How the fair-market value was arrived at ("thrift-shop value", "comparable sales"). */
  method: string;
  /** Written acknowledgment / receipt in hand. */
  hasReceipt: boolean;
  notes: string;
  createdAt: number;
  updatedAt: number;
  photoCount: number;
  coverPath: string | null;
}

export interface Photo {
  id: number;
  donationId: number;
  path: string;
  createdAt: number;
}

export const CONDITION_OPTIONS = ['Good', 'Very good', 'Excellent', 'New'] as const;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('given.db');
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;
        CREATE TABLE IF NOT EXISTS charities (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE COLLATE NOCASE,
          ein TEXT NOT NULL DEFAULT '',
          address TEXT NOT NULL DEFAULT '',
          created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS donations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          charity_id INTEGER REFERENCES charities(id) ON DELETE SET NULL,
          date TEXT NOT NULL,
          kind TEXT NOT NULL DEFAULT 'cash',
          value_cents INTEGER NOT NULL DEFAULT 0,
          miles REAL NOT NULL DEFAULT 0,
          description TEXT NOT NULL DEFAULT '',
          condition TEXT NOT NULL DEFAULT '',
          method TEXT NOT NULL DEFAULT '',
          has_receipt INTEGER NOT NULL DEFAULT 0,
          notes TEXT NOT NULL DEFAULT '',
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS photos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          donation_id INTEGER NOT NULL REFERENCES donations(id) ON DELETE CASCADE,
          path TEXT NOT NULL,
          created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_donations_date ON donations(date);
        CREATE INDEX IF NOT EXISTS idx_donations_charity ON donations(charity_id);
        CREATE INDEX IF NOT EXISTS idx_photos_donation ON photos(donation_id);
      `);
      return db;
    })();
  }
  return dbPromise;
}

const DONATION_SELECT = `
  SELECT d.*, c.name AS charity_name,
    (SELECT COUNT(*) FROM photos p WHERE p.donation_id = d.id) AS photo_count,
    (SELECT p.path FROM photos p WHERE p.donation_id = d.id ORDER BY p.id ASC LIMIT 1) AS cover_path
  FROM donations d LEFT JOIN charities c ON c.id = d.charity_id
`;

function rowToDonation(row: any): Donation {
  return {
    id: row.id,
    charityId: row.charity_id ?? null,
    charityName: row.charity_name ?? null,
    date: row.date,
    kind: (row.kind ?? 'cash') as DonationKind,
    valueCents: row.value_cents ?? 0,
    miles: row.miles ?? 0,
    description: row.description ?? '',
    condition: row.condition ?? '',
    method: row.method ?? '',
    hasReceipt: !!row.has_receipt,
    notes: row.notes ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    photoCount: row.photo_count ?? 0,
    coverPath: row.cover_path ?? null,
  };
}

// ---------- charities ----------

function rowToCharity(r: any): Charity {
  return { id: r.id, name: r.name, ein: r.ein ?? '', address: r.address ?? '', createdAt: r.created_at };
}

export async function getCharities(): Promise<Charity[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM charities ORDER BY name COLLATE NOCASE');
  return rows.map(rowToCharity);
}

export async function addCharity(name: string): Promise<Charity | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const db = await getDb();
  await db.runAsync('INSERT OR IGNORE INTO charities (name, created_at) VALUES (?, ?)', [trimmed, Date.now()]);
  const row = await db.getFirstAsync<any>('SELECT * FROM charities WHERE name = ? COLLATE NOCASE', [trimmed]);
  if (!row) throw new Error('The charity could not be saved.');
  return rowToCharity(row);
}

export async function updateCharity(id: number, name: string, ein: string, address: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE charities SET name = ?, ein = ?, address = ? WHERE id = ?', [
    name.trim(),
    ein.trim(),
    address.trim(),
    id,
  ]);
}

/** Removes the charity; its donations stay (unassigned). */
export async function deleteCharity(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM charities WHERE id = ?', [id]);
}

// ---------- donations ----------

export interface DonationInput {
  charityId: number | null;
  date: string;
  kind: DonationKind;
  valueCents: number;
  miles: number;
  description: string;
  condition: string;
  method: string;
  hasReceipt: boolean;
  notes: string;
}

function clean(i: DonationInput): DonationInput {
  return {
    ...i,
    valueCents: Math.max(0, Math.round(i.valueCents)),
    miles: Math.max(0, Math.round(i.miles * 10) / 10),
    description: i.description.trim(),
    condition: i.condition.trim(),
    method: i.method.trim(),
    notes: i.notes.trim(),
  };
}

export async function insertDonation(input: DonationInput): Promise<number> {
  const db = await getDb();
  const now = Date.now();
  const i = clean(input);
  const res = await db.runAsync(
    `INSERT INTO donations
       (charity_id, date, kind, value_cents, miles, description, condition, method, has_receipt, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [i.charityId, i.date, i.kind, i.valueCents, i.miles, i.description, i.condition, i.method, i.hasReceipt ? 1 : 0, i.notes, now, now]
  );
  // Verify-or-throw: the row must be readable before we report success.
  const check = await db.getFirstAsync<any>('SELECT id FROM donations WHERE id = ?', [res.lastInsertRowId]);
  if (!check) throw new Error('The donation could not be saved.');
  return res.lastInsertRowId;
}

export async function updateDonation(id: number, input: DonationInput): Promise<void> {
  const db = await getDb();
  const i = clean(input);
  await db.runAsync(
    `UPDATE donations SET charity_id = ?, date = ?, kind = ?, value_cents = ?, miles = ?, description = ?,
       condition = ?, method = ?, has_receipt = ?, notes = ?, updated_at = ?
     WHERE id = ?`,
    [i.charityId, i.date, i.kind, i.valueCents, i.miles, i.description, i.condition, i.method, i.hasReceipt ? 1 : 0, i.notes, Date.now(), id]
  );
}

/** Returns paths of this donation's photos so the caller can delete the files. */
export async function deleteDonation(id: number): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT path FROM photos WHERE donation_id = ?', [id]);
  await db.runAsync('DELETE FROM donations WHERE id = ?', [id]);
  return rows.map((r) => r.path);
}

export async function getDonation(id: number): Promise<Donation | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>(`${DONATION_SELECT} WHERE d.id = ?`, [id]);
  return row ? rowToDonation(row) : null;
}

export interface DonationFilter {
  /** Tax year, e.g. 2026. */
  year?: number;
  charityId?: number | null;
  query?: string;
}

function whereFor(f: DonationFilter | undefined): { sql: string; params: any[] } {
  const where: string[] = [];
  const params: any[] = [];
  if (f?.year) {
    where.push('d.date >= ? AND d.date <= ?');
    params.push(`${f.year}-01-01`, `${f.year}-12-31`);
  }
  if (f && f.charityId !== undefined) {
    if (f.charityId === null) {
      where.push('d.charity_id IS NULL');
    } else {
      where.push('d.charity_id = ?');
      params.push(f.charityId);
    }
  }
  if (f?.query) {
    const escaped = f.query.replace(/([%_\\])/g, '\\$1');
    where.push(`(d.description LIKE ? ESCAPE '\\' OR d.notes LIKE ? ESCAPE '\\' OR c.name LIKE ? ESCAPE '\\')`);
    const like = `%${escaped}%`;
    params.push(like, like, like);
  }
  return { sql: where.length ? ' WHERE ' + where.join(' AND ') : '', params };
}

export async function getDonations(filter?: DonationFilter): Promise<Donation[]> {
  const db = await getDb();
  const w = whereFor(filter);
  const rows = await db.getAllAsync<any>(
    `${DONATION_SELECT}${w.sql} ORDER BY d.date DESC, d.id DESC LIMIT 2000`,
    w.params
  );
  return rows.map(rowToDonation);
}

export async function countDonations(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>('SELECT COUNT(*) AS n FROM donations');
  return row?.n ?? 0;
}

/** Years that have at least one donation, newest first. */
export async function getYears(): Promise<number[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    'SELECT DISTINCT substr(date, 1, 4) AS y FROM donations ORDER BY y DESC'
  );
  return rows.map((r) => Number(r.y)).filter((n) => isFinite(n));
}

export interface Totals {
  count: number;
  totalCents: number;
  cashCents: number;
  goodsCents: number;
  mileageCents: number;
  miles: number;
  charityCount: number;
  photoCount: number;
  receiptCount: number;
  /** Donations of $250+ not yet marked as having a written acknowledgment. */
  unreceiptedOver250: number;
  /** Goods donations valued over $500 total trigger Form 8283 Section A. */
  goodsOver500: boolean;
  /** Any single goods donation (or similar-item group) at $5,000+ needs a qualified appraisal. */
  anyGoodsOver5000: boolean;
}

export async function getTotals(filter?: DonationFilter): Promise<Totals> {
  const db = await getDb();
  const w = whereFor(filter);
  const row = await db.getFirstAsync<any>(
    `SELECT COUNT(*) AS n,
       COALESCE(SUM(d.value_cents), 0) AS total,
       COALESCE(SUM(CASE WHEN d.kind = 'cash' THEN d.value_cents ELSE 0 END), 0) AS cash,
       COALESCE(SUM(CASE WHEN d.kind = 'goods' THEN d.value_cents ELSE 0 END), 0) AS goods,
       COALESCE(SUM(CASE WHEN d.kind = 'mileage' THEN d.value_cents ELSE 0 END), 0) AS mileage,
       COALESCE(SUM(CASE WHEN d.kind = 'mileage' THEN d.miles ELSE 0 END), 0) AS miles,
       COUNT(DISTINCT d.charity_id) AS charities,
       COALESCE(SUM(d.has_receipt), 0) AS receipts,
       COALESCE(SUM(CASE WHEN d.value_cents >= 25000 AND d.has_receipt = 0 THEN 1 ELSE 0 END), 0) AS unreceipted_250,
       COALESCE(MAX(CASE WHEN d.kind = 'goods' THEN d.value_cents ELSE 0 END), 0) AS max_goods
     FROM donations d LEFT JOIN charities c ON c.id = d.charity_id${w.sql}`,
    w.params
  );
  const p = await db.getFirstAsync<any>(
    `SELECT COUNT(*) AS n FROM photos p WHERE p.donation_id IN (SELECT d.id FROM donations d LEFT JOIN charities c ON c.id = d.charity_id${w.sql})`,
    w.params
  );
  const goods = row?.goods ?? 0;
  return {
    count: row?.n ?? 0,
    totalCents: row?.total ?? 0,
    cashCents: row?.cash ?? 0,
    goodsCents: goods,
    mileageCents: row?.mileage ?? 0,
    miles: row?.miles ?? 0,
    charityCount: row?.charities ?? 0,
    photoCount: p?.n ?? 0,
    receiptCount: row?.receipts ?? 0,
    unreceiptedOver250: row?.unreceipted_250 ?? 0,
    goodsOver500: goods > 500_00,
    anyGoodsOver5000: (row?.max_goods ?? 0) >= 5000_00,
  };
}

// ---------- photos ----------

export async function addPhoto(donationId: number, path: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('INSERT INTO photos (donation_id, path, created_at) VALUES (?, ?, ?)', [
    donationId,
    path,
    Date.now(),
  ]);
}

export async function getPhotos(donationId: number): Promise<Photo[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM photos WHERE donation_id = ? ORDER BY id ASC', [donationId]);
  return rows.map((r) => ({ id: r.id, donationId: r.donation_id, path: r.path, createdAt: r.created_at }));
}

export async function deletePhoto(id: number): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>('SELECT path FROM photos WHERE id = ?', [id]);
  await db.runAsync('DELETE FROM photos WHERE id = ?', [id]);
  return row?.path ?? null;
}

/** Donations grouped by charity for the year-end report. */
export async function getDonationsGroupedByCharity(
  filter?: DonationFilter
): Promise<{ charity: Charity | null; name: string; donations: Donation[] }[]> {
  const donations = await getDonations(filter);
  const charities = await getCharities();
  const byId = new Map(charities.map((c) => [c.id, c]));
  const groups = new Map<string, { charity: Charity | null; name: string; donations: Donation[] }>();
  for (const d of donations) {
    const key = d.charityName ?? 'Unassigned';
    if (!groups.has(key)) {
      groups.set(key, { charity: d.charityId ? byId.get(d.charityId) ?? null : null, name: key, donations: [] });
    }
    groups.get(key)!.donations.push(d);
  }
  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function deleteAllData(): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT path FROM photos');
  await db.execAsync('DELETE FROM photos; DELETE FROM donations; DELETE FROM charities;');
  return rows.map((r) => r.path);
}

/** CSV export (RFC-4180), oldest first. */
export async function exportCsv(filter?: DonationFilter): Promise<string> {
  const donations = await getDonations(filter);
  const q = (s: string) => '"' + s.replace(/"/g, '""') + '"';
  const lines = ['date,charity,type,value_usd,miles,description,condition,valuation_method,receipt,notes,photo_count'];
  for (const d of [...donations].reverse()) {
    lines.push(
      [
        d.date,
        q(d.charityName ?? ''),
        d.kind,
        (d.valueCents / 100).toFixed(2),
        d.kind === 'mileage' ? String(d.miles) : '',
        q(d.description),
        q(d.condition),
        q(d.method),
        d.hasReceipt ? 'yes' : 'no',
        q(d.notes),
        String(d.photoCount),
      ].join(',')
    );
  }
  return lines.join('\r\n');
}
