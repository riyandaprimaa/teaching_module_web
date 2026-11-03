import { NextResponse } from 'next/server'
import { createSpreadsheet, shareSpreadsheetWithTeacher } from '@/lib/sheets'
import fs from 'fs'
import path from 'path'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { teacherEmail, existingSpreadsheetId, forceCreate } = body

    let spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID

    // Jika user menginput ID Spreadsheet yang sudah ada
    if (existingSpreadsheetId) {
      spreadsheetId = existingSpreadsheetId.trim()
    } else if (!spreadsheetId || forceCreate) {
      // Buat baru jika belum ada atau dipaksa buat baru
      spreadsheetId = await createSpreadsheet(teacherEmail)
    } else {
      // Jika sudah ada, pastikan email guru punya akses
      if (teacherEmail) {
        await shareSpreadsheetWithTeacher(spreadsheetId, teacherEmail)
      }
    }

    // Update .env.local secara otomatis
    const envPath = path.join(process.cwd(), '.env.local')
    if (fs.existsSync(envPath) && spreadsheetId) {
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
    console.error('Error handling spreadsheet setup:', error)
    return NextResponse.json(
      { error: error.message || 'Gagal memproses spreadsheet' },
      { status: 500 }
    )
  }
}
