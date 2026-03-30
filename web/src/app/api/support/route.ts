// src/app/api/support/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { auth } from '@/lib/auth'
import { sendTelegram } from '@/lib/telegram'
import { sendTicketResponseEmail } from '@/lib/email'

function getIP(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '0.0.0.0'
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { nombre, email, asunto, mensaje, categoria, honeypot } = body

    if (honeypot) return NextResponse.json({ error: 'Bot detected' }, { status: 400 })

    if (!nombre?.trim() || !email?.trim() || !asunto?.trim() || !mensaje?.trim())
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })

    if (mensaje.length > 2000)
      return NextResponse.json({ error: 'Message too long (max 2000 chars)' }, { status: 400 })

    const session = await auth()
    const userId  = session ? (session.user as any)?.id : null
    const ip      = getIP(req)

    // Rate limit: max 3 tickets por IP en 24h
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ')
    const recent = await query<any[]>(
      `SELECT COUNT(*) AS cnt FROM support_tickets WHERE ip_origen = ? AND fecha_creacion > ?`,
      [ip, cutoff]
    )
    if (Number(recent[0]?.cnt ?? 0) >= 3)
      return NextResponse.json({ error: 'Too many tickets submitted. Try again tomorrow.' }, { status: 429 })

    const validCategories = ['BUG', 'CUENTA', 'DATOS', 'OTRO']
    const cat = validCategories.includes(categoria) ? categoria : 'OTRO'

    await query(
      `INSERT INTO support_tickets (nombre, email, asunto, mensaje, categoria, id_usuario, ip_origen)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [nombre.trim(), email.toLowerCase().trim(), asunto.trim(), mensaje.trim(), cat, userId, ip]
    )

    // Notificar por Telegram
    const userInfo = userId ? `Usuario ID: \`${userId}\`` : 'Usuario anónimo'
    await sendTelegram(
      `🎫 *Nuevo ticket de soporte*\n` +
      `📋 Categoría: \`${cat}\`\n` +
      `👤 Nombre: \`${nombre.trim()}\`\n` +
      `📧 Email: \`${email.toLowerCase().trim()}\`\n` +
      `${userInfo}\n` +
      `📝 Asunto: \`${asunto.trim()}\`\n` +
      `💬 Mensaje:\n${mensaje.trim().slice(0, 300)}${mensaje.length > 300 ? '...' : ''}`,
      '🆘'
    ).catch(() => {}) // no bloquear si falla Telegram

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[support]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Admin: listar tickets
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || (session.user as any)?.role !== 'ADMIN')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const estado  = req.nextUrl.searchParams.get('estado') ?? 'ABIERTO'
  const tickets = await query<any[]>(
    `SELECT id, nombre, email, asunto, mensaje, categoria, estado,
            id_usuario, fecha_creacion, fecha_update, notas_admin,
            respuesta_admin, fecha_respuesta
     FROM support_tickets WHERE estado = ? ORDER BY fecha_creacion DESC LIMIT 100`,
    [estado]
  )
  return NextResponse.json({ tickets })
}

// Admin: actualizar estado ticket
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session || (session.user as any)?.role !== 'ADMIN')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { id, estado, notas_admin, respuesta_admin } = await req.json()

  // Obtener datos del ticket para el email
  const [ticket] = await query<any[]>(
    `SELECT nombre, email, asunto, respuesta_admin AS resp_anterior FROM support_tickets WHERE id = ?`,
    [id]
  )
  if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

  const tieneRespuestaNueva = respuesta_admin && respuesta_admin.trim() &&
                              respuesta_admin.trim() !== (ticket.resp_anterior ?? '').trim()

  // Actualizar ticket
  await query(
    `UPDATE support_tickets
     SET estado = ?,
         notas_admin = ?,
         respuesta_admin = ?,
         fecha_respuesta = CASE WHEN ? IS NOT NULL AND ? != '' THEN NOW() ELSE fecha_respuesta END
     WHERE id = ?`,
    [estado, notas_admin ?? null, respuesta_admin ?? null,
     respuesta_admin, respuesta_admin, id]
  )

  // Enviar email al usuario si hay respuesta nueva
  if (tieneRespuestaNueva && ticket.email) {
    try {
      await sendTicketResponseEmail(
        ticket.email, ticket.nombre, ticket.asunto,
        id, respuesta_admin.trim(), estado
      )
    } catch (err) {
      console.error('[support PATCH] email error:', err)
      // No bloqueamos si el email falla
    }
  }

  return NextResponse.json({ ok: true, emailSent: tieneRespuestaNueva && !!ticket.email })
}
