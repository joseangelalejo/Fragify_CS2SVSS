// src/app/api/cron/monitor/route.ts
// Este endpoint actúa como cron de monitorización.
// En Vercel se puede llamar desde un Vercel Cron Job cada minuto.
// En homelab se puede llamar con curl desde crontab cada 30s.
//
// Crontab homelab (cada 30s):
//   * * * * * curl -s -H "x-cron-secret: $CRON_SECRET" http://localhost:3000/api/cron/monitor
//   * * * * * sleep 30; curl -s -H "x-cron-secret: $CRON_SECRET" http://localhost:3000/api/cron/monitor

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { notify, sendTelegram } from '@/lib/telegram'

// Estado en memoria del proceso (se reinicia con cada deploy)
// Para persistencia real usar Redis o la propia BD
const monitorState = {
  lastNewUserId:   0,
  lastReportId:    0,
  initialized:     false,
}

export async function GET(req: NextRequest) {
  // Verificar secret del cron
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const results: string[] = []

  try {
    // ── Inicializar baseline (primera ejecución)
    if (!monitorState.initialized) {
      const [[{ maxUser }]]   = await query<[{ maxUser: number }]>(
        'SELECT IFNULL(MAX(id_usuario), 0) AS maxUser FROM usuarios_fragify'
      )
      const [[{ maxReport }]] = await query<[{ maxReport: number }]>(
        'SELECT IFNULL(MAX(id_reporte), 0) AS maxReport FROM reportes_conducta'
      )
      monitorState.lastNewUserId = maxUser
      monitorState.lastReportId  = maxReport
      monitorState.initialized   = true
      results.push(`baseline: users=${maxUser} reports=${maxReport}`)
    }

    // ── Nuevos usuarios
    const newUsers = await query<{ id_usuario: number; nombre_usuario_steam: string; email: string; fecha_registro: string }[]>(
      `SELECT uf.id_usuario, j.nombre_usuario_steam, uf.email, uf.fecha_registro
       FROM usuarios_fragify uf
       JOIN jugadores_cs2 j ON uf.steam_id64 = j.steam_id64
       WHERE uf.id_usuario > ?
       ORDER BY uf.id_usuario ASC LIMIT 10`,
      [monitorState.lastNewUserId]
    )
    for (const u of newUsers) {
      await notify.newUser(u.nombre_usuario_steam, u.email)
      monitorState.lastNewUserId = u.id_usuario
      results.push(`new_user: ${u.nombre_usuario_steam}`)
    }

    // ── Nuevos reportes (alta severidad → alerta inmediata)
    const newReports = await query<{
      id_reporte: number
      jugador_reportado: string
      tipo_infraccion: string
      severidad: number
    }[]>(
      `SELECT r.id_reporte, j.nombre_usuario_steam AS jugador_reportado,
              ti.codigo AS tipo_infraccion, ti.severidad
       FROM reportes_conducta r
       JOIN tipos_infraccion ti ON r.id_tipo_infraccion = ti.id_tipo_infraccion
       JOIN jugadores_cs2 j    ON r.steam_id64_reportado = j.steam_id64
       WHERE r.id_reporte > ?
       ORDER BY r.id_reporte ASC LIMIT 5`,
      [monitorState.lastReportId]
    )
    for (const r of newReports) {
      await notify.newReport(r.jugador_reportado, r.tipo_infraccion, r.severidad)
      monitorState.lastReportId = r.id_reporte
      results.push(`new_report: ${r.tipo_infraccion} on ${r.jugador_reportado}`)
    }

    // ── Anomalías: spam de reportes (>5 del mismo usuario en 5 min)
    const spammers = await query<{ nombre: string; num: number }[]>(`
      SELECT j.nombre_usuario_steam AS nombre, COUNT(*) AS num
      FROM reportes_conducta r
      JOIN jugadores_cs2 j ON r.steam_id64_reportador = j.steam_id64
      WHERE r.fecha_reporte > DATE_SUB(NOW(), INTERVAL 5 MINUTE)
      GROUP BY r.steam_id64_reportador
      HAVING num >= 5
    `)
    for (const s of spammers) {
      await notify.suspiciousActivity(
        `Spam de reportes: \`${s.nombre}\` — ${s.num} reportes en 5 min`
      )
      results.push(`spam_reports: ${s.nombre} x${s.num}`)
    }

    // ── Anomalías: pico de registros (>10 en 5 min)
    const [[{ nuevos }]] = await query<[{ nuevos: number }]>(`
      SELECT COUNT(*) AS nuevos FROM usuarios_fragify
      WHERE fecha_registro > DATE_SUB(NOW(), INTERVAL 5 MINUTE)
    `)
    if (nuevos >= 10) {
      await notify.suspiciousActivity(
        `Pico de registros: *${nuevos}* usuarios en los últimos 5 minutos (posible bot)`
      )
      results.push(`suspicious_registrations: ${nuevos}`)
    }

    return NextResponse.json({ ok: true, checks: results })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    console.error('[Cron Monitor]', err)

    await sendTelegram(
      `🚨 *Error en cron de monitorización*\n\`${message}\``,
      '💀'
    ).catch(() => {})

    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
