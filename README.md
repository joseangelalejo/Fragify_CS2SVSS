# Fragify — CS2 Stats Visualizing System

![Fragify](./Imagenes_Proyecto/02_logo_horizontal_1200x300.png)

> **CS2-SVSS** · Proyecto académico DAW 2024–2026 · José Ángel Alejo Sillero  
> Instituto Tecnológico Pablo de la Torre

Plataforma web para visualizar estadísticas de Counter-Strike 2.  
Backend MySQL en homelab · Frontend Next.js en Vercel · Alertas Telegram integradas.

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│  Usuario / Navegador                                        │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS
┌──────────────────────▼──────────────────────────────────────┐
│  Vercel — fragify.miniserver.online                         │
│  Next.js 15 (frontend + API routes)                         │
│  · /api/ranking    · /api/player/:id                        │
│  · /api/reports    · /api/health                            │
│  · /api/cron/monitor  ← alertas Telegram                   │
└──────────────────────┬──────────────────────────────────────┘
                       │ DATABASE_URL (Tailscale / público)
┌──────────────────────▼──────────────────────────────────────┐
│  Homelab Debian — 100.66.214.108                            │
│  Docker Compose                                             │
│  ├── fragify_mysql  (MySQL 8.0, puerto 3307 local)          │
│  └── fragify_api    (Next.js backend, puerto 3001 local)    │
│  nginx → fragify-api.miniserver.online                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Estructura del repositorio

```
fragify/
├── database/
│   ├── fragify_v2.sql          # Script SQL completo (12 tablas, 7 vistas, 4 triggers, 5 roles)
│   └── fragify_verify.sql      # Suite de tests SQL (9 bloques, ~30 tests)
├── docker/
│   ├── docker-compose.yml      # MySQL + API backend
│   ├── .env.example            # Variables de entorno (copiar como .env)
│   └── mysql/
│       ├── init/               # Scripts ejecutados al crear la BD
│       └── conf.d/fragify.cnf  # Config MySQL personalizada
├── scripts/
│   ├── backup.sh               # Backup automático con notificación Telegram
│   └── restore.sh              # Restore interactivo con confirmación
├── web/                        # Frontend Next.js 15 + TypeScript
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx           # Home
│   │   │   ├── ranking/page.tsx   # Ranking PREMIER
│   │   │   ├── player/page.tsx    # Búsqueda de jugador
│   │   │   ├── player/[steam_id]/ # Perfil de jugador
│   │   │   └── api/               # API routes
│   │   │       ├── health/        # Health check
│   │   │       ├── ranking/       # GET ranking
│   │   │       ├── player/[id]/   # GET perfil jugador
│   │   │       ├── reports/       # GET/POST reportes
│   │   │       └── cron/monitor/  # Cron de alertas Telegram
│   │   ├── lib/
│   │   │   ├── db.ts              # Cliente MySQL (pool singleton)
│   │   │   ├── telegram.ts        # Wrapper Telegram Bot API
│   │   │   └── types.ts           # Tipos TypeScript
│   │   └── components/
│   │       └── layout/            # Navbar, Footer
│   └── .env.example
├── backups/                    # Generado por backup.sh (en .gitignore)
├── .gitignore
└── README.md
```

---

## Base de datos — CS2-SVSS v2.0

### Tablas (12)

| Tabla | Descripción |
|---|---|
| `jugadores_cs2` | Perfiles de jugadores (PK natural: Steam ID64) |
| `servidores_cs2` | Servidores de juego |
| `usuarios_fragify` | Usuarios web (futuro Steam OAuth) |
| `estadisticas_cs2` | Stats agregadas por jugador (auto-actualizadas por trigger) |
| `rankings_cs2` | Ranking PREMIER y por mapa |
| `mapas` | Catálogo de mapas (pool competitivo) |
| `modos_juego` | Catálogo de modos de juego |
| `tipos_infraccion` | Catálogo de tipos de reportes (normalizado) |
| `partidas_cs2` | Datos de cada partida |
| `partida_jugador` | N:M jugadores↔partidas con stats por partida |
| `historico_ranking_premiere` | Snapshots de ELO para gráfica de evolución |
| `reportes_conducta` | Reportes de conducta para Overwatch |
| `logs_auditoria` | Trazabilidad RGPD |

