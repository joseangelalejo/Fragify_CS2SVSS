'use client'
import { useEffect, useState } from 'react'

const S = {
  card:  { background:'var(--bg-card)', border:'1px solid var(--bg-border)', borderRadius:12, padding:24 },
  title: { fontSize:12, fontWeight:600, letterSpacing:'0.08em', color:'var(--t3)', marginBottom:16 },
  stat:  { textAlign:'center' as const },
  num:   { fontSize:36, fontFamily:'Rajdhani,sans-serif', fontWeight:700, color:'var(--t1)' },
  lbl:   { fontSize:11, color:'var(--t3)', letterSpacing:'0.08em', marginTop:4 },
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    fetch('/api/admin/stats').then(r => r.json()).then(setStats)
  }, [])

  return (
    <div>
      <h2 style={{ fontSize:24, marginBottom:24, fontFamily:'Rajdhani,sans-serif' }}>Dashboard</h2>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:16, marginBottom:24 }}>
        {[
          { label:'TOTAL USERS',       value: stats?.users           ?? '—' },
          { label:'PLAYERS',           value: stats?.players         ?? '—' },
          { label:'OPEN TICKETS',      value: stats?.tickets         ?? '—' },
          { label:'RANKINGS',          value: stats?.rankings        ?? '—' },
          { label:'REPORTS PENDING',   value: stats?.reports_pending ?? '—' },
        ].map(s => (
          <div key={s.label} style={S.card}>
            <div style={S.stat}>
              <div style={S.num}>{s.value}</div>
              <div style={S.lbl}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={S.card}>
        <div style={S.title}>RECENT REGISTRATIONS</div>
        {stats?.recent?.length > 0 ? (
          <table style={{ width:'100%', fontSize:13, borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ borderBottom:'1px solid var(--bg-border)' }}>
                {['Username','Email','Registered','Steam'].map(h => (
                  <th key={h} style={{ textAlign:'left', padding:'8px 12px', fontSize:11, color:'var(--t3)', fontWeight:500, letterSpacing:'0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.recent.map((u: any) => (
                <tr key={u.id_usuario} style={{ borderBottom:'1px solid #191c28' }}>
                  <td style={{ padding:'9px 12px' }}>{u.username ?? '—'}</td>
                  <td style={{ padding:'9px 12px', color:'var(--t2)' }}>{u.email ?? '—'}</td>
                  <td style={{ padding:'9px 12px', color:'var(--t3)', fontSize:12 }}>{new Date(u.fecha_registro).toLocaleDateString()}</td>
                  <td style={{ padding:'9px 12px' }}>
                    {u.steam_linked ? <span style={{ color:'var(--green)', fontSize:11 }}>✓ Linked</span> : <span style={{ color:'var(--t3)', fontSize:11 }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color:'var(--t3)', fontSize:13 }}>No recent registrations.</p>
        )}
      </div>
    </div>
  )
}
