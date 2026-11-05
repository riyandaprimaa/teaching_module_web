/**
 * Google Sheets API wrapper
 * Menggunakan JWT Authentication langsung dengan Service Account Key
 *
 * Strategi sinkronisasi: UPSERT berbasis kunci (bukan append buta).
 *  - Kehadiran: kunci = NIS + Tanggal
 *  - Nilai:     kunci = NIS + Kelas + Jenis + Materi
 * Baris dengan kunci yang sama di-update in-place sehingga Sheets
 * selalu mencerminkan data terbaru tanpa duplikat. Sinkron penuh
 * (authoritative) juga menghapus baris orphan di Sheets.
 */

import { google, sheets_v4 } from 'googleapis'

type Sheets = sheets_v4.Sheets
type SheetRow = unknown[]

function getAuthClient() {
  let privateKey = process.env.GOOGLE_PRIVATE_KEY || ''
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1)
  }
  privateKey = privateKey.replace(/\\n/g, '\n')

  return new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive',
    ],
  })
}

export function getSheetsClient() {
  const auth = getAuthClient()
  return google.sheets({ version: 'v4', auth })
}

/**
 * Tentukan spreadsheetId yang dipakai untuk sync.
 * Prioritas: ID dari klien (localStorage) → fallback env server.
 * Mengembalikan null bila keduanya kosong.
 */
export function resolveSpreadsheetId(clientId?: string): string | null {
  const clean = (clientId || '').trim()
  if (clean) return clean
  const fromEnv = (process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '').trim()
  return fromEnv || null
}

/**
 * Pastikan tab sheet tujuan ada dan memiliki header kolom
 */
async function ensureSheetTab(
  sheets: Sheets,
  spreadsheetId: string,
  tabName: string,
  headers: string[]
) {
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId })
    const sheetTitles = (meta.data.sheets || []).map((s) => s.properties?.title ?? '')

    if (!sheetTitles.includes(tabName)) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{ addSheet: { properties: { title: tabName } } }],
        },
      })

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${tabName}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: [headers] },
      })
    }
  } catch (err: unknown) {
    console.warn(`Peringatan pengecekan tab ${tabName}:`, err instanceof Error ? err.message : err)
  }
}

async function getSheetIdByName(
  sheets: Sheets,
  spreadsheetId: string,
  tabName: string
): Promise<number> {
  const meta = await sheets.spreadsheets.get({ spreadsheetId })
  const sheet = (meta.data.sheets || []).find((s) => s.properties?.title === tabName)
  return sheet?.properties?.sheetId ?? 0
}

type TabSchema = {
  tab: string
  headers: string[]
  /** fungsi membuat kunci unik dari POST data */
  keyOf: (row: string[]) => string
}

const KEHADIRAN_SCHEMA: TabSchema = {
  tab: 'Kehadiran',
  headers: ['NIS', 'Nama', 'Kelas', 'Tanggal', 'Status', 'Timestamp'],
  // Kunci unik: Kelas + Tanggal + Siswa (NIS jika terisi, atau Nama case-insensitive sebagai fallback)
  keyOf: (cols) => {
    const nis = (cols[0] || '').trim()
    const nama = (cols[1] || '').trim().toLowerCase()
    const kelas = (cols[2] || '').trim().toUpperCase()
    const tanggal = (cols[3] || '').trim()
    const studentId = nis || `nama:${nama}`
    return `${kelas}|${tanggal}|${studentId}`
  },
}

const NILAI_SCHEMA: TabSchema = {
  tab: 'Nilai',
  headers: ['NIS', 'Nama', 'Kelas', 'Jenis', 'Materi/KD', 'Nilai', 'Tanggal'],
  // Kunci unik: Kelas + Jenis + Materi + Siswa (NIS jika terisi, atau Nama case-insensitive sebagai fallback)
  keyOf: (cols) => {
    const nis = (cols[0] || '').trim()
    const nama = (cols[1] || '').trim().toLowerCase()
    const kelas = (cols[2] || '').trim().toUpperCase()
    const jenis = (cols[3] || '').trim().toUpperCase()
    const materi = (cols[4] || '').trim().toLowerCase()
    const studentId = nis || `nama:${nama}`
    return `${kelas}|${jenis}|${materi}|${studentId}`
  },
}

interface KehadiranRow {
  nis: string
  nama: string
  kelas: string
  tanggal: string // YYYY-MM-DD
  status: string
}

interface NilaiRow {
  nis: string
  nama: string
  kelas: string
  jenis: string
  materi: string
  nilai: number
  tanggal: string
}

function rowToStrings(values: SheetRow): string[] {
  return values.map((v) => (v === null || v === undefined ? '' : v.toString()))
}