### Triggers (4)

| Trigger | Evento | Función |
|---|---|---|
| `tr_recalcular_estadisticas` | AFTER INSERT en `partida_jugador` | Recalcula K/D, HS%, ADR, winrate en `estadisticas_cs2` |
| `tr_snapshot_elo` | AFTER UPDATE en `rankings_cs2` | Guarda snapshot en `historico_ranking_premiere` cuando cambia el ELO |
| `tr_validar_partida_jugador` | BEFORE INSERT en `partida_jugador` | Valida FK y límite de 10 jugadores por partida |
| `tr_actualizar_timestamp_jugador` | BEFORE UPDATE en `jugadores_cs2` | Actualiza `ultima_actualizacion_datos` automáticamente |

### Roles MySQL (5)

| Usuario | Host | Permisos |
|---|---|---|
| `admin_cs2` | localhost | ALL PRIVILEGES |
| `api_service` | localhost | SELECT en catálogos; INSERT/UPDATE en datos |
| `valve_inspector` | remote_valve_server | SELECT en reportes y jugadores |
| `jugador_fragify` | localhost | SELECT en stats, partidas, vistas propias |
| `profesor_evaluador` | localhost | SELECT en todo (evaluación académica) |

---

## Puesta en marcha

### Requisitos

- Docker y Docker Compose v2
- Node.js 20+ (para desarrollo local del frontend)
- Un bot de Telegram (ver sección Telegram más abajo)

### 1 — Clonar y configurar

```bash
git clone https://github.com/joseangelalejo/fragify
cd fragify
```

### 2 — Configurar variables de entorno del Docker

```bash
cp docker/.env.example docker/.env
# Editar docker/.env con tus valores reales
nano docker/.env
```

### 3 — Inicializar la base de datos

```bash
# Copiar el SQL al directorio de init de MySQL
cp database/fragify_v2.sql docker/mysql/init/01_fragify_v2.sql

# Levantar solo MySQL primero
cd docker
docker compose up -d mysql

# Esperar a que MySQL esté sano (healthcheck)
docker compose ps
```

### 4 — Ejecutar el script de verificación

```bash
docker exec -i fragify_mysql mysql \
  -u root -p"$(grep MYSQL_ROOT_PASSWORD docker/.env | cut -d= -f2)" \
  cs2svss < ../database/fragify_verify.sql
```

Si todo está bien verás al final:

```
25/25 tests pasados — ✓ Todo correcto. La BD CS2-SVSS v2.0 está lista.
```

### 5 — Levantar el stack completo

```bash
cd docker
docker compose up -d
docker compose ps   # Todos deben estar healthy
```

### 6 — Configurar el frontend en Vercel

```bash
cd web
cp .env.example .env.local
# Editar .env.local con DATABASE_URL apuntando al homelab
# y las credenciales de Telegram

# Desarrollo local
npm install
npm run dev         # http://localhost:3000

# Deploy a Vercel
vercel              # o push a main con GitHub Actions
```

En el dashboard de Vercel, añade las variables de entorno del `.env.example`.

### 7 — Activar el cron de monitorización

En el homelab, añadir al crontab de `dockerja`:

```bash
crontab -e
```

