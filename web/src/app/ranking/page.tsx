// src/app/ranking/page.tsx
import type { Metadata } from 'next'
import type { RankingEntry, ApiResponse } from '@/lib/types'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Ranking PREMIER' }
export const revalidate = 60 // ISR: revalidar cada 60s

async function getRanking(): Promise<RankingEntry[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/ranking?pageSize=100`,
      { next: { revalidate: 60 } }
    )
    if (!res.ok) return []
    const json: ApiResponse<RankingEntry[]> = await res.json()
    return json.data
  } catch {
    return []
  }
}

const TIER_COLORS: Record<string, string> = {
  Silver:  'text-zinc-400',
  Gold:    'text-yellow-400',
  Platinum:'text-cyan-400',
  Diamond: 'text-blue-400',
  Elite:   'text-purple-400',
  Supreme: 'text-red-400',
}

export default async function RankingPage() {
  const players = await getRanking()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Ranking PREMIER</h1>
        <p className="text-zinc-400 mt-1">
          Top jugadores por puntos ELO en modo Premier
        </p>
      </div>

      {players.length === 0 ? (
        <div className="card text-center py-16 text-zinc-500">
          No hay datos de ranking disponibles aún.
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-600 text-zinc-500 text-left">
                <th className="pb-3 pr-4 w-12">#</th>
                <th className="pb-3 pr-4">Jugador</th>
                <th className="pb-3 pr-4">Tier</th>
                <th className="pb-3 pr-4 text-right">ELO</th>
                <th className="pb-3 text-right">Región</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700">
              {players.map((p) => (
                <tr key={p.steam_id64} className="hover:bg-surface-700 transition-colors">
                  <td className="py-3 pr-4 font-mono text-zinc-500">
                    {p.ranking_posicion <= 3
                      ? ['🥇', '🥈', '🥉'][p.ranking_posicion - 1]
                      : p.ranking_posicion}
                  </td>
                  <td className="py-3 pr-4">
                    <Link
                      href={`/player/${p.steam_id64}`}
                      className="hover:text-brand-500 transition-colors font-medium"
                    >
                      {p.nombre_usuario_steam}
                    </Link>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`font-semibold ${TIER_COLORS[p.tier] ?? 'text-zinc-300'}`}>
                      {p.tier}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-right font-mono text-brand-500 font-semibold">
                    {p.puntos_elo.toLocaleString()}
                  </td>
                  <td className="py-3 text-right text-zinc-500 text-xs">
                    {p.region_geografica ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
