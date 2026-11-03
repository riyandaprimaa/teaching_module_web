import { NextResponse } from 'next/server'
import { createSpreadsheet } from '@/lib/sheets'
import fs from 'fs'
import path from 'path'

export async function POST() {
  try {
    const spreadsheetId = await createSpreadsheet()

    // Update .env.local secara otomatis dengan spreadsheet ID yang baru
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
      url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    })
  } catch (error: any) {
    console.error('Error creating spreadsheet:', error)
    return NextResponse.json(
      { error: error.message || 'Gagal membuat Google Spreadsheet' },
      { status: 500 }
    )
  }
}

