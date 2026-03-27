import Link from 'next/link'
import { query } from '@/lib/db'

async function getStats() {
  try {
    const [[r]] = await query<[{players:number,matches:number,reports:number}]>(`
      SELECT
        (SELECT COUNT(*) FROM jugadores_cs2)   AS players,
        (SELECT COUNT(*) FROM partidas_cs2)    AS matches,
        (SELECT COUNT(*) FROM reportes_conducta) AS reports
    `)
    return r
  } catch {
    return { players: 0, matches: 0, reports: 0 }
  }
}

function fmt(n: number) {
  if (n >= 1e6) return (n/1e6).toFixed(1)+'M'
  if (n >= 1e3) return (n/1e3).toFixed(1)+'K'
  return n.toString()
}

export default async function HomePage() {
  const stats = await getStats()

  return (
    <div>
      {/* ── Hero ── */}
      <div style={{ textAlign:'center', padding:'48px 16px 40px' }}>
        <h1 style={{ fontFamily:'Rajdhani,sans-serif', fontSize:48, fontWeight:700, letterSpacing:'0.06em', marginBottom:12 }}>
          CS2 <span style={{ color:'var(--orange)' }}>STATS</span>
        </h1>
        <p style={{ color:'var(--t2)', fontSize:15, maxWidth:500, margin:'0 auto 24px' }}>
          Track your CS2 stats in Competitive and Premier matchmaking.
          Search any player, or just add{' '}
          <code style={{ color:'var(--orange)', fontSize:13 }}>x</code> to the start of any steamcommunity.com URL.
        </p>

        {/* Search */}
        <form action="/player" method="get"
              style={{ display:'flex', gap:8, maxWidth:560, margin:'0 auto 16px', alignItems:'center' }}>
          <input
            name="q"
            placeholder="Search for a player (Steam ID / Steam Profile Link / Custom Steam URL)"
            style={{
              flex:1, background:'#0d0e13', border:'1px solid var(--bg-border)',
              borderRadius:6, padding:'10px 14px', fontSize:13, color:'var(--t1)', outline:'none'
            }}
          />
          <button type="submit"
                  style={{ background:'var(--orange)', color:'#fff', fontWeight:700, fontSize:13,
                           padding:'10px 20px', borderRadius:6, border:'none', cursor:'pointer',
                           whiteSpace:'nowrap' }}>
            Search
          </button>
        </form>
        <p style={{ color:'var(--t3)', fontSize:12 }}>
          Or{' '}
          <Link href="/player" style={{ color:'var(--orange)' }}>
            view your profile
          </Link>
        </p>
      </div>

      {/* ── Global counters ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:24, maxWidth:600, margin:'0 auto 56px' }}>
        {[
          { value: fmt(stats.matches), label: 'MATCHES PROCESSED', icon:'🎮' },
          { value: fmt(stats.players), label: 'PLAYERS SEEN',       icon:'👤' },
          { value: fmt(stats.reports), label: 'REPORTS TRACKED',    icon:'🚩' },
        ].map(s => (
          <div key={s.label} style={{ textAlign:'center' }}>
            <div style={{ fontSize:32, fontFamily:'Rajdhani,sans-serif', fontWeight:700, color:'var(--t1)' }}>
              {s.value}
            </div>
            <div style={{ fontSize:10, letterSpacing:'0.1em', color:'var(--t3)', marginTop:2 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* ── Features ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:32, maxWidth:960, margin:'0 auto' }}>
        {[
          {
            tag: 'PROFILES',
            title: 'Competitive Stats Profiles',
            desc: 'The only CS2 stat profile based on official Valve Matchmaking games. Stats do not include data from deathmatch, nor training maps.',
            link: '/player', cta: 'View stats →',
          },
          {
            tag: 'LEADERBOARDS',
            title: 'Premier & Competitive Rankings',
            desc: 'See where you rank globally in Premier ELO or by individual map in Competitive mode. Updated in real time.',
            link: '/ranking', cta: 'View leaderboards →',
          },
          {
            tag: 'MATCH HISTORY',
            title: 'Detailed Match History',
            desc: 'Full kill/death/assist breakdown, ADR, HS% and clutch stats for every match. Filter by map, mode or date range.',
            link: '/matches', cta: 'View all matches →',
          },
        ].map(f => (
          <div key={f.title}>
            <div style={{ fontSize:10, fontWeight:600, letterSpacing:'0.12em', color:'var(--orange)', marginBottom:8 }}>
              {f.tag}
            </div>
            <h2 style={{ fontSize:22, marginBottom:10, color:'var(--t1)' }}>{f.title}</h2>
            <p style={{ color:'var(--t2)', lineHeight:1.7, marginBottom:14, fontSize:13 }}>{f.desc}</p>
            <Link href={f.link} style={{ color:'var(--orange)', fontSize:13, fontWeight:500 }}>
              {f.cta}
            </Link>
          </div>
        ))}
      </div>

      {/* ── CTA bottom ── */}
      <div style={{ textAlign:'center', padding:'64px 16px 16px' }}>
        <h2 style={{ fontSize:32, marginBottom:16 }}>Get Started Now</h2>
        <p style={{ color:'var(--t2)', marginBottom:24, fontSize:14 }}>
          Start tracking your CS2 stats now. Search any player by Steam ID to see their full profile.
        </p>
        <Link href="/player"
              style={{ background:'var(--orange)', color:'#fff', fontWeight:700, padding:'12px 32px',
                       borderRadius:6, fontSize:14, display:'inline-block' }}>
          Find a Player
        </Link>
      </div>
    </div>
  )
}
