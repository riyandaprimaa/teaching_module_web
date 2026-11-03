'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { BookOpen, HelpCircle, Lightbulb, ChevronRight, CheckCircle } from 'lucide-react'

interface BabData {
  id: string
  judul: string
  ringkasan: string
  rumus: string[]
  contohSoal: { soal: string; jawaban: string }[]
  latihan: string[]
}

const MATERI_KELAS: Record<string, BabData[]> = {
  '7': [
    {
      id: 'bilangan',
      judul: 'Bab 1: Bilangan Bulat dan Pecahan',
      ringkasan:
        'Bilangan bulat terdiri dari bilangan positif, nol, dan bilangan negatif. Operasi penjumlahan, pengurangan, perkalian, dan pembagian memiliki aturan tanda khusus.',
      rumus: [
        'a - (-b) = a + b',
        '(-a) x (-b) = + (a x b)',
        '(-a) x b = - (a x b)',
        'Pecahan: a/b + c/d = (ad + bc) / bd',
      ],
      contohSoal: [
        {
          soal: 'Hitunglah nilai dari -15 + 28 - (-7)?',
          jawaban: '-15 + 28 - (-7) = 13 + 7 = 20.',
        },
        {
          soal: 'Suhu di dalam kulkas -4°C. Saat listrik padam suhunya naik 2°C setiap 10 menit. Berapa suhunya setelah 30 menit?',
          jawaban: 'Kenaikan suhu = (30/10) x 2°C = 6°C. Suhu akhir = -4°C + 6°C = 2°C.',
        },
      ],
      latihan: [
        'Tentukan hasil dari (-8) x 12 : (-4)!',
        'Sebuah kapal selam berada di kedalaman 120 m. Jika kapal naik 45 m, di kedalaman berapakah kapal sekarang?',
      ],
    },
    {
      id: 'aljabar',
      judul: 'Bab 2: Bentuk Aljabar',
      ringkasan:
        'Bentuk aljabar memuat konstanta, variabel, dan koefisien. Operasi suku sejenis dapat dijumlahkan atau dikurangkan secara langsung.',
      rumus: [
        'Sifat Distributif: a(b + c) = ab + ac',
        '(a + b)^2 = a^2 + 2ab + b^2',
        '(a - b)(a + b) = a^2 - b^2',
      ],
      contohSoal: [
        {
          soal: 'Sederhanakan bentuk: 3(2x - 5) + 4(x + 2)?',
          jawaban: '= 6x - 15 + 4x + 8 = 10x - 7.',
        },
      ],
      latihan: [
        'Jika x = 3 dan y = -2, tentukan nilai dari 2x^2 - 3y!',
        'Sederhanakan pecahan aljabar (6x^2 y) / (2xy)!',
      ],
    },
  ],
  '8': [
    {
      id: 'pythagoras',
      judul: 'Bab 1: Teorema Pythagoras',
      ringkasan:
        'Pada segitiga siku-siku, kuadrat panjang sisi miring (hipotenusa) sama dengan jumlah kuadrat panjang sisi siku-sikunya.',
      rumus: ['c^2 = a^2 + b^2', 'a^2 = c^2 - b^2', 'Tripel Pythagoras dasar: (3, 4, 5), (5, 12, 13), (7, 24, 25)'],
      contohSoal: [
        {
          soal: 'Sebuah segitiga siku-siku memiliki panjang alas 6 cm dan tinggi 8 cm. Berapa sisi miringnya?',
          jawaban: 'c^2 = 6^2 + 8^2 = 36 + 64 = 100 -> c = 10 cm.',
        },
      ],
      latihan: [
        'Apakah segitiga dengan sisi 9 cm, 12 cm, dan 15 cm siku-siku?',
        'Sebuah tangga 5 m bersandar pada dinding. Jarak kaki tangga ke dinding 3 m. Berapakah tinggi dinding yang dicapai tangga?',
      ],
    },
  ],
  '9': [
    {
      id: 'pangkat',
      judul: 'Bab 1: Perpangkatan dan Bentuk Akar',
      ringkasan:
        'Perpangkatan adalah perkalian berulang dari suatu bilangan yang sama. Sifat-sifat pangkat eksponen mempermudah perhitungan aljabar tingkat lanjut.',
      rumus: ['a^m x a^n = a^(m+n)', 'a^m : a^n = a^(m-n)', '(a^m)^n = a^(m x n)', 'a^0 = 1 (untuk a ≠ 0)'],
      contohSoal: [
        {
          soal: 'Sederhanakan bentuk (2^3 x 2^4) / 2^2?',
          jawaban: '= 2^(3+4) / 2^2 = 2^7 / 2^2 = 2^(7-2) = 2^5 = 32.',
        },
      ],
      latihan: [
        'Rasionalkan bentuk akar 6 / √3 !',
        'Tentukan hasil dari (3^2)^3 x 3^(-4)!',
      ],
    },
  ],
}

