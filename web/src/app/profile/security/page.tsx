'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

const S = {
  card:   { background:'var(--bg-card)', border:'1px solid var(--bg-border)', borderRadius:12, padding:24, marginBottom:20 },
  title:  { fontSize:12, fontWeight:600, letterSpacing:'0.08em', color:'var(--t3)', marginBottom:20 },
  label:  { fontSize:12, fontWeight:500, color:'var(--t2)', display:'block', marginBottom:6 },
  input:  { width:'100%', background:'#0d0e13', border:'1px solid var(--bg-border)', borderRadius:6, padding:'10px 12px', fontSize:13, color:'var(--t1)', outline:'none', boxSizing:'border-box' as const },
  btn:    { background:'var(--orange)', color:'#fff', fontWeight:700, fontSize:13, padding:'9px 20px', borderRadius:8, border:'none', cursor:'pointer' },
  btnRed: { background:'rgba(239,68,68,0.1)', color:'#ef4444', fontWeight:700, fontSize:13, padding:'9px 20px', borderRadius:8, border:'1px solid rgba(239,68,68,0.3)', cursor:'pointer' },
  btnGhost: { background:'transparent', color:'var(--t3)', fontWeight:500, fontSize:13, padding:'9px 16px', borderRadius:8, border:'1px solid var(--bg-border)', cursor:'pointer' },
  err:    { background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:6, padding:'10px 12px', fontSize:13, color:'#ef4444', marginBottom:12 },
  ok:     { background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.3)', borderRadius:6, padding:'10px 12px', fontSize:13, color:'#22c55e', marginBottom:12 },
  info:   { background:'rgba(129,140,248,0.08)', border:'1px solid rgba(129,140,248,0.2)', borderRadius:6, padding:'10px 14px', fontSize:12, color:'#818cf8', marginBottom:16, lineHeight:1.6 },
  field:  { marginBottom:16 },
  methodBtn: (active: boolean) => ({
    flex:1, padding:'16px', borderRadius:8, cursor:'pointer', textAlign:'center' as const,
    border: active ? '2px solid var(--orange)' : '1px solid var(--bg-border)',
    background: active ? 'rgba(249,115,22,0.08)' : '#111318',
    transition:'all 0.15s',
  }),
}

type AccountInfo = { hasPassword: boolean; hasSteam: boolean; hasEmail: boolean }
type TwoFAStatus = { enabled: boolean; method: 'TOTP' | 'EMAIL' | null }

