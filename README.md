# Fragify — CS2 Stats Platform

![Fragify](./Imagenes_Proyecto/02_logo_horizontal_1200x300.png)

> **CS2-SVSS** · Proyecto académico DAW 2025–2027 · José Ángel Alejo Sillero  
> Instituto Tecnológico Pablo de la Torre

Plataforma web de estadísticas para Counter-Strike 2. Historial real importado desde Steam (2,904 partidas),
perfiles de jugador, leaderboards, bot de Telegram y panel de administración.

🌐 **[fragify.miniserver.online](https://fragify.miniserver.online)**

---

## Stack

| Capa           | Tecnología                                 |
|----------------|--------------------------------------------|
| Frontend + API | Next.js 15.5 + TypeScript                  |
| Auth           | Auth.js v5 (Steam OpenID + email/password) |
| Base de datos  | TiDB Cloud Serverless (Frankfurt)          |
| Deploy         | Vercel (Hobby)                             |
| Email          | Resend                                     |
| Almacenamiento | Vercel Blob (avatares)                     |
| Alertas        | Telegram Bot API                           |
| Homelab        | Proxmox → Debian VM → Docker Compose       |

---

## Funcionalidades

### Perfiles de jugador

- Stats reales calculadas desde `partidas_cs2` + `partida_jugador` (no Steam API)
- K/D, HS%, Win Rate, kills desde historial importado
- Historial de 50 partidas más recientes con K/D/A, HS%, score, modo
- Filtro por modo: Competitive 5v5 / Wingman 2v2
- Mapa con mejor y peor win rate (MAP PERFORMANCE)
- Comparativa CS:GO vs CS2 (Steam API legacy)
- Badge "CS2 · DATOS REALES" / "CS2 · STEAM API"

### Import de partidas

- Import manual via sharecode (cadena `GetNextMatchSharingCode`)
- Import masivo desde exportación PDF de Steam (`cs2_pdf_parser.py`)
- 2,904 partidas importadas: 1,534 Competitive + 1,370 Wingman

### Leaderboards

- **PREMIER** — 50 jugadores pro con histograma de distribución ELO
- **COMPETITIVE** — ranking por win rate y K/D calculado desde `partida_jugador`

### Auth y perfiles de usuario

- Registro con Steam (OpenID manual) o email + password
- Vinculación de cuenta Steam a cuenta email existente
- Set de contraseña para cuentas Steam puras (sin pedir contraseña actual)
- Upload de avatar (Vercel Blob)
- Verificación de email (Resend + DNS MX check)

### Bot Telegram (`@fragify_monitor_bot`)

- Webhook en `/api/telegram/webhook`
- Comandos: `/start`, `/stats`, `/status`, `/help`
- Notificaciones: nuevos usuarios, reportes de conducta, actividad sospechosa, backups

### Admin panel

- Dashboard con totales: usuarios, jugadores, tickets, rankings
- Gestión de support tickets (ABIERTO / EN_PROCESO / CERRADO)

---

## Arquitectura

```
┌──────────────────────────────────────────────────────────────┐
│  Usuario / Navegador                                         │
└───────────────────────┬──────────────────────────────────────┘
                        │ HTTPS
┌───────────────────────▼──────────────────────────────────────┐
│  Vercel — fragify.miniserver.online                          │
│  Next.js 15.5 (SSR + API routes)                            │
│  ├── /player/[steam_id]     Perfil de jugador               │
│  ├── /ranking               Leaderboards Premier/Competitive │
│  ├── /matches               Feed global de partidas         │
│  ├── /api/ranking           GET ranking                     │
│  ├── /api/ranking/competitive GET ranking competitive       │
│  ├── /api/profile/*         Settings, avatar, password      │
│  ├── /api/telegram/webhook  Bot Telegram                    │
│  └── /api/cron/monitor      Alertas automáticas             │
└───────────────────────┬──────────────────────────────────────┘
                        │ TLS (DATABASE_URL)
┌───────────────────────▼──────────────────────────────────────┐
│  TiDB Cloud Serverless — Frankfurt (eu-central-1)            │
│  database: test                                              │
│  15 tablas · 7 vistas · 4 triggers · 5 roles MySQL          │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  Homelab — Proxmox → Debian Trixie VM                        │
│  ├── Docker Compose (MySQL local dev + túnel TiDB)          │
│  ├── backup.sh — backup diario a las 3:00 AM                │
│  └── Tailscale (100.66.214.108)                             │
└──────────────────────────────────────────────────────────────┘
```

---

## Estructura del repositorio

```
Fragify_CS2SVSS/
├── database/
│   ├── fragify_v2.sql          # Schema completo (15 tablas, 7 vistas, 4 triggers, 5 roles)
│   └── fragify_verify.sql      # Suite de tests SQL
├── docker/
│   ├── docker-compose.yml      # MySQL local + túnel TiDB
│   └── mysql/
│       ├── init/               # Scripts de inicialización
│       └── conf.d/fragify.cnf  # Config MySQL
├── scripts/
│   ├── backup.sh               # Backup automático con notificación Telegram
│   └── restore.sh              # Restore interactivo
├── web/                        # Next.js 15.5 + TypeScript
│   └── src/
│       ├── app/
│       │   ├── page.tsx                    # Home
│       │   ├── ranking/page.tsx            # Leaderboards
│       │   ├── matches/page.tsx            # Feed global
│       │   ├── player/[steam_id]/          # Perfil jugador
│       │   │   ├── page.tsx               # Server component + sidebar
│       │   │   └── PlayerTabs.tsx         # Tabs STATS/GRAPHS/MAPS/MATCHES/CS:GO
│       │   ├── profile/                   # Settings, Security, Steam & CS2
│       │   ├── admin/                     # Panel de administración
│       │   └── api/                       # API routes
│       ├── lib/
│       │   ├── db.ts           # Cliente MySQL (pool singleton, SSL TiDB)
│       │   ├── auth.ts         # Auth.js v5 (Steam + credentials)
│       │   ├── telegram.ts     # Wrapper Telegram Bot API
│       │   └── email.ts        # Resend (verificación + reset)
│       └── components/
│           ├── layout/         # Navbar, Footer
│           └── ui/             # CircleStat, WinCircle, SupportButton
└── README.md
```

---

## Base de datos — CS2-SVSS v2.0

### Tablas (15)

| Tabla                        | Descripción                                               |
|------------------------------|-----------------------------------------------------------|
| `jugadores_cs2`              | Perfiles de jugadores (PK natural: Steam ID64)            |
| `partidas_cs2`               | Partidas con mapa, modo, duración, score                  |
| `partida_jugador`            | N:M jugadores↔partidas (kills, deaths, assists, HS, MVPs) |
| `estadisticas_cs2`           | Stats agregadas por jugador                               |
| `rankings_cs2`               | Ranking PREMIER y por mapa                                |
| `historico_ranking_premiere` | Snapshots de ELO (alimentado por trigger)                 |
| `mapas`                      | Catálogo de mapas (27 mapas registrados)                  |
| `modos_juego`                | Catálogo de modos (COMPETITIVO, PREMIER, WINGMAN)         |
| `usuarios_fragify`           | Usuarios web con auth Steam + email/password              |
| `tipos_infraccion`           | Catálogo de tipos de reporte                              |
| `reportes_conducta`          | Reportes de conducta para Overwatch                       |
| `servidores_cs2`             | Servidores de juego                                       |
| `support_tickets`            | Tickets de soporte del panel de admin                     |
| `logs_auditoria`             | Trazabilidad RGPD                                         |
| `registro_intentos`          | Rate limiting de login                                    |

### Vistas (7)

| Vista                             | Descripción                                 |
|-----------------------------------|---------------------------------------------|
| `vw_estadisticas_jugador_resumen` | Stats completas por jugador                 |
| `vw_match_history`                | Historial de partidas con stats por jugador |
| `vw_rendimiento_por_mapa`         | Win rate, K/D y ADR por mapa y jugador      |
| `vw_evolucion_elo`                | Evolución histórica del ELO Premier         |
| `vw_ranking_jugadores_elo`        | Ranking Premier ordenado por ELO            |
| `vw_partidas_recientes_jugador`   | Últimas partidas por jugador                |
| `vw_reportes_pendientes_valve`    | Reportes pendientes de enviar a Valve       |

### Triggers (4)

| Trigger                           | Evento                             | Función                                           |
|-----------------------------------|------------------------------------|---------------------------------------------------|
| `tr_recalcular_estadisticas`      | AFTER INSERT en `partida_jugador`  | Recalcula K/D, HS%, winrate en `estadisticas_cs2` |
| `tr_snapshot_elo`                 | AFTER UPDATE en `rankings_cs2`     | Guarda snapshot en `historico_ranking_premiere`   |
| `tr_validar_partida_jugador`      | BEFORE INSERT en `partida_jugador` | Valida FK y límite de 10 jugadores por partida    |
| `tr_actualizar_timestamp_jugador` | BEFORE UPDATE en `jugadores_cs2`   | Actualiza `ultima_actualizacion_datos`            |

---

## Puesta en marcha

### Variables de entorno (web/.env.local)

```env
DATABASE_URL=mysql://user:pass@host:port/db?ssl=true
NEXTAUTH_SECRET=tu_secret_aleatorio
NEXTAUTH_URL=https://fragify.miniserver.online
STEAM_API_KEY=tu_clave_steam
ADMIN_STEAM_ID=tu_steam_id64
TELEGRAM_BOT_TOKEN=token_del_bot
TELEGRAM_CHAT_ID=tu_chat_id
RESEND_API_KEY=re_xxxx
NEXT_PUBLIC_APP_URL=https://fragify.miniserver.online
CRON_SECRET=tu_cron_secret
```

### Desarrollo local

```bash
git clone https://github.com/joseangelalejo/Fragify_CS2SVSS
cd Fragify_CS2SVSS/web
cp .env.example .env.local
# Editar .env.local
npm install
npm run dev   # http://localhost:3000
```

### Registrar el webhook de Telegram (una vez)

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
     -d "url=https://fragify.miniserver.online/api/telegram/webhook"
```

### Cron del homelab

```cron
# Monitor cada 30 segundos
* * * * * curl -sf -H "x-cron-secret: SECRET" https://fragify.miniserver.online/api/cron/monitor
* * * * * sleep 30; curl -sf -H "x-cron-secret: SECRET" https://fragify.miniserver.online/api/cron/monitor

# Backup diario 3:00 AM
0 3 * * * /home/dockerja/scripts/backup.sh
```

---

## Notas académicas

Proyecto del módulo **Bases de Datos — 1º DAW**.

| Entregable         | Calificación | Descripción                                 |
|--------------------|--------------|---------------------------------------------|
| E1 — ERS           | 10           | Especificación de Requisitos de Software    |
| E2 — Modelos ER/LR | 10           | Modelo Entidad-Relación y Lógico-Relacional |
| E3 — Scripts SQL   | 9.5          | Scripts SQL (reclamación en curso)          |

---

*Fragify no está afiliado a Valve Corporation. Counter-Strike 2 es marca registrada de Valve.*
