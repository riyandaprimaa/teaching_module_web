import { NextResponse } from 'next/server'
import { appendNilaiToSheets } from '@/lib/sheets'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { nis, nama, kelas, jenis, materi, nilai, tanggal } = body

    await appendNilaiToSheets({
      nis,
      nama,
      kelas,
      jenis,
      materi,
      nilai,
      tanggal,
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Error syncing nilai to Sheets:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