/**
 * Baca tab dan buat peta kunci → nomor baris Sheets (1-based).
 * Baris yang seluruh kolomnya kosong diabaikan.
 */
async function buildRowMap(
  sheets: Sheets,
  spreadsheetId: string,
  schema: TabSchema,
  totalCols: number
): Promise<Map<string, number>> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${schema.tab}!A1:${String.fromCharCode(64 + totalCols)}`,
  })

  const rows: SheetRow[] = res.data.values || []
  const map = new Map<string, number>()

  for (let i = 1; i < rows.length; i++) {
    const cols = rowToStrings(rows[i])
    if (cols.every((c) => c === '')) continue
    map.set(schema.keyOf(cols), i + 1)
  }

  return map
}

/** Lingkup baris yang boleh dianggap orphan saat upsert parsial */
interface UpsertScope {
  /** true = baris Sheets ini berada dalam lingkup data yang dikirim */
  inScope: (cols: string[]) => boolean
}

/**
 * UPSERT batch kehadiran ke Sheets.
 * Kunci: NIS|Tanggal — baris yang sama di-update in-place, baru di-append.
 *
 *  - options.authoritative = true  → seluruh baris Sheets dianggap dalam kendali data
 *    ini (sinkron penuh dari Firestore); baris yang hilang dari data dihapus.
 *  - false (default) → hanya jika batch seragam (satu kelas + satu tanggal)
 *    pembersihan aktif dalam lingkup itu; batch campuran tidak menyentuh baris lain.
 */
export async function upsertKehadiranToSheets(
  data: KehadiranRow[],
  spreadsheetId: string,
  options: { authoritative?: boolean } = {}
): Promise<{ updated: number; inserted: number }> {
  if (!spreadsheetId) {
    console.warn('Sync batal: spreadsheetId tidak disediakan.')
    return { updated: 0, inserted: 0 }
  }
  if (data.length === 0) return { updated: 0, inserted: 0 }

  const sheets = getSheetsClient()
  const scope = resolveKehadiranScope(data, options.authoritative === true)

  return await upsertBatch(sheets, spreadsheetId, KEHADIRAN_SCHEMA, scope, (dedupe) => {
    const timestamp = new Date().toLocaleString('id-ID')
    for (const item of data) {
      if (!item.nis && !item.nama) continue
      const statusLabel =
        item.status.charAt(0).toUpperCase() + item.status.slice(1).toLowerCase()
      dedupe(
        KEHADIRAN_SCHEMA.keyOf([item.nis, item.nama, item.kelas, item.tanggal]),
        [item.nis, item.nama, item.kelas, item.tanggal, statusLabel, timestamp]
      )
    }
  })
}

/**
 * UPSERT batch nilai ke Sheets.
 * Kunci: NIS|Kelas|Jenis|Materi — semantik otoritas sama dengan kehadiran
 * (lingkup seragam = kelas + jenis + materi yang sama).
 */
export async function upsertNilaiToSheets(
  data: NilaiRow[],
  spreadsheetId: string,
  options: { authoritative?: boolean } = {}
): Promise<{ updated: number; inserted: number }> {
  if (!spreadsheetId) {
    console.warn('Sync batal: spreadsheetId tidak disediakan.')
    return { updated: 0, inserted: 0 }
  }
  if (data.length === 0) return { updated: 0, inserted: 0 }

  const sheets = getSheetsClient()
  const scope = resolveNilaiScope(data, options.authoritative === true)

  return await upsertBatch(sheets, spreadsheetId, NILAI_SCHEMA, scope, (dedupe) => {
    for (const item of data) {
      if (!item.nis && !item.nama) continue
      dedupe(
        NILAI_SCHEMA.keyOf([item.nis, item.nama, item.kelas, item.jenis, item.materi]),
        [item.nis, item.nama, item.kelas, item.jenis, item.materi, item.nilai, item.tanggal]
      )
    }
  })
}

/**
 * Tentukan lingkup pembersihan orphan:
 *  - authoritative → seluruh baris Sheets dalam lingkup data ini (sinkron penuh)
 *  - batch seragam (satu kelas+tggl / satu kelas+jenis+materi) → lingkup itu
 *  - campuran → undefined (tanpa pembersihan, aman bagi data lain)
 */
function resolveKehadiranScope(data: KehadiranRow[], authoritative: boolean): UpsertScope | undefined {
  if (authoritative) return { inScope: () => true }

  const kelasSet = new Set(data.map((d) => d.kelas))
  const tanggalSet = new Set(data.map((d) => d.tanggal))
  if (kelasSet.size !== 1 || tanggalSet.size !== 1) return undefined

  const kelas = [...kelasSet][0]
  const tanggal = [...tanggalSet][0]
  return {
    inScope: (cols) => (cols[2] || '').trim() === kelas && (cols[3] || '').trim() === tanggal,
  }
}

function resolveNilaiScope(data: NilaiRow[], authoritative: boolean): UpsertScope | undefined {
  if (authoritative) return { inScope: () => true }

  const kelasSet = new Set(data.map((d) => d.kelas))
  const jenisSet = new Set(data.map((d) => d.jenis))
  const materiSet = new Set(data.map((d) => d.materi))
  if (kelasSet.size !== 1 || jenisSet.size !== 1 || materiSet.size !== 1) return undefined

  const kelas = [...kelasSet][0]
  const jenis = [...jenisSet][0]
  const materi = [...materiSet][0]
  return {
    inScope: (cols) =>
      (cols[2] || '').trim() === kelas &&
      (cols[3] || '').trim() === jenis &&
      (cols[4] || '').trim() === materi,
  }
}

/**
 * Inti upsert:
 *  1. Deduplikasi data batch (kunci sama → data terakhir menang)
 *  2. Hapus baris orphan di Sheets (tidak ada lagi di data terkirim)
 *  3. Read peta kunci → baris
 *  4. update in-place untuk kunci existing, append untuk kunci baru (1 request append gabungan)
 */
async function upsertBatch(
  sheets: Sheets,
  spreadsheetId: string,
  schema: TabSchema,
  scope: UpsertScope | undefined,
  fill: (dedupe: (key: string, values: unknown[]) => void) => void
): Promise<{ updated: number; inserted: number }> {
  const totalCols = schema.headers.length

  await ensureSheetTab(sheets, spreadsheetId, schema.tab, schema.headers)

  // 1. Deduplikasi
  const keyed = new Map<string, unknown[]>()
  fill((key, values) => {
    keyed.set(key, values)
  })

  if (keyed.size === 0) return { updated: 0, inserted: 0 }

  // 2. Hapus baris orphan (hanya bila lingkup disediakan)
  if (scope) {
    await clearOrphanRows(sheets, spreadsheetId, schema, scope, keyed)
  }

  // 3. Peta kunci → nomor baris
  const rowMap = await buildRowMap(sheets, spreadsheetId, schema, totalCols)

  const valuesToUpdate: { row: number; values: unknown[] }[] = []
  const rowsToAppend: unknown[][] = []

  for (const [key, values] of keyed) {
    const existingRow = rowMap.get(key)
    if (existingRow) {
      valuesToUpdate.push({ row: existingRow, values })
    } else {
      rowsToAppend.push(values)
    }
  }

  // 4. Tulis: batchUpdate in-place + append (dua request untuk seluruh batch)
  if (valuesToUpdate.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'RAW',
        data: valuesToUpdate.map((u) => ({
          range: `${schema.tab}!A${u.row}`,
          values: [u.values],
        })),
      },
    })
  }

  if (rowsToAppend.length > 0) {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${schema.tab}!A1`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: rowsToAppend },
    })
  }

  return { updated: valuesToUpdate.length, inserted: rowsToAppend.length }
}

