import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

const STEAM_KEY  = process.env.STEAM_API_KEY
const CS2_APP_ID = 730

export async function POST(req: NextRequest) {
  const { steam_id } = await req.json()
  if (!steam_id || !/^\d{17}$/.test(steam_id))
    return NextResponse.json({ error: 'Steam ID inválido' }, { status: 400 })

  try {
    // 1 — Perfil Steam
    const profileRes = await fetch(
      `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${STEAM_KEY}&steamids=${steam_id}`
    )
    const profileData = await profileRes.json()
    const player = profileData.response?.players?.[0]
    if (!player)
      return NextResponse.json({ error: 'Jugador no encontrado en Steam' }, { status: 404 })

    // 2 — Stats CS2
    const statsRes = await fetch(
      `https://api.steampowered.com/ISteamUserStats/GetUserStatsForGame/v2/?key=${STEAM_KEY}&steamid=${steam_id}&appid=${CS2_APP_ID}`
    )
    const statsData = await statsRes.json()
    const stats = statsData.playerstats?.stats ?? []
    const get = (name: string) => stats.find((s: any) => s.name === name)?.value ?? 0

    const kills   = get('total_kills')
    const deaths  = get('total_deaths')
    const hs      = get('total_kills_headshot')
    const mvps    = get('total_mvps')
    const wins    = get('total_wins')
    const tiempo  = Math.round(get('total_time_played') / 60)
    const kd      = deaths > 0 ? parseFloat((kills / deaths).toFixed(2)) : kills
    const hsRatio = kills  > 0 ? parseFloat((hs / kills * 100).toFixed(2)) : 0

    // 3 — Upsert jugador
    await query(`
      INSERT INTO jugadores_cs2
        (steam_id64, nombre_usuario_steam, fecha_registro_fragify,
         estado_verificacion, ultima_actualizacion_datos, estado_actividad)
      VALUES (?, ?, NOW(), 1, NOW(), 1)
      ON DUPLICATE KEY UPDATE
        nombre_usuario_steam       = VALUES(nombre_usuario_steam),
        ultima_actualizacion_datos = NOW()
    `, [steam_id, player.personaname])

    // 4 — Upsert estadísticas
    await query(`
      INSERT INTO estadisticas_cs2
        (steam_id64, kills, deaths, headshots, kd_ratio, mvps,
         tiempo_jugado, ratio_headshots, total_partidas_ganadas, ultima_actualizacion)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        kills                  = VALUES(kills),
        deaths                 = VALUES(deaths),
        headshots              = VALUES(headshots),
        kd_ratio               = VALUES(kd_ratio),
        mvps                   = VALUES(mvps),
        tiempo_jugado          = VALUES(tiempo_jugado),
        ratio_headshots        = VALUES(ratio_headshots),
        total_partidas_ganadas = VALUES(total_partidas_ganadas),
        ultima_actualizacion   = NOW()
    `, [steam_id, kills, deaths, hs, kd, mvps, tiempo, hsRatio, wins])

    return NextResponse.json({
      ok:     true,
      player: { steam_id, nombre: player.personaname, kills, deaths, kd, wins, hsRatio }
    })
  } catch (err) {
    console.error('[API /import]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
