// src/app/api/auth/verify/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.redirect(new URL('/auth/login?error=invalid_token', req.url))

  try {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
    const rows = await query<any[]>(
      `SELECT id_usuario FROM usuarios_fragify
       WHERE email_verify_token = ? AND email_verify_exp > ? AND email_verified = 0
       LIMIT 1`,
      [token, now]
    )

    if (rows.length === 0)
      return NextResponse.redirect(new URL('/auth/login?error=invalid_or_expired_token', req.url))

    await query(
      `UPDATE usuarios_fragify
       SET email_verified = 1, email_verify_token = NULL, email_verify_exp = NULL
       WHERE id_usuario = ?`,
      [rows[0].id_usuario]
    )

    return NextResponse.redirect(new URL('/auth/login?verified=1', req.url))
  } catch (err) {
    console.error('[verify]', err)
    return NextResponse.redirect(new URL('/auth/login?error=server_error', req.url))
  }
}
