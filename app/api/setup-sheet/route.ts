import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/api-auth'
import { getSheetsClient } from '@/lib/sheets'
import fs from 'fs'
import path from 'path'

const BodySchema = z
  .object({
    existingSpreadsheetId: z
      .string()
      .trim()
      .min(20)
      .max(128)
      .regex(/^[A-Za-z0-9_-]+$/, 'ID spreadsheet mengandung karakter tidak valid'),
  })
  .strict()

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin(req)
    if (auth instanceof NextResponse) return auth

    const parsed = BodySchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'ID Spreadsheet wajib diisi dan harus berupa ID yang valid.' },
        { status: 400 }
      )
    }

    const spreadsheetId = parsed.data.existingSpreadsheetId

    // Verifikasi apakah spreadsheet bisa diakses oleh service account
    const sheets = getSheetsClient()
    const meta = await sheets.spreadsheets.get({ spreadsheetId })

    // Update .env.local — non-fatal: di Vercel filesystem read-only,
    // jangan gagalkan koneksi hanya karena penulisan env gagal.
    let envSaved = false
    try {
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
        envSaved = true
      }
    } catch (envErr: unknown) {
      console.warn('Penulisan .env.local dilewati:', envErr instanceof Error ? envErr.message : envErr)
    }

    process.env.GOOGLE_SHEETS_SPREADSHEET_ID = spreadsheetId

    return NextResponse.json({
      success: true,
      spreadsheetId,
      title: meta.data.properties?.title || 'Spreadsheet',
      url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
      envSaved,
    })
  } catch (error: unknown) {
    console.error('Error connecting spreadsheet:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Gagal memverifikasi spreadsheet. Pastikan bot sudah di-share akses editor!',
      },
      { status: 500 }
    )
  }
}
