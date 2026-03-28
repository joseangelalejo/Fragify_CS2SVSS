// src/lib/auth.ts — Auth.js v5 con Steam vía Credentials personalizado
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { query } from '@/lib/db'
import bcrypt from 'bcryptjs'

const STEAM_API_KEY = process.env.STEAM_API_KEY ?? ''

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret:  process.env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  pages:   { signIn: '/auth/login', signOut: '/auth/signout', error: '/auth/login' },
  providers: [
    Credentials({
      id:   'steam',
      name: 'Steam',
      credentials: { steamId: { type: 'text' } },
      async authorize(credentials) {
        const steamId = credentials?.steamId as string
        if (!steamId || !/^\d{17}$/.test(steamId)) return null

        const res    = await fetch(
          `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${STEAM_API_KEY}&steamids=${steamId}`
        )
        const data   = await res.json()
        const player = data.response?.players?.[0]
        if (!player) return null

        await query(
          `INSERT INTO jugadores_cs2 (steam_id64, nombre_usuario_steam, fecha_registro_fragify, estado_verificacion, ultima_actualizacion_datos, estado_actividad)
           VALUES (?, ?, NOW(), 1, NOW(), 1)
           ON DUPLICATE KEY UPDATE nombre_usuario_steam = VALUES(nombre_usuario_steam), ultima_actualizacion_datos = NOW()`,
          [steamId, player.personaname]
        )

        const existing = await query<any[]>(
          `SELECT id_usuario, username, rol_plataforma FROM usuarios_fragify WHERE steam_id64 = ? LIMIT 1`,
          [steamId]
        )

        let userId: string
        let role: string

        if (existing.length === 0) {
          role = steamId === process.env.ADMIN_STEAM_ID ? 'ADMIN' : 'USUARIO'
          await query(
            `INSERT INTO usuarios_fragify (steam_id64, username, avatar_url, steam_linked, email_verified, activo, rol_plataforma, fecha_registro)
             VALUES (?, ?, ?, 1, 1, 1, ?, NOW())`,
            [steamId, player.personaname, player.avatarfull, role]
          )
          const newRow = await query<any[]>(
            `SELECT id_usuario FROM usuarios_fragify WHERE steam_id64 = ? LIMIT 1`, [steamId]
          )
          userId = String(newRow[0].id_usuario)
        } else {
          userId = String(existing[0].id_usuario)
          role   = existing[0].rol_plataforma
          await query(
            `UPDATE usuarios_fragify SET ultimo_acceso = NOW(), avatar_url = ? WHERE id_usuario = ?`,
            [player.avatarfull, userId]
          )
        }

        return { id: userId, name: player.personaname, email: null, image: player.avatarfull, steamId, role }
      },
    }),
    Credentials({
      id:   'credentials',
      name: 'Email',
      credentials: {
        email:    { label: 'Email',    type: 'email' },
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
        if (!user || !user.activo)  return null
        if (!user.email_verified)   throw new Error('EMAIL_NOT_VERIFIED')
        if (!user.password_hash)    throw new Error('USE_STEAM')
        const valid = await bcrypt.compare(String(credentials.password), user.password_hash)
        if (!valid) return null
        await query(`UPDATE usuarios_fragify SET ultimo_acceso = NOW() WHERE id_usuario = ?`, [user.id_usuario])
        return { id: String(user.id_usuario), email: user.email, name: user.username, image: user.avatar_url, steamId: user.steam_id64, role: user.rol_plataforma }
      },
    }),
  ],
  callbacks: {
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
