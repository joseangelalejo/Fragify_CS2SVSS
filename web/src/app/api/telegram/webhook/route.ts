// src/app/api/telegram/webhook/route.ts
// Webhook de Telegram — recibe updates del bot y responde comandos.
// Registro del webhook (ejecutar una vez):
//   curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
//        -d "url=https://fragify.miniserver.online/api/telegram/webhook"

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

const TELEGRAM_API = 'https://api.telegram.org'

async function sendMessage(token: string, chatId: number, text: string) {
  await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
  })
}

async function getStats() {
  try {
    const [row] = await query<any[]>(`
      SELECT
        (SELECT COUNT(*) FROM jugadores_cs2)  AS jugadores,
        (SELECT COUNT(*) FROM partidas_cs2)   AS partidas,
        (SELECT COUNT(*) FROM usuarios_fragify WHERE activo = 1) AS usuarios
    `)
    return row
  } catch { return null }
}

export async function POST(req: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return NextResponse.json({ ok: false })

  // Verificar secret opcional en header
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (secret) {
    const headerSecret = req.headers.get('x-telegram-bot-api-secret-token')
    if (headerSecret !== secret) return NextResponse.json({ ok: false }, { status: 401 })
  }

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ ok: false }) }

  const message = body?.message
  if (!message) return NextResponse.json({ ok: true })

  const chatId  = message.chat?.id
  const text    = message.text ?? ''
  const from    = message.from?.first_name ?? 'Player'

  if (!chatId) return NextResponse.json({ ok: true })

  // ── Comandos ──────────────────────────────────────────────
  if (text.startsWith('/start')) {
    await sendMessage(token, chatId,
      `🎮 *Bienvenido a Fragify Monitor, ${from}!*\n\n` +
      `Soy el bot de monitorización de [Fragify](https://fragify.miniserver.online), la plataforma de estadísticas CS2.\n\n` +
      `*Comandos disponibles:*\n` +
      `/stats — Estadísticas globales de la plataforma\n` +
      `/status — Estado del servicio\n` +
      `/help — Mostrar esta ayuda`
    )
    return NextResponse.json({ ok: true })
  }

  if (text.startsWith('/stats')) {
    const s = await getStats()
    if (!s) {
      await sendMessage(token, chatId, '❌ No se pudieron obtener las estadísticas. Inténtalo de nuevo.')
    } else {
      await sendMessage(token, chatId,
        `📊 *Estadísticas de Fragify*\n\n` +
        `👥 Jugadores registrados: *${Number(s.jugadores).toLocaleString('es-ES')}*\n` +
        `🎮 Partidas procesadas: *${Number(s.partidas).toLocaleString('es-ES')}*\n` +
        `👤 Usuarios activos: *${Number(s.usuarios).toLocaleString('es-ES')}*\n\n` +
        `🔗 [Ver plataforma](https://fragify.miniserver.online)`
      )
    }
    return NextResponse.json({ ok: true })
  }

  if (text.startsWith('/status')) {
    await sendMessage(token, chatId,
      `✅ *Fragify operativo*\n\n` +
      `🌐 Web: [fragify.miniserver.online](https://fragify.miniserver.online)\n` +
      `🕐 ${new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}`
    )
    return NextResponse.json({ ok: true })
  }

  if (text.startsWith('/help')) {
    await sendMessage(token, chatId,
      `*Comandos de Fragify Monitor:*\n\n` +
      `/start — Bienvenida e información\n` +
      `/stats — Estadísticas globales\n` +
      `/status — Estado del servicio\n` +
      `/help — Esta ayuda`
    )
    return NextResponse.json({ ok: true })
  }

  // Mensaje desconocido
  await sendMessage(token, chatId,
    `No entiendo ese comando. Usa /help para ver los comandos disponibles.`
  )

  return NextResponse.json({ ok: true })
}

// GET — verificación de que el webhook está activo
export async function GET() {
  return NextResponse.json({ ok: true, service: 'Fragify Telegram Webhook' })
}
