'use client'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'

const LINKS = [
  { href: '/profile',          label: 'Your Profile', icon: '👤' },
  { href: '/profile/settings', label: 'Settings',     icon: '⚙️' },
  { href: '/profile/steam',    label: 'Steam & CS2',  icon: '🎮' },
  { href: '/profile/security', label: 'Security',     icon: '🔒' },
  { href: '/profile/tickets',  label: 'My Tickets',   icon: '🎫' },
]

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router   = useRouter()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login')
  }, [status, router])

  if (status === 'loading') return (
    <div style={{ minHeight:'60vh', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--t2)' }}>
      Loading...
    </div>
  )
  if (!session) return null

  const user = session.user as any

  return (
    <div style={{ maxWidth:960, margin:'0 auto' }}>
      {/* Mobile header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16,
        padding:'12px 16px', background:'var(--bg-card)', border:'1px solid var(--bg-border)',
        borderRadius:12 }}>
        <div style={{ width:40, height:40, borderRadius:'50%', overflow:'hidden', background:'var(--bg-border)', flexShrink:0 }}>
          {user.image
            ? <img src={user.image} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>👤</div>
          }
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:600, fontSize:14, color:'var(--t1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user.name ?? 'User'}</div>
          {user.email && <div style={{ fontSize:11, color:'var(--t3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user.email}</div>}
        </div>
        <button onClick={() => setMenuOpen(o => !o)}
          style={{ background:'var(--bg-hover)', border:'1px solid var(--bg-border)', borderRadius:8,
            padding:'6px 12px', fontSize:12, color:'var(--t2)', cursor:'pointer', flexShrink:0,
            display:'none' }}
          className="mobile-menu-btn">
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Nav tabs - horizontal scroll on mobile */}
      <div style={{ display:'flex', gap:4, marginBottom:20, overflowX:'auto', paddingBottom:4 }}>
        {LINKS.map(l => {
          const active = pathname === l.href
          return (
            <Link key={l.href} href={l.href} style={{
              display:'flex', alignItems:'center', gap:6, padding:'8px 14px',
              fontSize:13, fontWeight:500, whiteSpace:'nowrap',
              color: active ? 'var(--t1)' : 'var(--t2)',
              background: active ? 'var(--orange)' : 'var(--bg-card)',
              border: `1px solid ${active ? 'var(--orange)' : 'var(--bg-border)'}`,
              borderRadius:8, textDecoration:'none', transition:'all 0.15s', flexShrink:0,
            }}>
              <span style={{ fontSize:14 }}>{l.icon}</span>
              <span style={{ display:'none' }} className="nav-label">{l.label}</span>
              <span className="nav-label-mobile">{l.label}</span>
            </Link>
          )
        })}
        <Link href="/auth/signout" style={{
          display:'flex', alignItems:'center', gap:6, padding:'8px 14px',
          fontSize:13, fontWeight:500, whiteSpace:'nowrap',
          color:'var(--t3)', background:'var(--bg-card)',
          border:'1px solid var(--bg-border)',
          borderRadius:8, textDecoration:'none', flexShrink:0,
        }}>
          <span style={{ fontSize:14 }}>🚪</span>
          <span className="nav-label-mobile">Sign out</span>
        </Link>
      </div>

      {/* Content */}
      <div>{children}</div>

      <style>{`
        .nav-label { display: inline !important; }
        .nav-label-mobile { display: none !important; }
        @media (max-width: 600px) {
          .nav-label { display: none !important; }
          .nav-label-mobile { display: inline !important; }
        }
      `}</style>
    </div>
  )
}