```cron
# Monitor Fragify cada 30 segundos
* * * * * curl -sf -H "x-cron-secret: TU_CRON_SECRET" https://fragify.miniserver.online/api/cron/monitor >> /var/log/fragify-monitor.log 2>&1
* * * * * sleep 30; curl -sf -H "x-cron-secret: TU_CRON_SECRET" https://fragify.miniserver.online/api/cron/monitor >> /var/log/fragify-monitor.log 2>&1

# Backup diario a las 3:00 AM
0 3 * * * /home/dockerja/fragify/scripts/backup.sh >> /var/log/fragify-backup.log 2>&1
```

---

## Telegram — Configurar el bot desde cero

### 1 — Crear el bot con @BotFather

1. Abre Telegram y busca `@BotFather`
2. Envía `/newbot`
3. Ponle nombre: `Fragify Monitor`
4. Ponle username: `fragify_monitor_bot` (o el que esté disponible)
5. Copia el **token** que te da (formato `123456789:AABBccDD...`)

### 2 — Obtener tu Chat ID

1. Busca `@userinfobot` en Telegram
2. Envía cualquier mensaje
3. Te responde con tu `Id:` — ese es tu **chat_id** personal

Para grupos: añade el bot al grupo, envía un mensaje mencionándolo,  
luego visita `https://api.telegram.org/bot<TOKEN>/getUpdates` y busca `"chat":{"id":`.  
Los grupos tienen ID negativo (ej: `-100123456789`).

### 3 — Configurar en .env

```env
TELEGRAM_BOT_TOKEN=123456789:AABBccDDeeFF
TELEGRAM_CHAT_ID=-100123456789   # o tu ID personal
```

### Eventos que generan alerta

| Evento | Emoji | Cuándo |
|---|---|---|
| Nuevo usuario registrado | 🎮 | Al insertar en `usuarios_fragify` |
| Nuevo reporte de conducta | 🚩 | Al hacer POST a `/api/reports` |
| Reporte de alta severidad | 🔴 | Severidad 3 (CHEATING) |
| Spam de reportes | 🛡️ | >5 reportes del mismo usuario en 5 min |
| Pico de registros | 🛡️ | >10 registros en 5 min (posible bot) |
| Servicio caído | 🚨 | MySQL o API no responden |
| Servicio recuperado | 🔄 | Tras una caída |
| Backup completado | ✅ | Tras `backup.sh` exitoso |
| Backup fallido | 💀 | Error en `backup.sh` |

---

## Scripts de mantenimiento

```bash
# Backup manual
./scripts/backup.sh

# Listar backups disponibles
./scripts/restore.sh

# Restore de un backup específico
./scripts/restore.sh fragify_cs2svss_20260326_030000.sql.gz

# Ver logs del monitor
tail -f /var/log/fragify-monitor.log

# Reiniciar la BD desde cero (DESTRUYE DATOS)
cd docker
docker compose down -v
docker compose up -d
```

---

## nginx — Configuración sugerida para el homelab

```nginx
# /etc/nginx/sites-available/fragify-api
server {
    listen 443 ssl;
    server_name fragify-api.miniserver.online;

    ssl_certificate     /etc/letsencrypt/live/fragify-api.miniserver.online/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/fragify-api.miniserver.online/privkey.pem;

    location / {
        proxy_pass         http://127.0.0.1:3001;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}
```

---

## Notas académicas

Este proyecto corresponde al **3º Entregable de Base de Datos — 1º DAW**.

- **E1 (ERS):** Nota 10 — Especificación de Requisitos de Software
- **E2 (Modelos ER/LR):** Nota 10 — Modelo Entidad-Relación y Lógico-Relacional  
- **E3 (Scripts SQL):** Nota 9.5 — Scripts SQL (reclamación en curso)

El SQL de este repositorio (`database/fragify_v2.sql`) es una versión **extendida y no entregada** del E3, que implementa todos los gaps identificados entre el Modelo LR (E2) y los scripts entregados (E3), incluyendo las tablas faltantes, triggers completos y expansión de frontend.

---

*Fragify no está afiliado a Valve Corporation. Counter-Strike 2 es marca registrada de Valve.*
