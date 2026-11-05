export type KelasId =
  | '7A' | '7B' | '7C' | '7D' | '7E' | '7F' | '7G' | '7H'
  | '8A' | '8B' | '8C' | '8D' | '8E' | '8F' | '8G' | '8H'
  | '9A' | '9B' | '9C' | '9D' | '9E' | '9F' | '9G' | '9H'

export type StatusKehadiran = 'hadir' | 'izin' | 'sakit' | 'alfa'

export type JenisPenilaian = 'UH' | 'UTS' | 'UAS' | 'Tugas'

export interface Siswa {
  id: string
  nis: string
  nama: string
  kelas: KelasId
  createdAt: string
}

export interface Kehadiran {
  id: string
  siswaId: string
  namaSiswa: string
  kelas: KelasId
  tanggal: string // format: YYYY-MM-DD
  status: StatusKehadiran
  updatedAt: string
}

export interface RekapKehadiran {
  siswaId: string
  nis: string
  namaSiswa: string
  kelas: KelasId
  hadir: number
  izin: number
  sakit: number
  alfa: number
  total: number
}

export interface Nilai {
  id: string
  siswaId: string
  namaSiswa: string
  nis: string
  kelas: KelasId
  jenis: JenisPenilaian
  materi: string
  nilai: number
  tanggal: string
  createdAt: string
}

export interface Jurnal {
  id: string
  tanggal: string // format: YYYY-MM-DD
  kelas: KelasId | string
  topik: string
  isi: string
  refleksi: string
  createdAt: string
  updatedAt?: string
}

export interface Bab {
  id: string
  kelas: '7' | '8' | '9'
  judul: string
  urutan: number
  deskripsi: string
  konten: string // Markdown + LaTeX
  contohSoal: Soal[]
  latihan: Soal[]
  soalHots: Soal[]
  updatedAt: string
}

export interface Soal {
  id: string
  pertanyaan: string
  pembahasan?: string
  tipe: 'pilihan_ganda' | 'isian' | 'uraian'
  pilihan?: string[]
  jawaban?: string
}

export const ALL_KELAS_LIST: KelasId[] = [
  '7A', '7B', '7C', '7D', '7E', '7F', '7G', '7H',
  '8A', '8B', '8C', '8D', '8E', '8F', '8G', '8H',
  '9A', '9B', '9C', '9D', '9E', '9F', '9G', '9H',
]

// Default daftar kelas jika user belum setting kelas aktif
export const DEFAULT_ACTIVE_KELAS: KelasId[] = ['7A', '7B', '8A', '8B', '9A']

// Alias untuk backwards compatibility
export const KELAS_LIST = ALL_KELAS_LIST

export const KKM = 75
export const TAHUN_AJARAN = '2026/2027'