/**
 * Hapus baris di Sheets yang kuncinya tidak ada lagi pada data Firestore terkini.
 * Hanya baris DI DALAM LINGKUP (scope) yang dipertimbangkan, sehingga
 * sinkron parsial (satu kelas / satu tanggal) tidak menyentuh data lain.
 */
async function clearOrphanRows(
  sheets: Sheets,
  spreadsheetId: string,
  schema: TabSchema,
  scope: UpsertScope,
  keyed: Map<string, unknown[]>
): Promise<void> {
  try {
    const totalCols = schema.headers.length
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${schema.tab}!A1:${String.fromCharCode(64 + totalCols)}`,
    })

    const rows: SheetRow[] = res.data.values || []
    const orphanRows: number[] = []

    for (let i = 1; i < rows.length; i++) {
      const cols = rowToStrings(rows[i])
      if (cols.every((c) => c === '')) continue
      if (!scope.inScope(cols)) continue
      const key = schema.keyOf(cols)
      if (key && !keyed.has(key)) orphanRows.push(i + 1)
    }

    if (orphanRows.length === 0) return

    // Hapus dari baris terbawah agar nomor baris di atasnya tidak bergeser
    orphanRows.sort((a, b) => b - a)
    const sheetId = await getSheetIdByName(sheets, spreadsheetId, schema.tab)

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: orphanRows.map((row) => ({
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: row - 1,
              endIndex: row,
            },
          },
        })),
      },
    })
  } catch (err: unknown) {
    console.warn(
      `Peringatan pembersihan baris orphan ${schema.tab}:`,
      err instanceof Error ? err.message : err
    )
  }
}