export default function BukuKelasPage() {
  const params = useParams()
  const kelas = (params?.kelas as string) || '7'
  const listBab = MATERI_KELAS[kelas] || MATERI_KELAS['7']
  const [activeBabIndex, setActiveBabIndex] = useState(0)

  const currentBab = listBab[activeBabIndex]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 flex justify-between items-center">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-teal-600 bg-teal-50 px-2.5 py-1 rounded-full">
            Kurikulum Matematika SMP
          </span>
          <h1 className="text-xl font-bold text-slate-800 mt-1">Buku Modul Kelas {kelas}</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pedoman materi pembelajaran, rumus kunci, contoh soal & pembahasan untuk guru.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Navigasi Bab */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-500 uppercase px-1">Daftar Bab</div>
          {listBab.map((bab, idx) => (
            <button
              key={bab.id}
              onClick={() => setActiveBabIndex(idx)}
              className={`w-full text-left p-3 rounded-xl border text-xs font-semibold transition flex items-center justify-between ${
                activeBabIndex === idx
                  ? 'bg-[#1E3A5F] text-white border-[#1E3A5F] shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>{bab.judul}</span>
              <ChevronRight className="w-4 h-4 shrink-0 opacity-60" />
            </button>
          ))}
        </div>

        {/* Detail Konten Bab */}
        <div className="md:col-span-3 space-y-6">
          {currentBab && (
            <>
              {/* Ringkasan & Konsep */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 font-bold text-base text-slate-800">
                  <BookOpen className="w-5 h-5 text-teal-600" /> Ringkasan Teori & Konsep
                </div>
                <p className="text-xs leading-relaxed text-slate-600">{currentBab.ringkasan}</p>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                    <Lightbulb className="w-4 h-4 text-amber-500" /> Rumus-Rumus Kunci:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {currentBab.rumus.map((r, i) => (
                      <div
                        key={i}
                        className="bg-white p-2.5 rounded border border-slate-200 font-mono text-xs text-slate-800 font-medium"
                      >
                        {r}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Contoh Soal & Pembahasan */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="font-bold text-base text-slate-800 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-blue-600" /> Contoh Soal & Pembahasan
                </div>
                <div className="space-y-3">
                  {currentBab.contohSoal.map((cs, i) => (
                    <div key={i} className="border border-slate-200 rounded-lg p-4 space-y-2 text-xs">
                      <div className="font-semibold text-slate-800">
                        Soal {i + 1}: {cs.soal}
                      </div>
                      <div className="bg-emerald-50 text-emerald-900 p-3 rounded border border-emerald-100 flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Pembahasan: </span>
                          {cs.jawaban}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Latihan Soal Guru */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="font-bold text-base text-slate-800">Bank Latihan Siswa</div>
                <div className="space-y-2">
                  {currentBab.latihan.map((lat, i) => (
                    <div
                      key={i}
                      className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 font-medium"
                    >
                      {i + 1}. {lat}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

