import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, Image, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '../../lib/auth'
import { apiFetch } from '../../lib/api'

const C = {
  bg: '#0b0c10', card: '#111318', border: '#1e2029',
  orange: '#f97316', t1: '#f1f5f9', t2: '#94a3b8', t3: '#475569',
  green: '#22c55e', red: '#ef4444',
}

type Stats = {
  steam_id: string; username: string; avatar: string | null
  kd_ratio: number; hs_percent: number; win_rate: number
  total_kills: number; total_deaths: number; total_matches: number
  avg_damage: number; premier_rating: number | null
}

function StatBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, color ? { color } : {}]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

export default function ProfileTab() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [modeFilter, setModeFilter] = useState<'ALL' | '5v5' | '2v2'>('ALL')
  const [matches, setMatches] = useState<any[]>([])
  const [matchLoading, setMatchLoading] = useState(false)

  async function loadStats() {
    try {
      const res = await apiFetch('/api/profile/stats')
      if (res.ok) setStats(await res.json())
    } catch {}
    setLoading(false)
  }

  async function loadMatches() {
    setMatchLoading(true)
    try {
      const mode = modeFilter === 'ALL' ? '' : `?mode=${modeFilter === '5v5' ? 'COMPETITIVO' : 'WINGMAN'}`
      const res = await apiFetch(`/api/matches/my${mode}`)
      if (res.ok) {
        const data = await res.json()
        setMatches(data.matches ?? data ?? [])
      }
    } catch {}
    setMatchLoading(false)
  }

  useEffect(() => { loadStats() }, [])
  useEffect(() => { if (stats) loadMatches() }, [modeFilter, stats])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadStats()
    await loadMatches()
    setRefreshing(false)
  }, [])

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator color={C.orange} size="large" />
    </View>
  )

  if (!stats) return (
    <View style={styles.center}>
      <Text style={{ color: C.t2 }}>No se encontraron estadísticas.</Text>
      <Text style={{ color: C.t3, fontSize: 12, marginTop: 8 }}>¿Tienes partidas importadas?</Text>
    </View>
  )

  const kdColor = stats.kd_ratio >= 1.2 ? C.green : stats.kd_ratio < 0.9 ? C.red : C.t1

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.orange} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Image
          source={{ uri: stats.avatar ?? `https://api.dicebear.com/7.x/identicon/png?seed=${stats.steam_id}` }}
          style={styles.avatar}
        />
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={styles.username}>{stats.username}</Text>
          {stats.premier_rating && (
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>⭐ {stats.premier_rating.toLocaleString()}</Text>
            </View>
          )}
          <Text style={styles.steamId}>Steam ID: {stats.steam_id}</Text>
        </View>
        <TouchableOpacity onPress={signOut} style={styles.signOutBtn}>
          <Text style={{ color: C.t3, fontSize: 12 }}>Salir</Text>
        </TouchableOpacity>
      </View>

      {/* Stats grid */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>ESTADÍSTICAS GENERALES</Text>
        <View style={styles.statsGrid}>
          <StatBox label="K/D" value={stats.kd_ratio?.toFixed(2) ?? '-'} color={kdColor} />
          <StatBox label="HS%" value={`${stats.hs_percent?.toFixed(1) ?? '-'}%`} />
          <StatBox label="Win Rate" value={`${stats.win_rate?.toFixed(1) ?? '-'}%`} color={C.green} />
          <StatBox label="Partidas" value={String(stats.total_matches ?? '-')} />
          <StatBox label="Kills" value={stats.total_kills?.toLocaleString() ?? '-'} />
          <StatBox label="Avg DMG" value={stats.avg_damage?.toFixed(0) ?? '-'} />
        </View>
      </View>

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
        {matchLoading
          ? <ActivityIndicator color={C.orange} style={{ marginTop: 20 }} />
          : matches.length === 0
            ? <Text style={{ color: C.t3, textAlign: 'center', marginTop: 16 }}>Sin partidas</Text>
            : matches.slice(0, 20).map((m, i) => <MatchRow key={i} match={m} />)
        }
      </View>
    </ScrollView>
  )
}

function MatchRow({ match }: { match: any }) {
  const won = match.resultado === 'VICTORIA' || match.resultado === 'WIN'
  const date = match.fecha ? new Date(match.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : ''
  return (
    <View style={[matchStyles.row, { borderLeftColor: won ? '#22c55e' : '#ef4444' }]}>
      <View style={{ flex: 1 }}>
        <Text style={matchStyles.map}>{match.mapa ?? match.map ?? '?'}</Text>
        <Text style={matchStyles.mode}>{match.modo ?? match.mode ?? ''} · {date}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[matchStyles.result, { color: won ? '#22c55e' : '#ef4444' }]}>
          {match.resultado ?? (won ? 'W' : 'L')}
        </Text>
        <Text style={matchStyles.score}>{match.kills ?? '-'}K · {match.muertes ?? '-'}D · {match.asistencias ?? '-'}A</Text>
      </View>
    </View>
  )
}

const matchStyles = StyleSheet.create({
  row: { flexDirection: 'row', padding: 10, borderLeftWidth: 3, backgroundColor: '#0d0e13', borderRadius: 6, marginBottom: 6 },
  map: { color: '#f1f5f9', fontWeight: '700', fontSize: 13 },
  mode: { color: '#475569', fontSize: 11, marginTop: 2 },
  result: { fontWeight: '800', fontSize: 13 },
  score: { color: '#94a3b8', fontSize: 11, marginTop: 2 },
})

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: C.card, borderBottomWidth: 1, borderColor: C.border },
  avatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: C.orange },
  username: { color: C.t1, fontSize: 20, fontWeight: '800' },
  steamId: { color: C.t3, fontSize: 10, marginTop: 4 },
  ratingBadge: { backgroundColor: 'rgba(249,115,22,0.15)', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 4 },
  ratingText: { color: C.orange, fontSize: 12, fontWeight: '700' },
  signOutBtn: { padding: 8 },
  card: { backgroundColor: C.card, margin: 16, marginBottom: 0, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: C.border },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: C.t3, marginBottom: 14 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statBox: { flex: 1, minWidth: '28%', backgroundColor: '#0d0e13', borderRadius: 8, padding: 12, alignItems: 'center' },
  statValue: { color: C.t1, fontSize: 22, fontWeight: '800' },
  statLabel: { color: C.t3, fontSize: 10, marginTop: 4, fontWeight: '600' },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  modeBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: C.border },
  modeBtnActive: { borderColor: C.orange, backgroundColor: 'rgba(249,115,22,0.08)' },
  modeBtnText: { color: C.t3, fontSize: 12, fontWeight: '600' },
})
