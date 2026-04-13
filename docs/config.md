# Configuración - Fragify

## Variables de Entorno

| Variable | Descripción | Required |
|----------|-------------|----------|
| NEXT_PUBLIC_STEAM_API_KEY | Steam API Key para autenticación | ✅ |
| DATABASE_URL | Conexión a TiDB Cloud | ✅ |
| TELEGRAM_BOT_TOKEN | Token del bot Telegram | ✅ |
| NEXT_PUBLIC_API_URL | URL del API | ⚠️ |
| JWT_SECRET | Secret para JWT tokens | ✅ |

## Base de Datos

La aplicación usa TiDB Cloud (compatible con MySQL). 

### Esquema Principal

- `users` - Usuarios registrados
- `players` - Perfiles de jugadores
- `matches` - Historial de partidas
- `stats` - Estadísticas calculadas
- `leaderboards` - Rankings por modo
