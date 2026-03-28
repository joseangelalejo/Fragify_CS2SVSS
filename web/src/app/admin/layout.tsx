'use client'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'

const LINKS = [
  { href: '/admin/dashboard', label: 'Dashboard',  icon: '📊' },
  { href: '/admin/support',   label: 'Support',     icon: '🎫' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router   = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (status === 'loading') return
    if (!session || (session.user as any)?.role !== 'ADMIN')
      router.push('/')
  }, [status, session, router])

  if (status === 'loading') return (
    <div style={{ minHeight:'60vh', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--t2)' }}>
      Loading...
    </div>
  )
  if (!session || (session.user as any)?.role !== 'ADMIN') return null

  return (
    <div style={{ display:'grid', gridTemplateColumns:'200px 1fr', gap:32, alignItems:'start' }}>
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--bg-border)', borderRadius:12, overflow:'hidden', position:'sticky', top:80 }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--bg-border)' }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.1em', color:'var(--orange)' }}>ADMIN PANEL</div>
        </div>
        <nav style={{ padding:'8px 0' }}>
          {LINKS.map(l => {
            const active = pathname === l.href
            return (
              <Link key={l.href} href={l.href} style={{
                display:'flex', alignItems:'center', gap:10, padding:'10px 20px',
                fontSize:13, color: active ? 'var(--t1)' : 'var(--t2)',
                background: active ? 'var(--bg-hover)' : 'transparent',
                borderLeft: active ? '3px solid var(--orange)' : '3px solid transparent',
                textDecoration:'none',
              }}>
                <span>{l.icon}</span>{l.label}
              </Link>
            )
          })}
        </nav>
      </div>
      <div>{children}</div>
    </div>
  )
}
