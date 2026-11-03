import { NextResponse } from 'next/server'
import { getSheetsClient } from '@/lib/sheets'
import fs from 'fs'
import path from 'path'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { existingSpreadsheetId } = body

    if (!existingSpreadsheetId) {
      return NextResponse.json(
        { error: 'ID Spreadsheet wajib diisi' },
        { status: 400 }
      )
    }

    const spreadsheetId = existingSpreadsheetId.trim()

    // Verifikasi apakah spreadsheet bisa diakses oleh bot
    const sheets = getSheetsClient()
    const meta = await sheets.spreadsheets.get({ spreadsheetId })

    // Update .env.local
    const envPath = path.join(process.cwd(), '.env.local')
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf8')
      if (envContent.includes('GOOGLE_SHEETS_SPREADSHEET_ID=')) {
        envContent = envContent.replace(
          /GOOGLE_SHEETS_SPREADSHEET_ID=.*/,
          `GOOGLE_SHEETS_SPREADSHEET_ID=${spreadsheetId}`
        )
      } else {
        envContent += `\nGOOGLE_SHEETS_SPREADSHEET_ID=${spreadsheetId}\n`
      }
      fs.writeFileSync(envPath, envContent, 'utf8')
    }

    process.env.GOOGLE_SHEETS_SPREADSHEET_ID = spreadsheetId

    return NextResponse.json({
      success: true,
      spreadsheetId,
      title: meta.data.properties?.title || 'Spreadsheet',
      url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    })
  } catch (error: any) {
    console.error('Error connecting spreadsheet:', error)
    return NextResponse.json(
      { error: error.message || 'Gagal memverifikasi spreadsheet. Pastikan bot sudah di-share akses editor!' },
      { status: 500 }
    )
  }
}
