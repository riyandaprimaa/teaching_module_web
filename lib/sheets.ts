/**
 * Google Sheets API wrapper
 * Menggunakan JWT Authentication langsung dengan Service Account Key
 */

import { google } from 'googleapis'

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
 * Pastikan tab sheet tujuan ada dan memiliki header kolom
 */
async function ensureSheetTab(sheets: any, spreadsheetId: string, tabName: string, headers: string[]) {
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId })
    const sheetTitles = (meta.data.sheets || []).map((s: any) => s.properties.title)

    if (!sheetTitles.includes(tabName)) {
      // Buat tab baru jika belum ada
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: { title: tabName },
              },
            },
          ],
        },
      })

      // Isi baris header
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${tabName}!A1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [headers],
        },
      })
    }
  } catch (err: any) {
    console.warn(`Peringatan pengecekan tab ${tabName}:`, err.message)
  }
}

/**
 * Tambah baris kehadiran ke Sheets
 */
export async function upsertKehadiranToSheets(data: {
  nis: string
  nama: string
  kelas: string
  tanggal: string
  status: string
}): Promise<void> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
  if (!spreadsheetId) {
    console.warn('Sync batal: GOOGLE_SHEETS_SPREADSHEET_ID belum terkonfigurasi.')
    return
  }

  const sheets = getSheetsClient()
  const tabName = 'Kehadiran'

  // Pastikan tab Kehadiran ada di sheet user
  await ensureSheetTab(sheets, spreadsheetId, tabName, ['NIS', 'Nama', 'Kelas', 'Tanggal', 'Status', 'Timestamp'])

  const timestamp = new Date().toLocaleString('id-ID')

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${tabName}!A:F`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [[data.nis, data.nama, data.kelas, data.tanggal, data.status, timestamp]],
    },
  })
}

/**
 * Tambah baris nilai ke Sheets
 */
export async function appendNilaiToSheets(data: {
  nis: string
  nama: string
  kelas: string
  jenis: string
  materi: string
  nilai: number
  tanggal: string
}): Promise<void> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
  if (!spreadsheetId) {
    console.warn('Sync batal: GOOGLE_SHEETS_SPREADSHEET_ID belum terkonfigurasi.')
    return
  }

  const sheets = getSheetsClient()
  const tabName = 'Nilai'

  // Pastikan tab Nilai ada di sheet user
  await ensureSheetTab(sheets, spreadsheetId, tabName, ['NIS', 'Nama', 'Kelas', 'Jenis', 'Materi/KD', 'Nilai', 'Tanggal'])

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${tabName}!A:G`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [[data.nis, data.nama, data.kelas, data.jenis, data.materi, data.nilai, data.tanggal]],
    },
  })
}
