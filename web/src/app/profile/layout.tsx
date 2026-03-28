'use client'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useEffect } from 'react'

const LINKS = [
  { href: '/profile',          label: 'Your Profile',   icon: '👤' },
  { href: '/profile/settings', label: 'Settings',       icon: '⚙️' },
  { href: '/profile/steam',    label: 'Steam & CS2',    icon: '🎮' },
  { href: '/profile/security', label: 'Security',       icon: '🔒' },
]

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router   = useRouter()
  const pathname = usePathname()

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
    <div style={{ display:'grid', gridTemplateColumns:'220px 1fr', gap:32, alignItems:'start', maxWidth:960, margin:'0 auto' }}>
      {/* Sidebar */}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--bg-border)', borderRadius:12, overflow:'hidden', position:'sticky', top:80 }}>
        {/* Avatar */}
        <div style={{ padding:'24px 20px', borderBottom:'1px solid var(--bg-border)', textAlign:'center' }}>
          <div style={{ width:64, height:64, borderRadius:'50%', overflow:'hidden', margin:'0 auto 12px', background:'var(--bg-border)' }}>
            {user.image
              ? <img src={user.image} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>👤</div>
            }
          </div>
          <div style={{ fontWeight:600, fontSize:14, color:'var(--t1)' }}>{user.name ?? 'User'}</div>
          <div style={{ fontSize:11, color:'var(--t3)', marginTop:2 }}>{user.email}</div>
        </div>

        {/* Nav */}
        <nav style={{ padding:'8px 0' }}>
          {LINKS.map(l => {
            const active = pathname === l.href
            return (
              <Link key={l.href} href={l.href} style={{
                display:'flex', alignItems:'center', gap:10, padding:'10px 20px',
                fontSize:13, color: active ? 'var(--t1)' : 'var(--t2)',
                background: active ? 'var(--bg-hover)' : 'transparent',
                borderLeft: active ? '3px solid var(--orange)' : '3px solid transparent',
                textDecoration:'none', transition:'all 0.15s',
              }}>
                <span>{l.icon}</span>{l.label}
              </Link>
            )
          })}
          <div style={{ borderTop:'1px solid var(--bg-border)', margin:'8px 0' }} />
          <Link href="/auth/signout" style={{
            display:'flex', alignItems:'center', gap:10, padding:'10px 20px',
            fontSize:13, color:'var(--t3)', textDecoration:'none',
          }}>
            <span>🚪</span>Sign out
          </Link>
        </nav>
      </div>

      {/* Content */}
      <div>{children}</div>
    </div>
  )
}
