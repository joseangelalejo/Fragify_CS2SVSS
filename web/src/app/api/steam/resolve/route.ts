// src/app/api/steam/resolve/route.ts
// Resuelve vanity URLs de Steam a Steam ID64
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const vanity = req.nextUrl.searchParams.get('vanity')?.trim()
  if (!vanity)
    return NextResponse.json({ error: 'Falta parámetro vanity' }, { status: 400 })

  const key = process.env.STEAM_API_KEY
  if (!key)
    return NextResponse.json({ error: 'STEAM_API_KEY no configurada' }, { status: 500 })

  try {
    const res  = await fetch(
      `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=${key}&vanityurl=${encodeURIComponent(vanity)}`
    )
    const data = await res.json()
    if (data.response?.success === 1)
      return NextResponse.json({ steam_id: data.response.steamid })
    return NextResponse.json({ error: 'Vanity URL no encontrada' }, { status: 404 })
  } catch (err) {
    console.error('[API /steam/resolve]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
