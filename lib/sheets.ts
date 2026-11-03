/**
 * Google Sheets API wrapper
 * Semua fungsi ini dijalankan di server (API routes) menggunakan service account
 */

import { google } from 'googleapis'

function getAuthClient() {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: privateKey,
    },
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive',
    ],
  })

  return auth
}

export function getSheetsClient() {
  const auth = getAuthClient()
  return google.sheets({ version: 'v4', auth })
}

export function getDriveClient() {
  const auth = getAuthClient()
  return google.drive({ version: 'v3', auth })
}

/**
 * Buat spreadsheet baru untuk proyek ini
 */
export async function createSpreadsheet(): Promise<string> {
  const sheets = getSheetsClient()

  const response = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: 'Portal Matematika SMP — Data 2026/2027',
      },
      sheets: [
        { properties: { title: 'Siswa', index: 0 } },
        { properties: { title: 'Kehadiran', index: 1 } },
        { properties: { title: 'Nilai', index: 2 } },
      ],
    },
  })

  const spreadsheetId = response.data.spreadsheetId!

  // Set header rows
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'RAW',
      data: [
        {
          range: 'Siswa!A1:D1',
          values: [['NIS', 'Nama', 'Kelas', 'Tanggal Daftar']],
        },
        {
          range: 'Kehadiran!A1:F1',
          values: [['NIS', 'Nama', 'Kelas', 'Tanggal', 'Status', 'Updated At']],
        },
        {
          range: 'Nilai!A1:G1',
          values: [['NIS', 'Nama', 'Kelas', 'Jenis', 'Materi/KD', 'Nilai', 'Tanggal']],
        },
      ],
    },
  })

  return spreadsheetId
}

/**
 * Tambah atau update baris kehadiran di Sheets
 */
export async function upsertKehadiranToSheets(data: {
  nis: string
  nama: string
  kelas: string
  tanggal: string
  status: string
}): Promise<void> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
  if (!spreadsheetId) return

  const sheets = getSheetsClient()
  const timestamp = new Date().toLocaleString('id-ID')

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'Kehadiran!A:F',
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
  if (!spreadsheetId) return

  const sheets = getSheetsClient()

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'Nilai!A:G',
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [[data.nis, data.nama, data.kelas, data.jenis, data.materi, data.nilai, data.tanggal]],
    },
  })
}