export default function SecurityPage() {
  const { data: session } = useSession()
  const user = session?.user as any

  const [acct,      setAcct]      = useState<AccountInfo | null>(null)
  const [twoFA,     setTwoFA]     = useState<TwoFAStatus | null>(null)
  const [loading,   setLoading]   = useState(true)

  // Password form
  const [form,      setForm]      = useState({ current: '', newPass: '', confirm: '' })
  const [saving,    setSaving]    = useState(false)
  const [msg,       setMsg]       = useState<{ type:'ok'|'err'; text:string } | null>(null)

  // 2FA setup
  const [setup2FA,  setSetup2FA]  = useState(false)
  const [method2FA, setMethod2FA] = useState<'TOTP'|'EMAIL'>('TOTP')
  const [step2FA,   setStep2FA]   = useState<'choose'|'scan'|'verify'|'done'>('choose')
  const [otpauth,   setOtpauth]   = useState('')
  const [qrUrl,     setQrUrl]     = useState('')
  const [code2FA,   setCode2FA]   = useState('')
  const [backup2FA, setBackup2FA] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [msg2FA,    setMsg2FA]    = useState<{ type:'ok'|'err'; text:string } | null>(null)

  function setF(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  useEffect(() => {
    Promise.all([
      fetch('/api/profile/password').then(r => r.json()),
      fetch('/api/auth/2fa/setup').then(r => r.json()),
    ]).then(([a, t]) => {
      setAcct(a)
      setTwoFA(t)
      setLoading(false)
    })
  }, [])

  // Generar QR para TOTP
  useEffect(() => {
    if (otpauth) {
      import('qrcode').then(QRCode => {
        QRCode.toDataURL(otpauth, { width: 200, margin: 2 }).then(setQrUrl)
      })
    }
  }, [otpauth])

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.newPass !== form.confirm) { setMsg({ type:'err', text:'New passwords do not match' }); return }
    if (form.newPass.length < 8)       { setMsg({ type:'err', text:'Password must be at least 8 characters' }); return }
    if (!/\d/.test(form.newPass))      { setMsg({ type:'err', text:'Password must contain at least one number' }); return }
    setSaving(true); setMsg(null)
    const body: any = { newPass: form.newPass }
    if (acct?.hasPassword) body.current = form.current
    const res  = await fetch('/api/profile/password', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) setMsg({ type:'err', text: data.error })
    else { setMsg({ type:'ok', text: acct?.hasPassword ? 'Password updated!' : 'Password set! You can now log in with email.' }); setForm({ current:'', newPass:'', confirm:'' }); setAcct(prev => prev ? { ...prev, hasPassword: true } : prev) }
  }

  async function start2FASetup() {
    setMsg2FA(null); setCode2FA(''); setEmailSent(false)
    const res  = await fetch('/api/auth/2fa/setup', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ method: method2FA }) })
    const data = await res.json()
    if (!res.ok) { setMsg2FA({ type:'err', text: data.error }); return }
    if (method2FA === 'TOTP') { setOtpauth(data.otpauth); setStep2FA('scan') }
    else { setEmailSent(true); setStep2FA('verify') }
  }

  async function confirm2FA() {
    setMsg2FA(null)
    const res  = await fetch('/api/auth/2fa/setup', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ code: code2FA }) })
    const data = await res.json()
    if (!res.ok) { setMsg2FA({ type:'err', text: data.error }); return }
    setBackup2FA(data.backup)
    setTwoFA({ enabled: true, method: method2FA })
    setStep2FA('done')
  }

  async function disable2FA() {
    if (!confirm('¿Desactivar el 2FA? Tu cuenta quedará menos protegida.')) return
    const res = await fetch('/api/auth/2fa/setup', { method:'DELETE' })
    if (res.ok) { setTwoFA({ enabled: false, method: null }); setSetup2FA(false); setStep2FA('choose') }
  }

  if (loading) return <div style={S.card}><div style={S.title}>SECURITY</div><div style={{ color:'var(--t3)' }}>Loading...</div></div>

  const canSetPassword = acct?.hasSteam || acct?.hasEmail
  const isSettingFirst = !acct?.hasPassword

  return (
    <div>
      <h2 style={{ fontSize:24, marginBottom:24, fontFamily:'Rajdhani,sans-serif' }}>Security</h2>

      {/* ── PASSWORD ── */}
      <div style={S.card}>
        <div style={S.title}>{isSettingFirst ? 'SET PASSWORD' : 'CHANGE PASSWORD'}</div>
        {!canSetPassword ? (
          <p style={{ color:'var(--t2)', fontSize:13 }}>Password management requires a verified email or Steam account.</p>
        ) : (
          <>
            {isSettingFirst && acct?.hasSteam && (
              <div style={S.info}>🔐 Tu cuenta usa Steam. Puedes establecer contraseña para acceder también con tu email.</div>
            )}
            {msg && <div style={msg.type === 'ok' ? S.ok : S.err}>{msg.text}</div>}
            <form onSubmit={handlePasswordSubmit}>
              {acct?.hasPassword && (
                <div style={S.field}>
                  <label style={S.label}>Current Password</label>
                  <input type="password" value={form.current} onChange={e => setF('current', e.target.value)} style={S.input} required onFocus={e=>(e.target.style.borderColor='var(--orange)')} onBlur={e=>(e.target.style.borderColor='var(--bg-border)')} />
                </div>
              )}
              <div style={S.field}>
                <label style={S.label}>New Password</label>
                <input type="password" value={form.newPass} onChange={e => setF('newPass', e.target.value)} style={S.input} placeholder="Min 8 chars, at least 1 number" required onFocus={e=>(e.target.style.borderColor='var(--orange)')} onBlur={e=>(e.target.style.borderColor='var(--bg-border)')} />
              </div>
              <div style={S.field}>
                <label style={S.label}>Confirm New Password</label>
                <input type="password" value={form.confirm} onChange={e => setF('confirm', e.target.value)} style={S.input} required onFocus={e=>(e.target.style.borderColor='var(--orange)')} onBlur={e=>(e.target.style.borderColor='var(--bg-border)')} />
              </div>
              <button type="submit" disabled={saving} style={{ ...S.btn, opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving...' : isSettingFirst ? 'Set Password' : 'Update Password'}
              </button>
            </form>
          </>
        )}
      </div>

      {/* ── TWO FACTOR AUTH ── */}
      <div style={S.card}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <div style={S.title as any}>TWO-FACTOR AUTHENTICATION</div>
          {twoFA?.enabled && (
            <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:4, background:'rgba(34,197,94,0.12)', color:'#22c55e' }}>
              ✓ ACTIVE · {twoFA.method}
            </span>
          )}
        </div>

        {twoFA?.enabled ? (
          <>
            <p style={{ color:'var(--t2)', fontSize:13, marginBottom:16 }}>
              2FA está activo en tu cuenta usando <strong>{twoFA.method === 'TOTP' ? 'Google Authenticator / Authy' : 'Email OTP'}</strong>.
            </p>
            <button onClick={disable2FA} style={S.btnRed}>Desactivar 2FA</button>
          </>
        ) : !setup2FA ? (
          <>
            <p style={{ color:'var(--t2)', fontSize:13, marginBottom:20 }}>
              Añade una capa extra de seguridad. Al iniciar sesión necesitarás un código adicional.
            </p>
            {!acct?.hasEmail && !acct?.hasSteam ? (
              <p style={{ color:'var(--t3)', fontSize:13 }}>Necesitas email verificado para activar 2FA.</p>
            ) : (
              <button onClick={() => setSetup2FA(true)} style={S.btn}>Activar 2FA</button>
            )}
          </>
        ) : (
          <>
            {msg2FA && <div style={msg2FA.type === 'ok' ? S.ok : S.err}>{msg2FA.text}</div>}

            {step2FA === 'choose' && (
              <>
                <p style={{ color:'var(--t2)', fontSize:13, marginBottom:16 }}>Elige el método de verificación:</p>
                <div style={{ display:'flex', gap:12, marginBottom:20 }}>
                  <button onClick={() => setMethod2FA('TOTP')} style={S.methodBtn(method2FA === 'TOTP')}>
                    <div style={{ fontSize:24, marginBottom:8 }}>📱</div>
                    <div style={{ fontWeight:700, fontSize:13, color:'var(--t1)' }}>Authenticator App</div>
                    <div style={{ fontSize:11, color:'var(--t3)', marginTop:4 }}>Google Authenticator, Authy...</div>
                  </button>
                  <button onClick={() => setMethod2FA('EMAIL')} style={S.methodBtn(method2FA === 'EMAIL')}>
                    <div style={{ fontSize:24, marginBottom:8 }}>📧</div>
                    <div style={{ fontWeight:700, fontSize:13, color:'var(--t1)' }}>Email OTP</div>
                    <div style={{ fontSize:11, color:'var(--t3)', marginTop:4 }}>Código por email en cada login</div>
                  </button>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={start2FASetup} style={S.btn}>Continuar →</button>
                  <button onClick={() => setSetup2FA(false)} style={S.btnGhost}>Cancelar</button>
                </div>
              </>
            )}

            {step2FA === 'scan' && (
              <>
                <p style={{ color:'var(--t2)', fontSize:13, marginBottom:16 }}>
                  Escanea este código QR con tu app de autenticación:
                </p>
                {qrUrl && (
                  <div style={{ background:'white', display:'inline-block', borderRadius:8, padding:8, marginBottom:20 }}>
                    <img src={qrUrl} alt="QR 2FA" width={200} height={200} />
                  </div>
                )}
                <div style={S.field}>
                  <label style={S.label}>Confirma con un código de tu app</label>
                  <input type="text" inputMode="numeric" maxLength={6} value={code2FA}
                    onChange={e => setCode2FA(e.target.value.replace(/\D/g,''))}
                    style={{ ...S.input, textAlign:'center', fontSize:22, letterSpacing:'6px', fontFamily:'monospace' }}
                    placeholder="000000"
                    onFocus={e=>(e.target.style.borderColor='var(--orange)')} onBlur={e=>(e.target.style.borderColor='var(--bg-border)')}
                  />
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={confirm2FA} disabled={code2FA.length < 6} style={{ ...S.btn, opacity: code2FA.length < 6 ? 0.6 : 1 }}>Activar</button>
                  <button onClick={() => setStep2FA('choose')} style={S.btnGhost}>← Volver</button>
                </div>
              </>
            )}

            {step2FA === 'verify' && (
              <>
                {emailSent && <div style={S.info}>📧 Hemos enviado un código de 6 dígitos a tu email. Expira en 10 minutos.</div>}
                <div style={S.field}>
                  <label style={S.label}>Código recibido por email</label>
                  <input type="text" inputMode="numeric" maxLength={6} value={code2FA}
                    onChange={e => setCode2FA(e.target.value.replace(/\D/g,''))}
                    style={{ ...S.input, textAlign:'center', fontSize:22, letterSpacing:'6px', fontFamily:'monospace' }}
                    placeholder="000000"
                    onFocus={e=>(e.target.style.borderColor='var(--orange)')} onBlur={e=>(e.target.style.borderColor='var(--bg-border)')}
                  />
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={confirm2FA} disabled={code2FA.length < 6} style={{ ...S.btn, opacity: code2FA.length < 6 ? 0.6 : 1 }}>Activar</button>
                  <button onClick={() => setStep2FA('choose')} style={S.btnGhost}>← Volver</button>
                </div>
              </>
            )}

            {step2FA === 'done' && (
              <>
                <div style={S.ok}>✅ 2FA activado correctamente con {method2FA === 'TOTP' ? 'Authenticator App' : 'Email OTP'}.</div>
                <div style={{ background:'rgba(234,179,8,0.08)', border:'1px solid rgba(234,179,8,0.3)', borderRadius:8, padding:16, marginBottom:16 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#eab308', marginBottom:8 }}>⚠️ GUARDA ESTE CÓDIGO DE RESPALDO</div>
                  <div style={{ fontSize:22, fontFamily:'monospace', fontWeight:700, letterSpacing:'4px', color:'var(--t1)', textAlign:'center', padding:'12px 0' }}>
                    {backup2FA}
                  </div>
                  <div style={{ fontSize:11, color:'var(--t3)' }}>
                    Úsalo si pierdes acceso a tu método de 2FA. Solo funciona una vez y desactivará el 2FA.
                  </div>
                </div>
                <button onClick={() => setSetup2FA(false)} style={S.btn}>Entendido</button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
