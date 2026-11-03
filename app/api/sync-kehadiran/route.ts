import { NextResponse } from 'next/server'
import { upsertKehadiranToSheets } from '@/lib/sheets'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { nis, nama, kelas, tanggal, status } = body

    await upsertKehadiranToSheets({
      nis,
      nama,
      kelas,
      tanggal,
      status,
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Error syncing kehadiran to Sheets:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

