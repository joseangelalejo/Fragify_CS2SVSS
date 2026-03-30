// src/lib/email.ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM   = 'Fragify <noreply@miniserver.online>'
const BASE   = process.env.NEXT_PUBLIC_APP_URL ?? 'https://fragify.miniserver.online'

export async function sendVerificationEmail(email: string, token: string, name: string) {
  const link = `${BASE}/api/auth/verify?token=${token}`
  await resend.emails.send({
    from:    FROM,
    to:      email,
    subject: 'Verify your Fragify account',
    html: `
      <!DOCTYPE html>
      <html>
      <body style="background:#0b0c10;color:#f1f2f5;font-family:Inter,sans-serif;padding:40px 20px;margin:0">
        <div style="max-width:480px;margin:0 auto;background:#0f1014;border:1px solid #252836;border-radius:12px;padding:40px">
          <h1 style="font-family:sans-serif;font-size:28px;font-weight:700;margin:0 0 8px">
            FRAG<span style="color:#f97316">IFY</span>
          </h1>
          <p style="color:#9ca3af;font-size:13px;margin:0 0 32px">CS2 Stats Platform</p>
          <h2 style="font-size:20px;margin:0 0 12px">Verify your email</h2>
          <p style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0 0 28px">
            Hey ${name}, click the button below to verify your email address and activate your Fragify account.
            This link expires in <strong style="color:#f1f2f5">24 hours</strong>.
          </p>
          <a href="${link}"
             style="display:inline-block;background:#f97316;color:#fff;font-weight:700;
                    font-size:14px;padding:12px 28px;border-radius:8px;text-decoration:none">
            Verify Email
          </a>
          <p style="color:#4b5563;font-size:12px;margin:28px 0 0;line-height:1.6">
            If you didn't create a Fragify account, you can safely ignore this email.<br>
            Or copy this link: <span style="color:#f97316">${link}</span>
          </p>
        </div>
      </body>
      </html>
    `,
  })
}

export async function sendPasswordResetEmail(email: string, token: string, name: string) {
  const link = `${BASE}/auth/reset-password?token=${token}`
  await resend.emails.send({
    from:    FROM,
    to:      email,
    subject: 'Reset your Fragify password',
    html: `
      <!DOCTYPE html>
      <html>
      <body style="background:#0b0c10;color:#f1f2f5;font-family:Inter,sans-serif;padding:40px 20px;margin:0">
        <div style="max-width:480px;margin:0 auto;background:#0f1014;border:1px solid #252836;border-radius:12px;padding:40px">
          <h1 style="font-family:sans-serif;font-size:28px;font-weight:700;margin:0 0 8px">
            FRAG<span style="color:#f97316">IFY</span>
          </h1>
          <h2 style="font-size:20px;margin:0 0 12px">Reset your password</h2>
          <p style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0 0 28px">
            Hey ${name}, click below to reset your password. This link expires in <strong style="color:#f1f2f5">1 hour</strong>.
          </p>
          <a href="${link}"
             style="display:inline-block;background:#f97316;color:#fff;font-weight:700;
                    font-size:14px;padding:12px 28px;border-radius:8px;text-decoration:none">
            Reset Password
          </a>
          <p style="color:#4b5563;font-size:12px;margin:28px 0 0">
            If you didn't request this, ignore this email.
          </p>
        </div>
      </body>
      </html>
    `,
  })
}

