import * as SecureStore from 'expo-secure-store'

export const API_URL = 'https://fragify.miniserver.online'

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = await SecureStore.getItemAsync('session_token')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  }
  if (token) headers['Cookie'] = `authjs.session-token=${token}`

  const res = await fetch(`${API_URL}${path}`, { ...options, headers })
  return res
}
