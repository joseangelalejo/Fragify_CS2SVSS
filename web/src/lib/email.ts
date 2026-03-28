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
