// src/app/player/[steam_id]/page.tsx
// Server component que obtiene datos via API route interna
// Funciona tanto en dev local (homelab) como en Vercel (rewrite → homelab)
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { PlayerTabs } from './PlayerTabs'

type Props = { params: Promise<{ steam_id: string }> }

export const dynamic = 'force-dynamic'

async function getPlayerData(steamId: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  try {
    const res = await fetch(`${base}/api/player/${steamId}`, {
      cache: 'no-store',
    })
    if (res.status === 404) return null
    if (!res.ok) return null
    const json = await res.json()
    return json.data ?? null
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { steam_id } = await params
  const data = await getPlayerData(steam_id)
  return { title: data?.stats?.nombre_usuario_steam ?? steam_id }
}

export default async function PlayerProfilePage({ params }: Props) {
  const { steam_id } = await params
  if (!/^\d{17}$/.test(steam_id)) notFound()

  const data = await getPlayerData(steam_id)
  if (!data) notFound()

  return (
    <div style={{ display:'grid', gridTemplateColumns:'200px 1fr', gap:16, alignItems:'start' }}>
      <Sidebar stats={data.stats} rankHistory={data.rankHistory ?? []} />
      <PlayerTabs data={data} />
    </div>
  )
}

function Sidebar({ stats, rankHistory }: { stats: any; rankHistory: any[] }) {
  const premiers = rankHistory.filter(r => r.tipo_ranking === 'PREMIERE')
  const maps     = rankHistory.filter(r => r.tipo_ranking === 'MAPA')

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
      {/* Avatar + nombre */}
      <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
        <div style={{ width:64, height:64, borderRadius:4, background:'var(--bg-border)',
                      display:'flex', alignItems:'center', justifyContent:'center', fontSize:28 }}>
          🎮
        </div>
        <div>
          <div style={{ fontFamily:'Rajdhani,sans-serif', fontSize:18, fontWeight:700, color:'var(--t1)' }}>
            {stats.nombre_usuario_steam}
          </div>
          {stats.region_geografica && (
            <div style={{ fontSize:11, color:'var(--t3)', marginTop:2 }}>
              📍 {stats.region_geografica}
            </div>
          )}
        </div>
      </div>

      {/* CS2 label */}
      <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', color:'var(--t3)',
                    marginBottom:6, paddingBottom:4, borderBottom:'1px solid var(--bg-border)' }}>
        CS2
      </div>

      {/* Premier rankings */}
      {premiers.slice(0,6).map((r, i) => (
        <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                               padding:'5px 0', borderBottom:'1px solid #191c28' }}>
          <span style={{ fontSize:10, background:'#1a2040', color:'#818cf8',
                          padding:'1px 6px', borderRadius:3, fontWeight:700 }}>
            PREMIER
          </span>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--orange)',
                           fontFamily:'IBM Plex Mono,monospace' }}>
              {r.puntos_elo?.toLocaleString()}
            </div>
            <div style={{ fontSize:10, color:'var(--t3)' }}>
              Wins: {r.victorias_mapa ?? '—'}
            </div>
          </div>
        </div>
      ))}

      {/* Map rankings */}
      {maps.slice(0,8).map((r, i) => (
        <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                               padding:'5px 0', borderBottom:'1px solid #191c28' }}>
          <span style={{ fontSize:11, color:'var(--t2)' }}>{r.nombre_mapa ?? 'Mapa'}</span>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:11, color:'var(--t1)', fontFamily:'IBM Plex Mono,monospace' }}>
              {r.tier}
            </div>
            <div style={{ fontSize:10, color:'var(--t3)' }}>Wins: {r.victorias_mapa ?? '—'}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
