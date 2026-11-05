import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/api-auth'
import { adminDb } from '@/lib/firebase-admin'

const BodySchema = z
  .object({
    /** Konfirmasi wajib: hanya dieksekusi jika user sengaja mengirim true */
    confirm: z.literal(true),
    /** Tampilkan pesan penolakan yang lebih jelas jika data sudah ada */
    force: z.boolean().optional(),
  })
  .strict()

const NAMA_DEPAN = [
  'Ahmad', 'Aditya', 'Aisyah', 'Anisa', 'Bagas', 'Bayu', 'Bunga', 'Citra',
  'Dimas', 'Dina', 'Eko', 'Fajar', 'Farhan', 'Gita', 'Hafiz', 'Indah',
  'Irfan', 'Joko', 'Kurnia', 'Lestari', 'Maulana', 'Nabila', 'Putra', 'Putri',
  'Rafi', 'Rani', 'Rizky', 'Siti', 'Tri', 'Wahyu', 'Zahra',
]

const NAMA_BELAKANG = [
  'Pratama', 'Saputra', 'Wijaya', 'Kusuma', 'Santoso', 'Ramadhan', 'Hidayat',
  'Permana', 'Nugroho', 'Wibowo', 'Setiawan', 'Siregar', 'Lubis', 'Purnomo',
]

const KELAS_TARGET = ['7A', '7B', '8A', '8B', '9A'] as const
const SISWA_PER_KELAS = 16 // 5 kelas x 16 = 80 (aman untuk satu batch Firestore: max 500 operasi)
const MAX_NIS_DIGITS = 12

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin(req)
    if (auth instanceof NextResponse) return auth

    const parsed = BodySchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Payload tidak valid: {"confirm": true} wajib dikirim.' },
        { status: 400 }
      )
    }

    // Guard seed ganda: tolak jika collection siswa sudah terisi,
    // kecuali force=true (digunakan saat generate terjadwal/diulang sengaja)
    const existingSample = await adminDb.collection('siswa').limit(1).get()
    if (existingSample.size > 0 && !parsed.data.force) {
      return NextResponse.json(
        {
          error:
            'Data siswa sudah ada. Gunakan force: true jika benar-benar ingin menambah lagi, atau hapus data via dashboard.',
        },
        { status: 409 }
      )
    }

    const batch = adminDb.batch()
    const siswaRef = adminDb.collection('siswa')

    let nisCounter = 26001
    let created = 0

    for (const kelas of KELAS_TARGET) {
      for (let i = 0; i < SISWA_PER_KELAS; i++) {
        const docRef = siswaRef.doc()
        const depan = NAMA_DEPAN[Math.floor(Math.random() * NAMA_DEPAN.length)]
        const belakang = NAMA_BELAKANG[Math.floor(Math.random() * NAMA_BELAKANG.length)]

        batch.set(docRef, {
          id: docRef.id,
          nis: String(nisCounter).padStart(MAX_NIS_DIGITS, '0').slice(-MAX_NIS_DIGITS),
          nama: `${depan} ${belakang}`,
          kelas,
          createdAt: new Date().toISOString(),
        })

        nisCounter++
        created++
      }
    }

    await batch.commit()

    return NextResponse.json({
      success: true,
      created,
      message: `Berhasil membuat ${created} siswa di ${KELAS_TARGET.length} kelas (${KELAS_TARGET.join(', ')}).`,
    })
  } catch (error: unknown) {
    console.error('Error seeding siswa:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Gagal menambahkan data siswa' },
      { status: 500 }
    )
  }
}
