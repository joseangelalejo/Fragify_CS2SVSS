// src/app/player/[steam_id]/page.tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { PlayerStats, MatchHistory, EloSnapshot } from '@/lib/types'

type Props = { params: Promise<{ steam_id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { steam_id } = await params
  return { title: `Jugador ${steam_id}` }
}

async function getPlayer(steamId: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/player/${steamId}`,
    { next: { revalidate: 30 } }
  )
  if (res.status === 404) return null
  if (!res.ok) throw new Error('Error al cargar jugador')
  return res.json() as Promise<{
    data: {
      stats: PlayerStats
      matches: MatchHistory[]
      eloHistory: EloSnapshot[]
      ranking: { puntos_elo: number; tier: string; posicion_global: number | null } | null
    }
  }>
}

export default async function PlayerPage({ params }: Props) {
  const { steam_id } = await params

  if (!/^\d{17}$/.test(steam_id)) notFound()

  const result = await getPlayer(steam_id).catch(() => null)
  if (!result) notFound()

  const { stats, matches, ranking } = result.data

  return (
    <div className="space-y-8">
      {/* Header del jugador */}
      <div className="card flex items-center gap-6">
        <div className="w-16 h-16 rounded-full bg-surface-600 flex items-center justify-center text-2xl">
          🎮
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{stats.nombre_usuario_steam}</h1>
          <p className="text-zinc-500 font-mono text-sm">{stats.steam_id64}</p>
          {stats.region_geografica && (
            <span className="text-xs text-zinc-400 mt-1">
              📍 {stats.region_geografica}
            </span>
          )}
        </div>
        {ranking && (
          <div className="text-right">
            <p className="text-3xl font-bold text-brand-500 font-mono">
              {ranking.puntos_elo.toLocaleString()}
            </p>
            <p className="text-zinc-400 text-sm">{ranking.tier} · PREMIER</p>
            {ranking.posicion_global && (
              <p className="text-zinc-500 text-xs">#{ranking.posicion_global} global</p>
            )}
          </div>
        )}
      </div>

      {/* Stats generales */}
      <div>
        <h2 className="text-lg font-semibold mb-3 text-zinc-300">Estadísticas globales</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'K/D Ratio',   value: stats.kd_ratio?.toFixed(2) ?? '—' },
            { label: 'Kills',       value: stats.kills?.toLocaleString() ?? '—' },
            { label: 'Headshots %', value: stats.ratio_headshots ? `${stats.ratio_headshots}%` : '—' },
            { label: 'Winrate',     value: `${stats.porcentaje_victorias ?? 0}%` },
            { label: 'Partidas',    value: stats.total_partidas_jugadas?.toLocaleString() ?? '—' },
            { label: 'MVPs',        value: stats.mvps?.toLocaleString() ?? '—' },
            { label: 'ADR',         value: stats.dano_promedio_ronda?.toFixed(1) ?? '—' },
            { label: 'Precisión',   value: stats.precision_disparo ? `${stats.precision_disparo}%` : '—' },
          ].map((s) => (
            <div key={s.label} className="card text-center">
              <p className="text-xl font-bold text-zinc-100">{s.value}</p>
              <p className="text-xs text-zinc-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Últimas partidas */}
      <div>
        <h2 className="text-lg font-semibold mb-3 text-zinc-300">Últimas partidas</h2>
        {matches.length === 0 ? (
          <div className="card text-center py-8 text-zinc-500">Sin partidas registradas</div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-600 text-zinc-500 text-left">
                  <th className="pb-3 pr-4">Fecha</th>
                  <th className="pb-3 pr-4">Mapa</th>
                  <th className="pb-3 pr-4">Resultado</th>
                  <th className="pb-3 pr-4 text-right">K/D/A</th>
                  <th className="pb-3 text-right">ADR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700">
                {matches.map((m) => (
                  <tr key={`${m.id_partida}-${m.steam_id64}`}
                      className="hover:bg-surface-700 transition-colors">
                    <td className="py-2 pr-4 text-zinc-500 text-xs">
                      {new Date(m.fecha_partida).toLocaleDateString('es-ES')}
                    </td>
                    <td className="py-2 pr-4 font-medium">{m.mapa}</td>
                    <td className="py-2 pr-4">
                      <span className={`badge ${
                        m.resultado === 'VICTORIA'
                          ? 'bg-green-900 text-green-400'
                          : m.resultado === 'EMPATE'
                          ? 'bg-zinc-700 text-zinc-400'
                          : 'bg-red-900 text-red-400'
                      }`}>
                        {m.resultado}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-right font-mono text-sm">
                      {m.kills}/{m.deaths}/{m.assists}
                    </td>
                    <td className="py-2 text-right text-zinc-400">
                      {m.dano_total > 0 ? Math.round(m.dano_total / 24) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
