'use client'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

export default function ProfilePage() {
  const { data: session } = useSession()
  const user = session?.user as any

  return (
    <div>
      <h2 style={{ fontSize:24, marginBottom:24, fontFamily:'Rajdhani,sans-serif' }}>Your Profile</h2>

      <div style={{ display:'grid', gap:16 }}>
        {/* Stats card */}
        {user?.steamId ? (
          <div style={{ background:'var(--bg-card)', border:'1px solid var(--bg-border)', borderRadius:12, padding:24 }}>
            <div style={{ fontSize:12, fontWeight:600, letterSpacing:'0.08em', color:'var(--orange)', marginBottom:12 }}>CS2 STATS</div>
            <Link href={`/player/${user.steamId}`} style={{
              display:'inline-flex', alignItems:'center', gap:8,
              background:'var(--orange)', color:'#fff', fontWeight:700,
              fontSize:13, padding:'9px 18px', borderRadius:8, textDecoration:'none',
            }}>
              View my CS2 profile →
            </Link>
          </div>
        ) : (
          <div style={{ background:'var(--bg-card)', border:'1px solid var(--bg-border)', borderRadius:12, padding:24 }}>
            <div style={{ fontSize:12, fontWeight:600, letterSpacing:'0.08em', color:'var(--t3)', marginBottom:8 }}>CS2 STATS</div>
            <p style={{ color:'var(--t2)', fontSize:13, marginBottom:16 }}>Link your Steam account to view your CS2 stats.</p>
            <Link href="/profile/steam" style={{
              display:'inline-flex', alignItems:'center', gap:8,
              background:'#1b2838', color:'#c6d4df', fontWeight:600,
              fontSize:13, padding:'9px 18px', borderRadius:8, textDecoration:'none',
              border:'1px solid #2a475e',
            }}>
              🎮 Link Steam account
            </Link>
          </div>
        )}

        {/* Account info */}
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--bg-border)', borderRadius:12, padding:24 }}>
          <div style={{ fontSize:12, fontWeight:600, letterSpacing:'0.08em', color:'var(--t3)', marginBottom:16 }}>ACCOUNT INFO</div>
          <div style={{ display:'grid', gap:12 }}>
            {[
              { label:'Username', value: user?.name ?? '—' },
              { label:'Email',    value: user?.email ?? '—' },
              { label:'Steam',    value: user?.steamId ? `Linked (${user.steamId})` : 'Not linked' },
              { label:'Role',     value: user?.role ?? 'USUARIO' },
            ].map(r => (
              <div key={r.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid var(--bg-border)' }}>
                <span style={{ fontSize:12, color:'var(--t3)', fontWeight:500 }}>{r.label}</span>
                <span style={{ fontSize:13, color:'var(--t1)' }}>{r.value}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop:16 }}>
            <Link href="/profile/settings" style={{ fontSize:13, color:'var(--orange)' }}>Edit settings →</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
