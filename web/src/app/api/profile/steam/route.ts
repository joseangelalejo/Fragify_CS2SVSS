// src/app/api/profile/steam/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { auth } from '@/lib/auth'

// GET — obtener estado Steam del usuario actual
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any)?.id
  const rows   = await query<any[]>(
    `SELECT steam_id64, steam_linked, sharecode_cs2, sharecode_csgo,
            avatar_url, steam_auth_token
     FROM usuarios_fragify WHERE id_usuario = ?`,
    [userId]
  )
  return NextResponse.json(rows[0] ?? {})
}

// PATCH — actualizar sharecodes y/o auth token
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any)?.id
  const { sharecode_cs2, sharecode_csgo, steam_auth_token } = await req.json()

  // Validar formato sharecode (acepta mayúsculas y minúsculas)
  if (sharecode_cs2 && !/^CSGO(-[A-Za-z0-9]{5}){5}$/i.test(sharecode_cs2) && !/^[A-Za-z0-9]{5}(-[A-Za-z0-9]{5}){4}$/i.test(sharecode_cs2))
    return NextResponse.json({ error: 'Invalid CS2 sharecode format' }, { status: 400 })

  // Validar auth token — solo caracteres alfanuméricos, longitud razonable
  if (steam_auth_token !== undefined && steam_auth_token !== null && steam_auth_token !== '') {
    if (!/^[A-Za-z0-9+/=\-_]{6,100}$/.test(steam_auth_token))
      return NextResponse.json({ error: 'Invalid auth token format' }, { status: 400 })
  }

  await query(
    `UPDATE usuarios_fragify
     SET sharecode_cs2     = ?,
         sharecode_csgo    = ?,
         steam_auth_token  = ?
     WHERE id_usuario = ?`,
    [
      sharecode_cs2    ?? null,
      sharecode_csgo   ?? null,
      steam_auth_token !== undefined ? (steam_auth_token || null) : undefined,
      userId,
    ].filter((_, i) => i < 3 ? true : true) // mantener los 4 valores
  )

  return NextResponse.json({ ok: true })
}

// POST — vincular Steam manualmente con steam_id64
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId   = (session.user as any)?.id
  const { steam_id } = await req.json()

  if (!steam_id || !/^\d{17}$/.test(steam_id))
    return NextResponse.json({ error: 'Invalid Steam ID' }, { status: 400 })

  const existing = await query<any[]>(
    `SELECT id_usuario FROM usuarios_fragify WHERE steam_id64 = ? AND id_usuario != ?`,
    [steam_id, userId]
  )
  if (existing.length > 0)
    return NextResponse.json({ error: 'Steam account already linked to another Fragify account' }, { status: 409 })

  const steamKey   = process.env.STEAM_API_KEY
  const profileRes = await fetch(
    `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${steamKey}&steamids=${steam_id}`
  )
  const profileData = await profileRes.json()
  const player = profileData.response?.players?.[0]
  if (!player) return NextResponse.json({ error: 'Steam profile not found' }, { status: 404 })

  await query(
    `INSERT INTO jugadores_cs2 (steam_id64, nombre_usuario_steam, fecha_registro_fragify, estado_verificacion, ultima_actualizacion_datos, estado_actividad)
     VALUES (?, ?, NOW(), 1, NOW(), 1)
     ON DUPLICATE KEY UPDATE nombre_usuario_steam = VALUES(nombre_usuario_steam), ultima_actualizacion_datos = NOW()`,
    [steam_id, player.personaname]
  )

  await query(
    `UPDATE usuarios_fragify SET steam_id64 = ?, steam_linked = 1, avatar_url = ? WHERE id_usuario = ?`,
    [steam_id, player.avatarfull, userId]
  )

  return NextResponse.json({ ok: true, avatar: player.avatarfull, name: player.personaname })
}
