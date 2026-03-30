'use client'
import React, { useState, useRef } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  ScrollView, Alert, Modal,
} from 'react-native'
import { WebView } from 'react-native-webview'
import { useAuth } from '../../lib/auth'
import { API_URL } from '../../lib/api'

const C = {
  bg: '#0b0c10', card: '#111318', border: '#1e2029',
  orange: '#f97316', t1: '#f1f5f9', t2: '#94a3b8', t3: '#475569',
  green: '#22c55e', red: '#ef4444',
}

export default function LoginScreen() {
  const { signIn, refresh } = useAuth()
  const [tab, setTab] = useState<'email' | 'steam'>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [steamVisible, setSteamVisible] = useState(false)
  const [twoFARequired, setTwoFARequired] = useState(false)
  const [twoFAMethod, setTwoFAMethod] = useState<'TOTP' | 'EMAIL'>('TOTP')
  const [twoFACode, setTwoFACode] = useState('')
  const [twoFAToken, setTwoFAToken] = useState('')

  async function handleEmailLogin() {
    if (!email || !password) { setError('Rellena todos los campos'); return }
    setLoading(true); setError('')
    const { error: err } = await signIn(email, password)
    setLoading(false)
    if (err) setError(err)
  }

  async function handleSteamNav(url: string) {
    // Steam OpenID callback lands on /api/auth/callback/steam
    if (url.includes('/api/auth/callback/steam') && url.includes('openid')) {
      setSteamVisible(false)
      setLoading(true)
      await refresh()
      setLoading(false)
    }
  }

  const steamLoginUrl = `${API_URL}/api/auth/signin/steam?callbackUrl=${encodeURIComponent(API_URL + '/api/mobile/steam-done')}`

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.logoWrap}>
          <Text style={styles.logo}>FRAG<Text style={{ color: C.orange }}>IFY</Text></Text>
          <Text style={styles.subtitle}>CS2 Stats Platform</Text>
        </View>

        {/* Tab selector */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, tab === 'email' && styles.tabActive]}
            onPress={() => setTab('email')}
          >
            <Text style={[styles.tabText, tab === 'email' && styles.tabTextActive]}>Email</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'steam' && styles.tabActive]}
            onPress={() => setTab('steam')}
          >
            <Text style={[styles.tabText, tab === 'steam' && styles.tabTextActive]}>🎮 Steam</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          {tab === 'email' ? (
            <>
              {error ? <Text style={styles.err}>{error}</Text> : null}
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="tu@email.com"
                placeholderTextColor={C.t3}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
              <Text style={[styles.label, { marginTop: 14 }]}>Contraseña</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={C.t3}
                secureTextEntry
                autoComplete="password"
              />
              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleEmailLogin}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.btnText}>Iniciar sesión</Text>
                }
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.steamInfo}>
                Serás redirigido a Steam para autenticarte. No guardamos tu contraseña de Steam.
              </Text>
              <TouchableOpacity
                style={[styles.btn, styles.btnSteam]}
                onPress={() => setSteamVisible(true)}
              >
                <Text style={styles.btnText}>Continuar con Steam</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* 2FA modal */}
        <Modal visible={twoFARequired} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Verificación 2FA</Text>
              <Text style={styles.modalSub}>
                {twoFAMethod === 'EMAIL'
                  ? 'Revisa tu email, te hemos enviado un código.'
                  : 'Introduce el código de tu app de autenticación.'}
              </Text>
              <TextInput
                style={[styles.input, { textAlign: 'center', fontSize: 24, letterSpacing: 8 }]}
                value={twoFACode}
                onChangeText={t => setTwoFACode(t.replace(/\D/g, ''))}
                placeholder="000000"
                placeholderTextColor={C.t3}
                keyboardType="numeric"
                maxLength={6}
              />
              <TouchableOpacity style={styles.btn} onPress={() => {}}>
                <Text style={styles.btnText}>Verificar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Steam WebView modal */}
        <Modal visible={steamVisible} animationType="slide">
          <View style={{ flex: 1, backgroundColor: C.bg }}>
            <View style={styles.webviewHeader}>
              <TouchableOpacity onPress={() => setSteamVisible(false)}>
                <Text style={{ color: C.orange, fontSize: 16 }}>✕ Cancelar</Text>
              </TouchableOpacity>
              <Text style={{ color: C.t2, fontSize: 13 }}>Login con Steam</Text>
            </View>
            <WebView
              source={{ uri: steamLoginUrl }}
              onNavigationStateChange={nav => handleSteamNav(nav.url)}
              style={{ flex: 1 }}
              userAgent="Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 Chrome/120.0"
            />
          </View>
        </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoWrap: { alignItems: 'center', marginBottom: 36 },
  logo: { fontSize: 42, fontWeight: '900', color: C.t1, letterSpacing: 4 },
  subtitle: { color: C.t3, fontSize: 13, marginTop: 4 },
  tabRow: { flexDirection: 'row', marginBottom: 16, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: C.border },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: C.card },
  tabActive: { backgroundColor: C.orange },
  tabText: { color: C.t3, fontWeight: '600', fontSize: 14 },
  tabTextActive: { color: '#fff' },
  card: { backgroundColor: C.card, borderRadius: 12, padding: 20, borderWidth: 1, borderColor: C.border },
  label: { color: C.t2, fontSize: 12, fontWeight: '600', marginBottom: 6 },
  input: { backgroundColor: '#0d0e13', borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 12, color: C.t1, fontSize: 15 },
  btn: { backgroundColor: C.orange, borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 18 },
  btnSteam: { backgroundColor: '#1b2838' },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  err: { backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', borderRadius: 6, padding: 10, color: C.red, marginBottom: 14, fontSize: 13 },
  steamInfo: { color: C.t2, fontSize: 13, marginBottom: 20, lineHeight: 20 },
  webviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: C.card, borderBottomWidth: 1, borderColor: C.border },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: C.card, borderRadius: 12, padding: 24, borderWidth: 1, borderColor: C.border },
  modalTitle: { color: C.t1, fontSize: 20, fontWeight: '800', marginBottom: 8 },
  modalSub: { color: C.t2, fontSize: 13, marginBottom: 20 },
})
