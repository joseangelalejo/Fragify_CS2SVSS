import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native'
import { useRouter } from 'expo-router'
import { apiFetch } from '../../lib/api'

const C = {
  bg: '#0b0c10', card: '#111318', border: '#1e2029',
  orange: '#f97316', t1: '#f1f5f9', t2: '#94a3b8', t3: '#475569',
  green: '#22c55e', red: '#ef4444',
}

type Match = {
  id_partida: number; steam_id: string; username: string; avatar?: string
  mapa: string; modo: string; resultado: string; kills: number
  muertes: number; asistencias: number; fecha: string; hs_percent?: number
}

export default function MatchesTab() {
  const router = useRouter()
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [modeFilter, setModeFilter] = useState<'ALL' | 'COMPETITIVO' | 'WINGMAN'>('ALL')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  async function load(reset = false) {
    const p = reset ? 1 : page
    if (!reset) setLoadingMore(true)
    try {
      const mode = modeFilter !== 'ALL' ? `&mode=${modeFilter}` : ''
      const res = await apiFetch(`/api/matches?page=${p}&limit=20${mode}`)
      if (res.ok) {
        const data = await res.json()
        const newMatches = data.matches ?? data ?? []
        setMatches(prev => reset ? newMatches : [...prev, ...newMatches])
        setHasMore(newMatches.length === 20)
        setPage(p + 1)
      }
    } catch {}
    setLoading(false)
    setLoadingMore(false)
  }

  useEffect(() => {
    setLoading(true)
    setPage(1)
    setMatches([])
    load(true)
  }, [modeFilter])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    setPage(1)
    await load(true)
    setRefreshing(false)
  }, [modeFilter])

  function renderMatch({ item }: { item: Match }) {
    const won = item.resultado === 'VICTORIA' || item.resultado === 'WIN'
    const date = item.fecha ? new Date(item.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''
    return (
      <TouchableOpacity
        style={styles.matchRow}
        onPress={() => router.push(`/player/${item.steam_id}`)}
        activeOpacity={0.7}
      >
        <View style={[styles.resultBar, { backgroundColor: won ? C.green : C.red }]} />
        <View style={{ flex: 1, padding: 12 }}>
          <View style={styles.matchTop}>
            <Text style={styles.mapName}>{item.mapa}</Text>
            <Text style={[styles.resultBadge, { color: won ? C.green : C.red }]}>
              {won ? 'V' : 'D'}
            </Text>
          </View>
          <Text style={styles.playerName}>{item.username}</Text>
          <View style={styles.matchBottom}>
            <Text style={styles.kda}>
              {item.kills}K / {item.muertes}D / {item.asistencias}A
              {item.hs_percent ? ` · HS ${item.hs_percent.toFixed(0)}%` : ''}
            </Text>
            <Text style={styles.date}>{date}</Text>
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.root}>
      {/* Mode filter */}
      <View style={styles.filterRow}>
        {(['ALL', 'COMPETITIVO', 'WINGMAN'] as const).map(m => (
          <TouchableOpacity
            key={m}
            style={[styles.filterBtn, modeFilter === m && styles.filterBtnActive]}
            onPress={() => setModeFilter(m)}
          >
            <Text style={[styles.filterText, modeFilter === m && { color: C.orange }]}>
              {m === 'ALL' ? 'Todas' : m === 'COMPETITIVO' ? '5v5' : '2v2'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading
        ? <View style={styles.center}><ActivityIndicator color={C.orange} size="large" /></View>
        : <FlatList
            data={matches}
            keyExtractor={item => String(item.id_partida)}
            renderItem={renderMatch}
            contentContainerStyle={{ padding: 12 }}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.orange} />}
            onEndReached={() => { if (hasMore && !loadingMore) load() }}
            onEndReachedThreshold={0.4}
            ListFooterComponent={loadingMore ? <ActivityIndicator color={C.orange} style={{ marginVertical: 16 }} /> : null}
            ListEmptyComponent={<Text style={{ color: C.t3, textAlign: 'center', marginTop: 32 }}>Sin partidas</Text>}
          />
      }
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  filterRow: { flexDirection: 'row', padding: 12, gap: 8, borderBottomWidth: 1, borderColor: C.border },
  filterBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6, borderWidth: 1, borderColor: C.border },
  filterBtnActive: { borderColor: C.orange, backgroundColor: 'rgba(249,115,22,0.08)' },
  filterText: { color: C.t3, fontWeight: '600', fontSize: 13 },
  matchRow: { flexDirection: 'row', backgroundColor: C.card, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: C.border },
  resultBar: { width: 4 },
  matchTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mapName: { color: C.t1, fontWeight: '700', fontSize: 14 },
  resultBadge: { fontWeight: '900', fontSize: 16 },
  playerName: { color: C.t3, fontSize: 12, marginTop: 2 },
  matchBottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  kda: { color: C.t2, fontSize: 12 },
  date: { color: C.t3, fontSize: 11 },
})
