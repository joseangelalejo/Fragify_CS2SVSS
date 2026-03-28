'use client'
import { useState, useEffect, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

const S = {
  wrap:    { minHeight:'80vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px 16px' },
  card:    { background:'var(--bg-card)', border:'1px solid var(--bg-border)', borderRadius:12, padding:'40px', width:'100%', maxWidth:420 },
  logo:    { fontFamily:'Rajdhani,sans-serif', fontWeight:700, fontSize:28, textAlign:'center' as const, marginBottom:4 },
  sub:     { color:'var(--t3)', fontSize:12, textAlign:'center' as const, marginBottom:32 },
  label:   { fontSize:12, fontWeight:500, color:'var(--t2)', display:'block', marginBottom:6 },
  input:   { width:'100%', background:'#0d0e13', border:'1px solid var(--bg-border)', borderRadius:6, padding:'10px 12px', fontSize:13, color:'var(--t1)', outline:'none', boxSizing:'border-box' as const },
  btn:     { width:'100%', background:'var(--orange)', color:'#fff', fontWeight:700, fontSize:14, padding:'11px', borderRadius:8, border:'none', cursor:'pointer', marginTop:8 },
  steamBtn:{ width:'100%', background:'#1b2838', color:'#c6d4df', fontWeight:600, fontSize:13, padding:'11px', borderRadius:8, border:'1px solid #2a475e', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:10 },
  divider: { display:'flex', alignItems:'center', gap:12, margin:'20px 0' },
  divLine: { flex:1, height:1, background:'var(--bg-border)' },
  divText: { fontSize:11, color:'var(--t3)', whiteSpace:'nowrap' as const },
  error:   { background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:6, padding:'10px 12px', fontSize:13, color:'#ef4444', marginBottom:16 },
  success: { background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.3)', borderRadius:6, padding:'10px 12px', fontSize:13, color:'#22c55e', marginBottom:16 },
  field:   { marginBottom:16 },
}

function LoginForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState('')

  useEffect(() => {
    if (searchParams.get('verified') === '1') setSuccess('Email verified! You can now log in.')
    if (searchParams.get('error') === 'invalid_or_expired_token') setError('Verification link is invalid or expired.')
    if (searchParams.get('error') === 'EMAIL_NOT_VERIFIED') setError('Please verify your email before logging in.')
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const res = await signIn('credentials', { email, password, redirect: false })
    setLoading(false)
    if (res?.error) {
      if (res.error === 'EMAIL_NOT_VERIFIED') setError('Please verify your email before logging in.')
      else if (res.error === 'USE_STEAM') setError('This account was created with Steam. Please use Sign in with Steam.')
      else setError('Invalid email or password.')
    } else {
      router.push('/profile')
    }
  }

  return (
    <div style={S.wrap}>
      <div style={S.card}>
        <div style={S.logo}>FRAG<span style={{ color:'var(--orange)' }}>IFY</span></div>
        <div style={S.sub}>Sign in to your account</div>

        {error   && <div style={S.error}>{error}</div>}
        {success && <div style={S.success}>{success}</div>}

        <button onClick={() => signIn('steam', { callbackUrl: '/profile' })} style={S.steamBtn}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#c6d4df">
            <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.718L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.606 0 11.979 0z"/>
          </svg>
          Sign in with Steam
        </button>

        <div style={S.divider}>
          <div style={S.divLine}/><span style={S.divText}>or sign in with email</span><div style={S.divLine}/>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={S.field}>
            <label style={S.label}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              style={S.input} placeholder="you@example.com" required
              onFocus={e => (e.target.style.borderColor = 'var(--orange)')}
              onBlur={e  => (e.target.style.borderColor = 'var(--bg-border)')}
            />
          </div>
          <div style={S.field}>
            <label style={S.label}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              style={S.input} placeholder="••••••••" required
              onFocus={e => (e.target.style.borderColor = 'var(--orange)')}
              onBlur={e  => (e.target.style.borderColor = 'var(--bg-border)')}
            />
          </div>
          <button type="submit" disabled={loading} style={{ ...S.btn, opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign:'center', marginTop:20, fontSize:13, color:'var(--t3)' }}>
          Don't have an account?{' '}
          <Link href="/auth/register" style={{ color:'var(--orange)' }}>Create one</Link>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight:'80vh', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--t2)' }}>Loading...</div>}>
      <LoginForm />
    </Suspense>
  )
}
