import { NextResponse } from 'next/server'
import { getAuth } from 'firebase-admin/auth'
import '@/lib/firebase-admin'

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').toLowerCase()

/**
 * Verifikasi Authorization header:
 *   Authorization: Bearer <firebaseIdToken>
 * Mengembalikan data user jika token valid dan email-nya admin.
 * Jika tidak, mengembalikan NextResponse error (401/403/500) — cukup return di route handler.
 */
export async function requireAdmin(
  req: Request
): Promise<{ user: { uid: string; email: string } } | NextResponse> {
  const header = req.headers.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''

  if (!token) {
    return NextResponse.json(
      { error: 'Tidak terautentikasi. Token Firebase wajib disertakan.' },
      { status: 401 }
    )
  }

  let decoded
  try {
    decoded = await getAuth().verifyIdToken(token)
  } catch (err: unknown) {
    console.error('Verifikasi token gagal:', err instanceof Error ? err.message : err)
    return NextResponse.json(
      { error: 'Token tidak valid atau kedaluwarsa.' },
      { status: 401 }
    )
  }

  const email = (decoded.email || '').toLowerCase()

  if (!ADMIN_EMAIL) {
    console.error('ADMIN_EMAIL belum dikonfigurasi di environment.')
    return NextResponse.json(
      { error: 'Konfigurasi ADMIN_EMAIL belum diatur di server.' },
      { status: 500 }
    )
  }

  if (!email || email !== ADMIN_EMAIL) {
    return NextResponse.json(
      { error: 'Akun ini tidak diizinkan mengakses operasi admin.' },
      { status: 403 }
    )
  }

  return { user: { uid: decoded.uid, email } }
}

/**
 * Sama seperti requireAdmin tapi menerima beberapa email admin (comma-separated).
 * Dipakai jika ADMIN_EMAIL berisi lebih dari satu alamat.
 */
export function getAdminEmails(): string[] {
  return ADMIN_EMAIL.split(',').map((e) => e.trim()).filter(Boolean)
}
