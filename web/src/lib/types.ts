// src/lib/types.ts

export interface Player {
  steam_id64: string
  nombre_usuario_steam: string
  fecha_registro_fragify: string
  estado_verificacion: 0 | 1
  estado_actividad: 0 | 1
  region_geografica: string | null
  ultima_actualizacion_datos: string
}

export interface PlayerStats {
  steam_id64: string
  nombre_usuario_steam: string
  estado_actividad: 0 | 1
  region_geografica: string | null
  kills: number
  deaths: number
  assists: number
  kd_ratio: number
  mvps: number
  headshots: number
  precision_disparo: number | null
  ratio_headshots: number | null
  dano_promedio_ronda: number | null
  total_partidas_jugadas: number
  total_partidas_ganadas: number
  porcentaje_victorias: number
  tiempo_jugado: number
  ultima_actualizacion: string
}

export interface RankingEntry {
  steam_id64: string
  nombre_usuario_steam: string
  region_geografica: string | null
  puntos_elo: number
  tier: string
  posicion_global: number | null
  ultima_actualizacion: string
  ranking_posicion: number
}

export interface MatchHistory {
  id_partida: string
  fecha_partida: string
  mapa: string
  resultado_puntuacion: string | null
  duracion_minutos: number
  steam_id64: string
  nombre_usuario_steam: string
  equipo: 'T' | 'CT'
  resultado: 'VICTORIA' | 'DERROTA' | 'EMPATE'
  kills: number
  deaths: number
  assists: number
  headshots: number
  dano_total: number
  precision_disparo: number | null
  mvp: 0 | 1
  abandono: 0 | 1
}

export interface EloSnapshot {
  steam_id64: string
  nombre_usuario_steam: string
  puntos_elo: number
  tier: string
  variacion_elo: number | null
  fecha_snapshot: string
  numero_partida_acumulada: number
}

export interface Report {
  id_reporte: number
  jugador_reportado: string
  jugador_reportador: string
  tipo_infraccion: string
  severidad: 1 | 2 | 3
  descripcion: string | null
  evidencia: string | null
  id_partida: string | null
  fecha_reporte: string
  estado_reporte: 'PENDIENTE' | 'REVISADO' | 'RESUELTO'
  dias_desde_reporte: number
}

export interface ApiResponse<T> {
  data: T
  total?: number
  page?: number
  pageSize?: number
}

export interface ApiError {
  error: string
  code?: string
}
