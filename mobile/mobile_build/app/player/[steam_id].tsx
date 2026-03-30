import React, { useEffect, useState } from 'react'
import {
  View, Text, Image, ScrollView, StyleSheet,
  ActivityIndicator, TouchableOpacity,
} from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { apiFetch } from '../../lib/api'

const C = {
  bg: '#0b0c10', card: '#111318', border: '#1e2029',
  orange: '#f97316', t1: '#f1f5f9', t2: '#94a3b8', t3: '#475569',
  green: '#22c55e', red: '#ef4444',
}

type PlayerData = {
  username: string; avatar: string | null; steam_id: string
  kd_ratio: number; hs_percent: number; win_rate: number
  total_kills: number; total_deaths: number; total_matches: number
  avg_damage: number; premier_rating: number | null
  map_stats?: { mapa: string; partidas: number; victorias: number; kd: number }[]
}

function StatBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, color ? { color } : {}]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

export default function PlayerScreen() {
  const { steam_id } = useLocalSearchParams<{ steam_id: string }>()
  const [player, setPlayer] = useState<PlayerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [matches, setMatches] = useState<any[]>([])
  const [modeFilter, setModeFilter] = useState<'ALL' | '5v5' | '2v2'>('ALL')

  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch(`/api/player/${steam_id}/stats`)
        if (res.ok) setPlayer(await res.json())
      } catch {}
      setLoading(false)
    }
    load()
  }, [steam_id])

  useEffect(() => {
    async function loadMatches() {
      const mode = modeFilter === 'ALL' ? '' : `?mode=${modeFilter === '5v5' ? 'COMPETITIVO' : 'WINGMAN'}`
      try {
        const res = await apiFetch(`/api/player/${steam_id}/matches${mode}`)
        if (res.ok) {
          const data = await res.json()
          setMatches(data.matches ?? data ?? [])
        }
      } catch {}
    }
    if (player) loadMatches()
  }, [player, modeFilter, steam_id])

  if (loading) return <View style={styles.center}><ActivityIndicator color={C.orange} size="large" /></View>
  if (!player) return <View style={styles.center}><Text style={{ color: C.t2 }}>Jugador no encontrado</Text></View>

  const kdColor = player.kd_ratio >= 1.2 ? C.green : player.kd_ratio < 0.9 ? C.red : C.t1

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 32 }}>
      {/* Header */}
      <View style={styles.header}>
        <Image
          source={{ uri: player.avatar ?? `https://api.dicebear.com/7.x/identicon/png?seed=${steam_id}` }}
          style={styles.avatar}
        />
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={styles.username}>{player.username}</Text>
          {player.premier_rating && (
            <Text style={styles.rating}>⭐ {player.premier_rating.toLocaleString()} Premier</Text>
          )}
          <Text style={styles.steamId}>{steam_id}</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>ESTADÍSTICAS</Text>
        <View style={styles.grid}>
          <StatBox label="K/D" value={player.kd_ratio?.toFixed(2) ?? '-'} color={kdColor} />
          <StatBox label="HS%" value={`${player.hs_percent?.toFixed(1) ?? '-'}%`} />
          <StatBox label="Win Rate" value={`${player.win_rate?.toFixed(1) ?? '-'}%`} color={C.green} />
          <StatBox label="Partidas" value={String(player.total_matches ?? '-')} />
          <StatBox label="Kills" value={player.total_kills?.toLocaleString() ?? '-'} />
          <StatBox label="Avg DMG" value={player.avg_damage?.toFixed(0) ?? '-'} />
        </View>
      </View>

      {/* Map performance */}
      {player.map_stats && player.map_stats.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>RENDIMIENTO POR MAPA</Text>
          {player.map_stats.map(m => {
            const wr = m.partidas > 0 ? (m.victorias / m.partidas * 100).toFixed(0) : '0'
            const wrNum = parseFloat(wr)
            return (
              <View key={m.mapa} style={styles.mapRow}>
                <Text style={styles.mapName}>{m.mapa}</Text>
                <View style={styles.mapBar}>
                  <View style={[styles.mapFill, { width: `${Math.min(wrNum, 100)}%`, backgroundColor: wrNum >= 50 ? C.green : C.red }]} />
                </View>
                <Text style={styles.mapWr}>{wr}%</Text>
                <Text style={styles.mapMatches}>{m.partidas}p</Text>
              </View>
            )
          })}
        </View>
      )}

      {/* Match history */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>ÚLTIMAS PARTIDAS</Text>
        <View style={styles.modeRow}>
          {(['ALL', '5v5', '2v2'] as const).map(m => (
            <TouchableOpacity
              key={m}
              style={[styles.modeBtn, modeFilter === m && styles.modeBtnActive]}
              onPress={() => setModeFilter(m)}
            >
              <Text style={[styles.modeBtnText, modeFilter === m && { color: C.orange }]}>{m}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {matches.slice(0, 20).map((m, i) => {
          const won = m.resultado === 'VICTORIA' || m.resultado === 'WIN'
          return (
            <View key={i} style={[styles.matchRow, { borderLeftColor: won ? C.green : C.red }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.matchMap}>{m.mapa ?? '?'}</Text>
                <Text style={styles.matchMode}>{m.modo ?? ''}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: won ? C.green : C.red, fontWeight: '800' }}>{m.resultado}</Text>
                <Text style={styles.matchKda}>{m.kills}K/{m.muertes}D/{m.asistencias}A</Text>
              </View>
            </View>
          )
        })}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: C.card, borderBottomWidth: 1, borderColor: C.border },
  avatar: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: C.orange },
  username: { color: C.t1, fontSize: 22, fontWeight: '800' },
  rating: { color: C.orange, fontSize: 13, fontWeight: '700', marginTop: 4 },
  steamId: { color: C.t3, fontSize: 10, marginTop: 4 },
  card: { backgroundColor: C.card, margin: 16, marginBottom: 0, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: C.border },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: C.t3, marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statBox: { flex: 1, minWidth: '28%', backgroundColor: '#0d0e13', borderRadius: 8, padding: 12, alignItems: 'center' },
  statValue: { color: C.t1, fontSize: 22, fontWeight: '800' },
  statLabel: { color: C.t3, fontSize: 10, marginTop: 4 },
  mapRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  mapName: { color: C.t2, fontSize: 12, width: 90 },
  mapBar: { flex: 1, height: 6, backgroundColor: '#0d0e13', borderRadius: 3, overflow: 'hidden' },
  mapFill: { height: '100%', borderRadius: 3 },
  mapWr: { color: C.t1, fontSize: 12, fontWeight: '700', width: 36, textAlign: 'right' },
  mapMatches: { color: C.t3, fontSize: 11, width: 28, textAlign: 'right' },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  modeBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: C.border },
  modeBtnActive: { borderColor: C.orange, backgroundColor: 'rgba(249,115,22,0.08)' },
  modeBtnText: { color: C.t3, fontSize: 12, fontWeight: '600' },
  matchRow: { flexDirection: 'row', padding: 10, borderLeftWidth: 3, backgroundColor: '#0d0e13', borderRadius: 6, marginBottom: 6 },
  matchMap: { color: C.t1, fontWeight: '700', fontSize: 13 },
  matchMode: { color: C.t3, fontSize: 11, marginTop: 2 },
  matchKda: { color: C.t2, fontSize: 11, marginTop: 2 },
})