export async function sendTicketResponseEmail(
  email: string, nombre: string, asunto: string,
  ticketId: number, respuesta: string, nuevoEstado: string
) {
  const estColor: Record<string, string> = {
    ABIERTO:    '#f97316',
    EN_PROCESO: '#3b82f6',
    CERRADO:    '#22c55e',
  }
  const color = estColor[nuevoEstado] ?? '#9ca3af'

  await resend.emails.send({
    from:    FROM,
    to:      email,
    subject: `Re: [Ticket #${ticketId}] ${asunto}`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="background:#0b0c10;color:#f1f2f5;font-family:Inter,sans-serif;padding:40px 20px;margin:0">
        <div style="max-width:520px;margin:0 auto;background:#0f1014;border:1px solid #252836;border-radius:12px;padding:40px">
          <h1 style="font-family:sans-serif;font-size:28px;font-weight:700;margin:0 0 8px">
            FRAG<span style="color:#f97316">IFY</span>
          </h1>
          <p style="color:#9ca3af;font-size:13px;margin:0 0 28px">Support · Ticket #${ticketId}</p>

          <div style="background:#1a1b27;border-radius:8px;padding:14px 16px;margin-bottom:24px">
            <span style="font-size:11px;font-weight:700;letter-spacing:0.08em;
                         background:${color}22;color:${color};padding:2px 8px;border-radius:4px">
              ${nuevoEstado}
            </span>
            <p style="color:#9ca3af;font-size:13px;margin:8px 0 0">
              Asunto: <strong style="color:#f1f2f5">${asunto}</strong>
            </p>
          </div>

          <h2 style="font-size:16px;margin:0 0 12px">Hola ${nombre},</h2>
          <p style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0 0 20px">
            Hemos respondido a tu ticket de soporte. Aquí está nuestra respuesta:
          </p>

          <div style="background:#111318;border-left:3px solid #f97316;border-radius:0 8px 8px 0;
                      padding:16px 20px;margin-bottom:28px;font-size:14px;line-height:1.7;
                      color:#e2e8f0;white-space:pre-wrap">
${respuesta}
          </div>

          <p style="color:#4b5563;font-size:12px;line-height:1.6;margin:0">
            Si tienes más preguntas, puedes responder a este email o abrir un nuevo ticket en
            <a href="${BASE}/profile" style="color:#f97316">${BASE}</a>.
          </p>
        </div>
      </body>
      </html>
    `,
  })
}

export async function send2FASetupEmail(email: string, nombre: string, otp: string) {
  await resend.emails.send({
    from:    FROM,
    to:      email,
    subject: 'Fragify — Código de verificación 2FA',
    html: `
      <!DOCTYPE html><html>
      <body style="background:#0b0c10;color:#f1f2f5;font-family:Inter,sans-serif;padding:40px 20px;margin:0">
        <div style="max-width:480px;margin:0 auto;background:#0f1014;border:1px solid #252836;border-radius:12px;padding:40px">
          <h1 style="font-size:28px;font-weight:700;margin:0 0 8px">FRAG<span style="color:#f97316">IFY</span></h1>
          <p style="color:#9ca3af;font-size:13px;margin:0 0 28px">Configuración de doble factor</p>
          <h2 style="font-size:20px;margin:0 0 12px">Tu código de verificación</h2>
          <p style="color:#9ca3af;font-size:14px;margin:0 0 24px">
            Hola ${nombre}, usa este código para activar el 2FA en tu cuenta. Expira en <strong style="color:#f1f2f5">10 minutos</strong>.
          </p>
          <div style="background:#1a1b27;border-radius:8px;padding:20px;text-align:center;margin-bottom:24px">
            <span style="font-size:36px;font-weight:700;letter-spacing:8px;color:#f97316;font-family:monospace">${otp}</span>
          </div>
          <p style="color:#4b5563;font-size:12px">Si no has solicitado esto, ignora este email.</p>
        </div>
      </body></html>
    `,
  })
}

export async function send2FALoginEmail(email: string, nombre: string, otp: string) {
  await resend.emails.send({
    from:    FROM,
    to:      email,
    subject: 'Fragify — Código de acceso',
    html: `
      <!DOCTYPE html><html>
      <body style="background:#0b0c10;color:#f1f2f5;font-family:Inter,sans-serif;padding:40px 20px;margin:0">
        <div style="max-width:480px;margin:0 auto;background:#0f1014;border:1px solid #252836;border-radius:12px;padding:40px">
          <h1 style="font-size:28px;font-weight:700;margin:0 0 8px">FRAG<span style="color:#f97316">IFY</span></h1>
          <p style="color:#9ca3af;font-size:13px;margin:0 0 28px">Verificación de inicio de sesión</p>
          <h2 style="font-size:20px;margin:0 0 12px">Código de acceso</h2>
          <p style="color:#9ca3af;font-size:14px;margin:0 0 24px">
            Hola ${nombre}, alguien está intentando acceder a tu cuenta. Expira en <strong style="color:#f1f2f5">10 minutos</strong>.
          </p>
          <div style="background:#1a1b27;border-radius:8px;padding:20px;text-align:center;margin-bottom:24px">
            <span style="font-size:36px;font-weight:700;letter-spacing:8px;color:#f97316;font-family:monospace">${otp}</span>
          </div>
          <p style="color:#4b5563;font-size:12px">Si no eres tú, cambia tu contraseña inmediatamente.</p>
        </div>
      </body></html>
    `,
  })
}
