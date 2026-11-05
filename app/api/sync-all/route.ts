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

    // Baca seluruh siswa untuk enrich data NIS jika di kehadiran/nilai belum tersimpan NIS
    const siswaSnap = await adminDb.collection('siswa').get()
    const siswaMap = new Map<string, { nis: string; nama: string; kelas: string }>()
    const siswaByName = new Map<string, { nis: string; nama: string; kelas: string }>()

    siswaSnap.docs.forEach((doc) => {
      const s = doc.data() as Record<string, unknown>
      const info = {
        nis: String(s.nis ?? ''),
        nama: String(s.nama ?? ''),
        kelas: String(s.kelas ?? ''),
      }
      siswaMap.set(doc.id, info)
      if (info.nama) {
        siswaByName.set(`${info.kelas}_${info.nama.toLowerCase()}`, info)
      }
    })

    // Baca seluruh kehadiran
    const kehadiranSnap = await adminDb.collection('kehadiran').get()
    const kehadiranRows = kehadiranSnap.docs.map((d) => {
      const k = d.data() as Record<string, unknown>
      const sById = k.siswaId ? siswaMap.get(String(k.siswaId)) : undefined
      const sByName =
        !sById && k.namaSiswa
          ? siswaByName.get(`${String(k.kelas ?? '')}_${String(k.namaSiswa).toLowerCase()}`)
          : undefined
      const siswa = sById || sByName

      return {
        nis: String(k.nis || siswa?.nis || ''),
        nama: String(k.namaSiswa || siswa?.nama || ''),
        kelas: String(k.kelas || siswa?.kelas || ''),
        tanggal: String(k.tanggal ?? ''),
        status: String(k.status ?? ''),
      }
    })

    // Baca seluruh nilai (diurutkan per tanggal → baris terbaru menang saat upsert)
    const nilaiSnap = await adminDb.collection('nilai').get()
    const nilaiRows = nilaiSnap.docs
      .map((d) => {
        const n = d.data() as Record<string, unknown>
        const sById = n.siswaId ? siswaMap.get(String(n.siswaId)) : undefined
        const sByName =
          !sById && n.namaSiswa
            ? siswaByName.get(`${String(n.kelas ?? '')}_${String(n.namaSiswa).toLowerCase()}`)
            : undefined
        const siswa = sById || sByName

        return {
          nis: String(n.nis || siswa?.nis || ''),
          nama: String(n.namaSiswa || siswa?.nama || ''),
          kelas: String(n.kelas || siswa?.kelas || ''),
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
