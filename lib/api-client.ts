'use client'

import { auth } from '@/lib/firebase'

/**
 * Fetch dengan header Authorization Bearer Firebase ID Token.
 * Seluruh pemanggilan API routes dari client wajib memakai helper ini.
 */
export async function fetchWithAuth(
  url: string,
  init: RequestInit = {}
): Promise<Response> {
  const user = auth.currentUser

  if (!user) {
    throw new Error('Silakan login terlebih dahulu.')
  }

  // getToken() otomatis refresh token jika kedaluwarsa
  const token = await user.getIdToken()

  const headers = new Headers(init.headers || {})
  headers.set('Authorization', `Bearer ${token}`)
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  return fetch(url, { ...init, headers })
}

/**
 * Helper untuk mem-parsing response JSON API dengan pesan error konsisten.
 */
export async function parseApiResponse<T = unknown>(res: Response): Promise<T> {
  let data: unknown = null
  try {
    data = await res.json()
  } catch {
    data = null
  }

  if (!res.ok) {
    const message =
      typeof data === 'object' &&
      data !== null &&
      'error' in data &&
      typeof (data as { error: unknown }).error === 'string'
        ? (data as { error: string }).error
        : `Gagal memanggil API (${res.status}).`
    throw new Error(message)
  }

  return data as T
}
