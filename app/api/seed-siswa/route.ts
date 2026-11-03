import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { KELAS_LIST, KelasId } from '@/types'

const NAMA_DEPAN = [
  'Ahmad', 'Aditya', 'Aisyah', 'Anisa', 'Bagas', 'Bayu', 'Bunga', 'Citra',
  'Dimas', 'Dina', 'Eko', 'Fajar', 'Farhan', 'Gita', 'Hafiz', 'Indah',
  'Irfan', 'Joko', 'Kurnia', 'Lestari', 'Maulana', 'Nabila', 'Putra', 'Putri',
  'Rafi', 'Rani', 'Rian', 'Rizky', 'Siti', 'Tri', 'Wahyu', 'Zahra'
]

const NAMA_BELAKANG = [
  'Pratama', 'Saputra', 'Wijaya', 'Kusuma', 'Santoso', 'Ramadhan', 'Hidayat',
  'Permana', 'Nugroho', 'Wibowo', 'Setiawan', 'Siregar', 'Lubis', 'Purnomo'
]

export async function POST() {
  try {
    const batch = adminDb.batch()
    const siswaRef = adminDb.collection('siswa')

    const pembagian: Record<KelasId, number> = {
      '7A': 31,
      '7B': 31,
      '8A': 31,
      '8B': 31,
      '9A': 32,
    }

    let nisCounter = 26001

    KELAS_LIST.forEach((kelas) => {
      const count = pembagian[kelas]
      for (let i = 1; i <= count; i++) {
        const docRef = siswaRef.doc()
        const depan = NAMA_DEPAN[Math.floor(Math.random() * NAMA_DEPAN.length)]
        const belakang = NAMA_BELAKANG[Math.floor(Math.random() * NAMA_BELAKANG.length)]
        const nama = `${depan} ${belakang}`

        batch.set(docRef, {
          id: docRef.id,
          nis: nisCounter.toString(),
          nama: nama,
          kelas: kelas,
          createdAt: new Date().toISOString(),
        })

        nisCounter++
      }
    })

    await batch.commit()

    return NextResponse.json({
      success: true,
      message: 'Berhasil membuat 156 siswa di 5 kelas (7A, 7B, 8A, 8B, 9A)!',
    })
  } catch (error: any) {
    console.error('Error seeding siswa:', error)
    return NextResponse.json(
      { error: error.message || 'Gagal menambahkan data siswa' },
      { status: 500 }
    )
  }
}
