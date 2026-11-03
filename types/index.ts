export type KelasId = '7A' | '7B' | '8A' | '8B' | '9A'

export type StatusKehadiran = 'hadir' | 'izin' | 'sakit' | 'alfa'

export type JenisPenilaian = 'UH' | 'UTS' | 'UAS' | 'Tugas'

export interface Siswa {
  id: string
  nis: string
  nama: string
  kelas: KelasId
  createdAt: Date
}

export interface Kehadiran {
  id: string
  siswaId: string
  namaSiswa: string
  kelas: KelasId
  tanggal: string // format: YYYY-MM-DD
  status: StatusKehadiran
  updatedAt: Date
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
  createdAt: Date
}

export interface Jurnal {
  id: string
  tanggal: string // format: YYYY-MM-DD
  kelas: KelasId | string
  topik: string
  isi: string
  refleksi: string
  createdAt: Date
  updatedAt: Date
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
  updatedAt: Date
}

export interface Soal {
  id: string
  pertanyaan: string
  pembahasan?: string
  tipe: 'pilihan_ganda' | 'isian' | 'uraian'
  pilihan?: string[]
  jawaban?: string
}

export const KELAS_LIST: KelasId[] = ['7A', '7B', '8A', '8B', '9A']

export const KELAS_COLORS: Record<KelasId, string> = {
  '7A': '#3B82F6',
  '7B': '#60A5FA',
  '8A': '#8B5CF6',
  '8B': '#A78BFA',
  '9A': '#F59E0B',
}

export const KKM = 70
export const TAHUN_AJARAN = '2026/2027'

