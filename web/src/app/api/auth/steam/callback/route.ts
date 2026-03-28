// src/app/api/auth/steam/callback/route.ts
// Maneja el retorno de Steam OpenID, valida la identidad y hace signIn con Credentials
import { NextRequest, NextResponse } from 'next/server'
import { signIn } from '@/lib/auth'

const STEAM_OPENID_URL = 'https://steamcommunity.com/openid/login'

export async function GET(req: NextRequest) {
  const params   = req.nextUrl.searchParams
  const claimedId = params.get('openid.claimed_id') ?? ''
  const mode      = params.get('openid.mode')

  if (mode !== 'id_res' || !claimedId.includes('steamcommunity.com/openid/id/')) {
    return NextResponse.redirect(new URL('/auth/login?error=SteamFailed', req.url))
  }

  // Validar con Steam
  const validateParams = new URLSearchParams(params)
  validateParams.set('openid.mode', 'check_authentication')
  const validateRes  = await fetch(STEAM_OPENID_URL, {
    method:  'POST',
    body:    validateParams,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  const validateText = await validateRes.text()
  if (!validateText.includes('is_valid:true')) {
    return NextResponse.redirect(new URL('/auth/login?error=SteamInvalid', req.url))
  }

  // Extraer Steam ID
  const steamId = claimedId.split('/').pop()
  if (!steamId || !/^\d{17}$/.test(steamId)) {
    return NextResponse.redirect(new URL('/auth/login?error=SteamInvalid', req.url))
  }

  // Hacer signIn con el provider 'steam' (Credentials)
  try {
    await signIn('steam', { steamId, redirectTo: '/profile' })
  } catch (err: any) {
    // Next.js lanza un redirect como error, hay que relanzarlo
    if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
    return NextResponse.redirect(new URL('/auth/login?error=SteamFailed', req.url))
  }
}
