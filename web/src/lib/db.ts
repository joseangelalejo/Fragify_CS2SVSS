// src/lib/db.ts
// Cliente MySQL singleton para Fragify.
// Soporta dos modos:
//   - Dev local en homelab: DATABASE_URL apunta a mysql:3306 (red Docker interna)
//   - Vercel producción:    DATABASE_URL apunta a TiDB Cloud (requiere SSL)

import mysql from 'mysql2/promise'

declare global {
  // eslint-disable-next-line no-var
  var _fragifyPool: mysql.Pool | undefined
}

function createPool(): mysql.Pool {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL no definida en .env.local / variables de Vercel')

  // Parsear mysql://user:pass@host:port/db?params
  const m = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)(.*)/)
  if (!m) throw new Error(`DATABASE_URL inválida: ${url}`)

  const [, user, password, host, portStr, database, queryString] = m

  // SSL si la URL contiene ?ssl=true o el host es TiDB Cloud
  const useSSL = queryString.includes('ssl=true') || host.includes('tidbcloud.com')

  return mysql.createPool({
    user,
    password,
    host,
    port:               parseInt(portStr),
    database,
    connectionLimit:    10,
    waitForConnections: true,
    queueLimit:         0,
    timezone:           '+00:00',
    charset:            'utf8mb4',
    connectTimeout:     10000,
    ...(useSSL && {
      ssl: { rejectUnauthorized: true },
    }),
  })
}

export const db: mysql.Pool =
  globalThis._fragifyPool ?? (globalThis._fragifyPool = createPool())

export async function query<T = mysql.RowDataPacket[]>(
  sql: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  values?: any[]
): Promise<T> {
  const [rows] = await db.execute(sql, values)
  return rows as T
}