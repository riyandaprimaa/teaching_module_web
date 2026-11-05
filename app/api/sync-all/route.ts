import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/api-auth'
import { adminDb } from '@/lib/firebase-admin'
import { resolveSpreadsheetId, upsertKehadiranToSheets, upsertNilaiToSheets } from '@/lib/sheets'

const BodySchema = z.object({
  /** ID spreadsheet dari klien (disimpan di localStorage) — opsional jika env terkonfigurasi */
  spreadsheetId: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_-]+$/, 'ID spreadsheet tidak valid')
    .optional(),
})

/**
 * Sinkron penuh Firestore → Google Sheets dari sisi server.
 * Membaca seluruh koleksi kehadiran & nilai sekali, lalu melakukan
 * upsert otoritatif: baris Sheets yang tidak lagi ada di Firestore dihapus.
 *
 * Menggantikan pola lama yang mem-fetch ±150 request dari browser.
 */
export async function POST(req: Request) {
  try {
    const auth = await requireAdmin(req)
    if (auth instanceof NextResponse) return auth

    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})))
    const spreadsheetId = resolveSpreadsheetId(parsed.success ? parsed.data.spreadsheetId : undefined)
    if (!spreadsheetId) {
      return NextResponse.json(
        { error: 'Belum ada ID spreadsheet. Hubungkan spreadsheet di dashboard.' },
        { status: 400 }
      )
    }

    // Baca seluruh kehadiran
    const kehadiranSnap = await adminDb.collection('kehadiran').get()
    const kehadiranRows = kehadiranSnap.docs.map((d) => {
      const k = d.data() as Record<string, unknown>
      return {
        nis: String(k.nis ?? ''),
        nama: String(k.namaSiswa ?? ''),
        kelas: String(k.kelas ?? ''),
        tanggal: String(k.tanggal ?? ''),
        status: String(k.status ?? ''),
      }
    })

    // Baca seluruh nilai (diurutkan per tanggal → baris terbaru menang saat upsert)
    const nilaiSnap = await adminDb.collection('nilai').get()
    const nilaiRows = nilaiSnap.docs
      .map((d) => {
        const n = d.data() as Record<string, unknown>
        return {
          nis: String(n.nis ?? ''),
          nama: String(n.namaSiswa ?? ''),
          kelas: String(n.kelas ?? ''),
          jenis: String(n.jenis ?? ''),
          materi: String(n.materi ?? ''),
          nilai: Number(n.nilai ?? 0),
          tanggal: String(n.tanggal ?? ''),
        }
      })
      .sort((a, b) => a.tanggal.localeCompare(b.tanggal))

    const [kehadiranResult, nilaiResult] = await Promise.all([
      upsertKehadiranToSheets(kehadiranRows, spreadsheetId, { authoritative: true }),
      upsertNilaiToSheets(nilaiRows, spreadsheetId, { authoritative: true }),
    ])

    return NextResponse.json({
      success: true,
      kehadiran: { terkirim: kehadiranRows.length, ...kehadiranResult },
      nilai: { terkirim: nilaiRows.length, ...nilaiResult },
    })
  } catch (err: unknown) {
    console.error('Error sync-all ke Sheets:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Kesalahan server' },
      { status: 500 }
    )
  }
}
