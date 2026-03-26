// src/app/api/reports/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { notify } from '@/lib/telegram'
import type { Report, ApiResponse } from '@/lib/types'

// GET — listar reportes pendientes (solo admin/valve via API_SECRET)
export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-api-secret')
  if (secret !== process.env.API_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const rows = await query<Report[]>(
      'SELECT * FROM vw_reportes_pendientes_valve LIMIT 100'
    )
    return NextResponse.json<ApiResponse<Report[]>>({ data: rows, total: rows.length })
  } catch (err) {
    console.error('[API /reports GET]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// POST — crear nuevo reporte (usuario autenticado)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { steam_id64_reportado, steam_id64_reportador, id_tipo_infraccion, descripcion, id_partida } = body

    // Validaciones básicas
    if (!steam_id64_reportado || !steam_id64_reportador || !id_tipo_infraccion) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
    }
    if (steam_id64_reportado === steam_id64_reportador) {
      return NextResponse.json({ error: 'No puedes reportarte a ti mismo' }, { status: 400 })
    }

    // Obtener info del tipo de infracción para la alerta
    const [tipo] = await query<{ codigo: string; severidad: number }[]>(
      'SELECT codigo, severidad FROM tipos_infraccion WHERE id_tipo_infraccion = ?',
      [id_tipo_infraccion]
    )
    if (!tipo) {
      return NextResponse.json({ error: 'Tipo de infracción inválido' }, { status: 400 })
    }

    const [reportado] = await query<{ nombre_usuario_steam: string }[]>(
      'SELECT nombre_usuario_steam FROM jugadores_cs2 WHERE steam_id64 = ?',
      [steam_id64_reportado]
    )

    // Insertar reporte
    await query(
      `INSERT INTO reportes_conducta
         (steam_id64_reportado, steam_id64_reportador, id_tipo_infraccion,
          descripcion, id_partida, fecha_reporte, estado_reporte)
       VALUES (?, ?, ?, ?, ?, NOW(), 'PENDIENTE')`,
      [steam_id64_reportado, steam_id64_reportador, id_tipo_infraccion,
       descripcion ?? null, id_partida ?? null]
    )

    // Notificar a Telegram (sin await — no bloquear la respuesta)
    notify.newReport(
      reportado?.nombre_usuario_steam ?? steam_id64_reportado,
      tipo.codigo,
      tipo.severidad
    ).catch(console.error)

    return NextResponse.json({ data: { ok: true } }, { status: 201 })
  } catch (err) {
    console.error('[API /reports POST]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
