// src/app/api/cron/monitor/route.ts
// Cron de monitorización — llamar cada 30s desde crontab del homelab:
//   * * * * * curl -sf -H "x-cron-secret: SECRET" https://fragify.miniserver.online/api/cron/monitor
//   * * * * * sleep 30; curl -sf -H "x-cron-secret: SECRET" https://fragify.miniserver.online/api/cron/monitor

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { notify, sendTelegram } from '@/lib/telegram'

export const dynamic = 'force-dynamic'

// Estado en memoria — se reinicia con cada deploy
const state = {
  lastNewUserId:  0,
  lastReportId:   0,
  initialized:    false,
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const results: string[] = []

  try {
    // Inicializar baseline (primera ejecución — no alertar histórico)
    if (!state.initialized) {
      const [[{ maxUser }]]   = await query<[{ maxUser: number }]>(
        'SELECT IFNULL(MAX(id_usuario), 0) AS maxUser FROM usuarios_fragify'
      )
      const [[{ maxReport }]] = await query<[{ maxReport: number }]>(
        'SELECT IFNULL(MAX(id_reporte), 0) AS maxReport FROM reportes_conducta'
      )
      state.lastNewUserId = maxUser
      state.lastReportId  = maxReport
      state.initialized   = true
      results.push(`baseline users=${maxUser} reports=${maxReport}`)
    }

    // Nuevos usuarios registrados
    const newUsers = await query<any[]>(
      `SELECT uf.id_usuario, uf.email, j.nombre_usuario_steam
       FROM usuarios_fragify uf
       JOIN jugadores_cs2 j ON uf.steam_id64 = j.steam_id64
       WHERE uf.id_usuario > ? ORDER BY uf.id_usuario LIMIT 10`,
      [state.lastNewUserId]
    )
    for (const u of newUsers) {
      await notify.newUser(u.nombre_usuario_steam, u.email)
      state.lastNewUserId = u.id_usuario
      results.push(`new_user: ${u.nombre_usuario_steam}`)
    }

    // Nuevos reportes
    const newReports = await query<any[]>(
      `SELECT r.id_reporte, j.nombre_usuario_steam AS reportado,
              ti.codigo AS tipo, ti.severidad
       FROM reportes_conducta r
       JOIN tipos_infraccion ti ON r.id_tipo_infraccion = ti.id_tipo_infraccion
       JOIN jugadores_cs2 j    ON r.steam_id64_reportado = j.steam_id64
       WHERE r.id_reporte > ? ORDER BY r.id_reporte LIMIT 5`,
      [state.lastReportId]
    )
    for (const r of newReports) {
      await notify.newReport(r.reportado, r.tipo, r.severidad)
      state.lastReportId = r.id_reporte
      results.push(`new_report: ${r.tipo} on ${r.reportado}`)
    }

    // Anomalías: spam de reportes (>5 del mismo usuario en 5 min)
    const spammers = await query<any[]>(`
      SELECT j.nombre_usuario_steam AS nombre, COUNT(*) AS num
      FROM reportes_conducta r
      JOIN jugadores_cs2 j ON r.steam_id64_reportador = j.steam_id64
      WHERE r.fecha_reporte > DATE_SUB(NOW(), INTERVAL 5 MINUTE)
      GROUP BY r.steam_id64_reportador HAVING num >= 5
    `)
    for (const s of spammers) {
      await notify.suspiciousActivity(
        `Spam de reportes: \`${s.nombre}\` — ${s.num} en 5 min`
      )
      results.push(`spam: ${s.nombre} x${s.num}`)
    }

    // Anomalías: pico de registros (>10 en 5 min)
    const [[{ nuevos }]] = await query<[{ nuevos: number }]>(`
      SELECT COUNT(*) AS nuevos FROM usuarios_fragify
      WHERE fecha_registro > DATE_SUB(NOW(), INTERVAL 5 MINUTE)
    `)
    if (nuevos >= 10) {
      await notify.suspiciousActivity(
        `Pico de registros: *${nuevos}* usuarios en 5 min (posible bot)`
      )
      results.push(`suspicious_registrations: ${nuevos}`)
    }

    return NextResponse.json({ ok: true, checks: results })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido'
    console.error('[Cron Monitor]', err)
    await sendTelegram(`🚨 *Error en cron monitor*\n\`${msg}\``).catch(() => {})
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
