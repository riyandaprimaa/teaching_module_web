import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/api-auth'
import { resolveSpreadsheetId, upsertKehadiranToSheets } from '@/lib/sheets'

const KehadiranRowSchema = z.object({
  nis: z.string().trim().max(32),
  nama: z.string().trim().max(128),
  kelas: z.string().trim().min(1).max(8),
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'tanggal harus format YYYY-MM-DD'),
  status: z.enum(['hadir', 'izin', 'sakit', 'alfa']),
})

const BodySchema = z.object({
  rows: z.array(KehadiranRowSchema).min(1).max(250),
  /** true = sinkron penuh dari Firestore, baris orphan dihapus */
  authoritative: z.boolean().optional(),
  /** ID spreadsheet dari klien (disimpan di localStorage) — opsional jika env terkonfigurasi */
  spreadsheetId: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_-]+$/, 'ID spreadsheet tidak valid')
    .optional(),
})

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin(req)
    if (auth instanceof NextResponse) return auth

    const parsed = BodySchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Payload tidak valid', detail: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { rows, authoritative, spreadsheetId } = parsed.data
    const resolvedId = resolveSpreadsheetId(spreadsheetId)
    if (!resolvedId) {
      return NextResponse.json(
        { error: 'Belum ada ID spreadsheet. Hubungkan spreadsheet di dashboard.' },
        { status: 400 }
      )
    }
    const result = await upsertKehadiranToSheets(rows, resolvedId, { authoritative })

    return NextResponse.json({ success: true, ...result })
  } catch (err: unknown) {
    console.error('Error syncing kehadiran to Sheets:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Kesalahan server' }, { status: 500 })
  }
}
