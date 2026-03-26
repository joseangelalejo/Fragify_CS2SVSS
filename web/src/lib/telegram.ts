// src/lib/telegram.ts
// Wrapper para enviar mensajes a Telegram desde el backend Next.js.
// Se usa en API routes y en el cron de monitorización.

const TELEGRAM_API = 'https://api.telegram.org'

function getCredentials() {
  const token  = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return null
  return { token, chatId }
}

function ts() {
  return new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })
}

export async function sendTelegram(
  message: string,
  emoji = ''
): Promise<boolean> {
  const creds = getCredentials()
  if (!creds) {
    console.warn('[Telegram] Credenciales no configuradas — mensaje omitido')
    return false
  }

  const text = `${emoji ? emoji + ' ' : ''}*[FRAGIFY]*\n${message}`

  try {
    const res = await fetch(
      `${TELEGRAM_API}/bot${creds.token}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id:    creds.chatId,
          text,
          parse_mode: 'Markdown',
        }),
      }
    )
    return res.ok
  } catch (err) {
    console.error('[Telegram] Error al enviar mensaje:', err)
    return false
  }
}

// ── Mensajes predefinidos por tipo de evento ──────────────────

export const notify = {
  newUser: (steamName: string, email?: string) =>
    sendTelegram(
      `👤 *Nuevo usuario registrado*\nSteam: \`${steamName}\`\nEmail: ${email ?? '—'}\n🕐 ${ts()}`,
      '🎮'
    ),

  newReport: (reportado: string, tipo: string, severidad: number) => {
    const emoji = severidad >= 3 ? '🔴' : severidad === 2 ? '🟠' : '🟡'
    return sendTelegram(
      `${emoji} *Nuevo reporte de conducta*\nTipo: \`${tipo}\` (severidad ${severidad}/3)\nReportado: \`${reportado}\`\n🕐 ${ts()}`,
      '🚩'
    )
  },

  serviceDown: (service: string, reason?: string) =>
    sendTelegram(
      `❌ *${service} caído*\n${reason ? `Error: \`${reason}\`` : ''}\n🕐 ${ts()}`,
      '🚨'
    ),

  serviceUp: (service: string) =>
    sendTelegram(
      `✅ *${service} recuperado*\n🕐 ${ts()}`,
      '🔄'
    ),

  suspiciousActivity: (detail: string) =>
    sendTelegram(
      `⚠️ *Actividad sospechosa detectada*\n${detail}\n🕐 ${ts()}`,
      '🛡️'
    ),

  backupOk: (filename: string, size: string) =>
    sendTelegram(
      `💾 *Backup completado*\nArchivo: \`${filename}\`\nTamaño: ${size}\n🕐 ${ts()}`,
      '✅'
    ),

  backupFail: (reason: string) =>
    sendTelegram(
      `🚨 *Backup fallido*\nError: \`${reason}\`\n🕐 ${ts()}`,
      '💀'
    ),
}
