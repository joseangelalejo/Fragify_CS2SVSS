import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Image, RefreshControl,
} from 'react-native'
import { useRouter } from 'expo-router'
import { apiFetch } from '../../lib/api'

const C = {
  bg: '#0b0c10', card: '#111318', border: '#1e2029',
  orange: '#f97316', t1: '#f1f5f9', t2: '#94a3b8', t3: '#475569',
}

type LeaderEntry = {
  rank: number; steam_id: string; username: string; avatar: string | null
  premier_rating?: number; kd_ratio?: number; win_rate?: number; total_matches?: number
}

const MEDAL_COLORS: Record<number, string> = { 1: '#fbbf24', 2: '#94a3b8', 3: '#cd7f32' }

export default function LeaderboardsTab() {
  const router = useRouter()
  const [tab, setTab] = useState<'premier' | 'competitive'>('premier')
  const [data, setData] = useState<LeaderEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const endpoint = tab === 'premier' ? '/api/leaderboard/premier' : '/api/leaderboard/competitive'
      const res = await apiFetch(endpoint)
      if (res.ok) {
        const json = await res.json()
        setData(json.players ?? json ?? [])
      }
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [tab])

  function renderEntry({ item, index }: { item: LeaderEntry; index: number }) {
    const pos = index + 1
    const medalColor = MEDAL_COLORS[pos]
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => router.push(`/player/${item.steam_id}`)}
        activeOpacity={0.7}
      >
        <Text style={[styles.rank, medalColor ? { color: medalColor } : {}]}>
          {pos <= 3 ? ['🥇','🥈','🥉'][pos - 1] : `#${pos}`}
        </Text>
        <Image
          source={{ uri: item.avatar ?? `https://api.dicebear.com/7.x/identicon/png?seed=${item.steam_id}` }}
          style={styles.avatar}
        />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.name}>{item.username}</Text>
          {tab === 'premier'
            ? <Text style={styles.sub}>Rating: <Text style={{ color: C.orange }}>{item.premier_rating?.toLocaleString() ?? '-'}</Text></Text>
            : <Text style={styles.sub}>K/D {item.kd_ratio?.toFixed(2) ?? '-'} · WR {item.win_rate?.toFixed(1) ?? '-'}%</Text>
          }
        </View>
        <Text style={{ color: C.t3 }}>›</Text>
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.root}>
      {/* Tab selector */}
      <View style={styles.tabRow}>
        {(['premier', 'competitive'] as const).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'premier' ? '⭐ Premier' : '🎯 Competitive'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading
        ? <View style={styles.center}><ActivityIndicator color={C.orange} size="large" /></View>
        : <FlatList
            data={data}
            keyExtractor={item => item.steam_id}
            renderItem={renderEntry}
            contentContainerStyle={{ padding: 16 }}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false) }} tintColor={C.orange} />}
            ListEmptyComponent={<Text style={{ color: C.t3, textAlign: 'center', marginTop: 32 }}>Sin datos</Text>}
          />
      }
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: C.border },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: C.orange },
  tabText: { color: C.t3, fontWeight: '600', fontSize: 14 },
  tabTextActive: { color: C.orange },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: C.border },
  rank: { width: 36, color: C.t3, fontSize: 14, fontWeight: '800', textAlign: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  name: { color: C.t1, fontWeight: '700', fontSize: 14 },
  sub: { color: C.t3, fontSize: 12, marginTop: 2 },
})
