// src/lib/auth.ts — Auth.js v5 (next-auth@5 beta)
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { query } from '@/lib/db'
import bcrypt from 'bcryptjs'

const STEAM_API_KEY = process.env.STEAM_API_KEY ?? ''
const NEXTAUTH_URL = 'https://fragify.miniserver.online'

const SteamProvider = {
  id: 'steam',
  name: 'Steam',
  type: 'oauth' as const,
  authorization: {
    url: 'https://steamcommunity.com/openid/login',
    params: {
      'openid.ns': 'http://specs.openid.net/auth/2.0',
      'openid.mode': 'checkid_setup',
      'openid.return_to': `${NEXTAUTH_URL}/api/auth/callback/steam`,
      'openid.realm': NEXTAUTH_URL,
      'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
      'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
    },
  },
  token: {
    url: 'https://steamcommunity.com/openid/login',
    async request(context: any) {
      const params = new URLSearchParams(context.params)
      params.set('openid.mode', 'check_authentication')
      const res = await fetch('https://steamcommunity.com/openid/login', {
        method: 'POST',
        body: params,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      const text = await res.text()
      if (!text.includes('is_valid:true')) throw new Error('Steam OpenID validation failed')
      const claimedId = context.params['openid.claimed_id'] as string
      const steamId = claimedId?.split('/').pop() ?? ''
      return { tokens: { access_token: steamId } }
    },
  },
  userinfo: {
    async request(context: any) {
      const steamId = context.tokens.access_token as string
      const res = await fetch(
        `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${STEAM_API_KEY}&steamids=${steamId}`
      )
      const data = await res.json()
      const player = data.response?.players?.[0]
      if (!player) throw new Error('Steam profile not found')
      return { steamid: steamId, personaname: player.personaname, avatarfull: player.avatarfull }
    },
  },
  profile(profile: any) {
    return { id: profile.steamid, name: profile.personaname, email: null, image: profile.avatarfull, steamId: profile.steamid }
  },
  clientId: 'steam',
  clientSecret: STEAM_API_KEY,
  checks: ['none' as const],
  allowDangerousEmailAccountLinking: true,
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: '/auth/login', signOut: '/auth/signout', error: '/auth/login' },
  providers: [
    SteamProvider as any,
    Credentials({
      id: 'credentials', name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const rows = await query<any[]>(
          `SELECT id_usuario, email, username, password_hash, avatar_url, steam_id64, rol_plataforma, email_verified, activo
            FROM usuarios_fragify WHERE email = ? LIMIT 1`,
          [String(credentials.email).toLowerCase()]
        )
        const user = rows[0]
        if (!user || !user.activo) return null
        if (!user.email_verified) throw new Error('EMAIL_NOT_VERIFIED')
        if (!user.password_hash) throw new Error('USE_STEAM')
        const valid = await bcrypt.compare(String(credentials.password), user.password_hash)
        if (!valid) return null
        await query(`UPDATE usuarios_fragify SET ultimo_acceso = NOW() WHERE id_usuario = ?`, [user.id_usuario])
        return { id: String(user.id_usuario), email: user.email, name: user.username, image: user.avatar_url, steamId: user.steam_id64, role: user.rol_plataforma }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== 'steam') return true
      const p = profile as any
      const steamId = p?.steamid ?? (user as any).id
      if (!steamId) return false

      await query(
        `INSERT INTO jugadores_cs2 (steam_id64, nombre_usuario_steam, fecha_registro_fragify, estado_verificacion, ultima_actualizacion_datos, estado_actividad)
          VALUES (?, ?, NOW(), 1, NOW(), 1)
          ON DUPLICATE KEY UPDATE nombre_usuario_steam = VALUES(nombre_usuario_steam), ultima_actualizacion_datos = NOW()`,
        [steamId, p?.personaname ?? user.name]
      )
      const existing = await query<any[]>(
        `SELECT id_usuario, username, rol_plataforma FROM usuarios_fragify WHERE steam_id64 = ? LIMIT 1`,
        [steamId]
      )
      if (existing.length === 0) {
        const role = steamId === process.env.ADMIN_STEAM_ID ? 'ADMIN' : 'USUARIO'
        await query(
          `INSERT INTO usuarios_fragify (steam_id64, username, avatar_url, steam_linked, email_verified, activo, rol_plataforma, fecha_registro)
            VALUES (?, ?, ?, 1, 1, 1, ?, NOW())`,
          [steamId, p?.personaname ?? user.name, p?.avatarfull ?? user.image, role]
        )
        const newRow = await query<any[]>(`SELECT id_usuario, rol_plataforma FROM usuarios_fragify WHERE steam_id64 = ? LIMIT 1`, [steamId])
          ; (user as any).id = String(newRow[0].id_usuario); (user as any).role = newRow[0].rol_plataforma; (user as any).steamId = steamId
      } else {
        await query(`UPDATE usuarios_fragify SET ultimo_acceso = NOW(), avatar_url = ? WHERE steam_id64 = ?`, [p?.avatarfull ?? user.image, steamId])
          ; (user as any).id = String(existing[0].id_usuario); (user as any).role = existing[0].rol_plataforma; (user as any).name = existing[0].username ?? user.name; (user as any).steamId = steamId
      }
      return true
    },
    async jwt({ token, user }) {
      if (user) { token.id = (user as any).id; token.steamId = (user as any).steamId; token.role = (user as any).role }
      return token
    },
    async session({ session, token }) {
      if (session.user) { (session.user as any).id = token.id; (session.user as any).steamId = token.steamId; (session.user as any).role = token.role }
      return session
    },
  },
})