import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, ActivityIndicator, Image,
} from 'react-native'
import { useRouter } from 'expo-router'
import { apiFetch } from '../../lib/api'

const C = {
  bg: '#0b0c10', card: '#111318', border: '#1e2029',
  orange: '#f97316', t1: '#f1f5f9', t2: '#94a3b8', t3: '#475569',
}

type Player = {
  steam_id: string; username: string; avatar: string | null
  kd_ratio: number; premier_rating: number | null; total_matches: number
}

export default function SearchTab() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Player[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')

  async function doSearch() {
    const q = query.trim()
    if (!q) return
    setLoading(true); setError(''); setSearched(true)
    try {
      const res = await apiFetch(`/api/players/search?q=${encodeURIComponent(q)}`)
      if (res.ok) {
        const data = await res.json()
        setResults(data.players ?? data ?? [])
      } else {
        setError('Error al buscar')
        setResults([])
      }
    } catch {
      setError('Error de conexión')
      setResults([])
    }
    setLoading(false)
  }

  function renderPlayer({ item }: { item: Player }) {
    return (
      <TouchableOpacity
        style={styles.playerRow}
        onPress={() => router.push(`/player/${item.steam_id}`)}
        activeOpacity={0.7}
      >
        <Image
          source={{ uri: item.avatar ?? `https://api.dicebear.com/7.x/identicon/png?seed=${item.steam_id}` }}
          style={styles.avatar}
        />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.playerName}>{item.username}</Text>
          <Text style={styles.playerSub}>
            {item.total_matches} partidas · K/D {item.kd_ratio?.toFixed(2) ?? '-'}
          </Text>
        </View>
        {item.premier_rating && (
          <Text style={styles.rating}>⭐ {item.premier_rating.toLocaleString()}</Text>
        )}
        <Text style={{ color: C.t3, marginLeft: 8 }}>›</Text>
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.root}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="Steam ID, nombre de usuario..."
          placeholderTextColor={C.t3}
          onSubmitEditing={doSearch}
          returnKeyType="search"
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={doSearch} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={{ color: '#fff', fontWeight: '700' }}>Buscar</Text>
          }
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.err}>{error}</Text> : null}

      {!searched ? (
        <View style={styles.empty}>
          <Text style={{ fontSize: 32, marginBottom: 12 }}>🔍</Text>
          <Text style={{ color: C.t2, fontSize: 15, fontWeight: '600' }}>Busca un jugador</Text>
          <Text style={{ color: C.t3, fontSize: 13, marginTop: 6, textAlign: 'center' }}>
            Introduce un Steam ID (76561198...) o nombre de usuario
          </Text>
        </View>
      ) : results.length === 0 && !loading ? (
        <View style={styles.empty}>
          <Text style={{ fontSize: 32, marginBottom: 12 }}>😔</Text>
          <Text style={{ color: C.t2 }}>Sin resultados para "{query}"</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={item => item.steam_id}
          renderItem={renderPlayer}
          contentContainerStyle={{ padding: 16 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b0c10' },
  searchBar: { flexDirection: 'row', padding: 16, gap: 10 },
  input: { flex: 1, backgroundColor: '#111318', borderWidth: 1, borderColor: '#1e2029', borderRadius: 8, padding: 12, color: '#f1f5f9', fontSize: 14 },
  searchBtn: { backgroundColor: C.orange, borderRadius: 8, paddingHorizontal: 18, justifyContent: 'center' },
  err: { color: '#ef4444', paddingHorizontal: 16, marginBottom: 8, fontSize: 13 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  playerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111318', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#1e2029' },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  playerName: { color: '#f1f5f9', fontWeight: '700', fontSize: 15 },
  playerSub: { color: '#475569', fontSize: 12, marginTop: 2 },
  rating: { color: C.orange, fontSize: 12, fontWeight: '700' },
})
