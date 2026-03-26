#!/usr/bin/env bash
# ============================================================
# Fragify — Backup automatizado de MySQL
# Autor: José Ángel Alejo Sillero
# Uso: ./scripts/backup.sh
# Cron sugerido (diario a las 3:00): 0 3 * * * /ruta/fragify/scripts/backup.sh
# ============================================================

set -euo pipefail

# ── Cargar variables de entorno desde .env del docker-compose
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../docker/.env"

if [[ -f "$ENV_FILE" ]]; then
  set -a && source "$ENV_FILE" && set +a
else
  echo "[backup] ERROR: No se encontró $ENV_FILE"
  exit 1
fi

# ── Configuración
BACKUP_DIR="${BACKUP_DIR:-$SCRIPT_DIR/../backups}"
MYSQL_CONTAINER="${MYSQL_CONTAINER:-fragify_mysql}"
DB_NAME="cs2svss"
RETENTION_DAYS="${RETENTION_DAYS:-30}"         # Borrar backups con más de N días
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/fragify_${DB_NAME}_${TIMESTAMP}.sql.gz"

# ── Telegram helper
send_telegram() {
  local msg="$1"
  if [[ -n "${TELEGRAM_BOT_TOKEN:-}" && -n "${TELEGRAM_CHAT_ID:-}" ]]; then
    curl -s -X POST \
      "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      -d "chat_id=${TELEGRAM_CHAT_ID}" \
      -d "text=${msg}" \
      -d "parse_mode=Markdown" > /dev/null
  fi
}

# ── Crear directorio de backups si no existe
mkdir -p "$BACKUP_DIR"

echo "[backup] Iniciando backup de $DB_NAME — $TIMESTAMP"

# ── Ejecutar mysqldump dentro del contenedor y comprimir
if docker exec "$MYSQL_CONTAINER" mysqldump \
    -u root -p"${MYSQL_ROOT_PASSWORD}" \
    --single-transaction \
    --routines \
    --triggers \
    --events \
    --add-drop-database \
    --databases "$DB_NAME" \
  | gzip > "$BACKUP_FILE"; then

  SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
  echo "[backup] ✓ Backup completado: $BACKUP_FILE ($SIZE)"
  send_telegram "💾 *[FRAGIFY]* Backup completado\nArchivo: \`$(basename "$BACKUP_FILE")\`\nTamaño: $SIZE\n🕐 $(date '+%d/%m/%Y %H:%M')"

else
  echo "[backup] ✗ ERROR en el backup"
  send_telegram "🚨 *[FRAGIFY]* ERROR en backup de BD\n🕐 $(date '+%d/%m/%Y %H:%M')"
  exit 1
fi

# ── Limpiar backups antiguos
DELETED=$(find "$BACKUP_DIR" -name "fragify_${DB_NAME}_*.sql.gz" \
           -mtime "+${RETENTION_DAYS}" -print -delete | wc -l)

if [[ "$DELETED" -gt 0 ]]; then
  echo "[backup] Eliminados $DELETED backups con más de $RETENTION_DAYS días"
fi

# ── Listar backups actuales
echo "[backup] Backups disponibles en $BACKUP_DIR:"
ls -lh "$BACKUP_DIR"/fragify_${DB_NAME}_*.sql.gz 2>/dev/null || echo "(ninguno)"
