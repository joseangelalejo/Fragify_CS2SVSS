import React, { createContext, useContext, useState, useEffect } from 'react'
import * as SecureStore from 'expo-secure-store'
import { apiFetch } from './api'

type User = {
  id: string
  name: string
  email?: string
  image?: string
  steamId?: string
  role?: string
}

type AuthCtx = {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchSession() {
    try {
      const res = await apiFetch('/api/auth/session')
      if (res.ok) {
        const data = await res.json()
        setUser(data?.user ?? null)
        // Persist cookie for next app launch
        const setCookie = res.headers.get('set-cookie')
        if (setCookie) {
          const match = setCookie.match(/authjs\.session-token=([^;]+)/)
          if (match) await SecureStore.setItemAsync('session_token', match[1])
        }
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSession() }, [])

  async function signIn(email: string, password: string) {
    try {
      // 1. Get CSRF token
      const csrfRes = await apiFetch('/api/auth/csrf')
      const { csrfToken } = await csrfRes.json()

      // 2. Sign in
      const res = await apiFetch('/api/auth/callback/credentials', {
        method: 'POST',
        body: JSON.stringify({ email, password, csrfToken, redirect: false, json: true }),
      })

      const setCookie = res.headers.get('set-cookie')
      if (setCookie) {
        const match = setCookie.match(/authjs\.session-token=([^;]+)/)
        if (match) await SecureStore.setItemAsync('session_token', match[1])
      }

      await fetchSession()
      if (!user) return { error: 'Credenciales incorrectas' }
      return {}
    } catch (e) {
      return { error: 'Error de conexión' }
    }
  }

  async function signOut() {
    await apiFetch('/api/auth/signout', { method: 'POST' })
    await SecureStore.deleteItemAsync('session_token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, refresh: fetchSession }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
