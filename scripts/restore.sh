#!/usr/bin/env bash
# ============================================================
# Fragify — Restore de backup MySQL
# Uso: ./scripts/restore.sh <archivo.sql.gz>
#      ./scripts/restore.sh          (lista backups disponibles)
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../docker/.env"
BACKUP_DIR="${BACKUP_DIR:-$SCRIPT_DIR/../backups}"
MYSQL_CONTAINER="${MYSQL_CONTAINER:-fragify_mysql}"

if [[ -f "$ENV_FILE" ]]; then
  set -a && source "$ENV_FILE" && set +a
else
  echo "[restore] ERROR: No se encontró $ENV_FILE"
  exit 1
fi

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

# ── Sin argumento: listar backups disponibles
if [[ $# -eq 0 ]]; then
  echo "[restore] Backups disponibles:"
  ls -lht "$BACKUP_DIR"/fragify_cs2svss_*.sql.gz 2>/dev/null \
    || echo "  (no hay backups en $BACKUP_DIR)"
  echo ""
  echo "Uso: $0 <archivo.sql.gz>"
  exit 0
fi

BACKUP_FILE="$1"

# Buscar el archivo si no es ruta absoluta
if [[ ! -f "$BACKUP_FILE" ]]; then
  BACKUP_FILE="$BACKUP_DIR/$1"
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "[restore] ERROR: Archivo no encontrado: $1"
  exit 1
fi

echo "[restore] ╔══════════════════════════════════════╗"
echo "[restore] ║  ATENCIÓN: ESTO SOBREESCRIBIRÁ cs2svss  ║"
echo "[restore] ╚══════════════════════════════════════╝"
echo "[restore] Archivo: $(basename "$BACKUP_FILE")"
echo -n "[restore] ¿Confirmar restore? (escribe 'CONFIRMAR'): "
read -r CONFIRM

if [[ "$CONFIRM" != "CONFIRMAR" ]]; then
  echo "[restore] Restore cancelado."
  exit 0
fi

echo "[restore] Iniciando restore — $(date '+%d/%m/%Y %H:%M:%S')"

send_telegram "⚠️ *[FRAGIFY]* Iniciando restore de BD\nArchivo: \`$(basename "$BACKUP_FILE")\`\n🕐 $(date '+%d/%m/%Y %H:%M')"

if zcat "$BACKUP_FILE" | docker exec -i "$MYSQL_CONTAINER" \
    mysql -u root -p"${MYSQL_ROOT_PASSWORD}"; then
  echo "[restore] ✓ Restore completado"
  send_telegram "✅ *[FRAGIFY]* Restore completado\nArchivo: \`$(basename "$BACKUP_FILE")\`\n🕐 $(date '+%d/%m/%Y %H:%M')"
else
  echo "[restore] ✗ ERROR en el restore"
  send_telegram "🚨 *[FRAGIFY]* ERROR en restore de BD\n🕐 $(date '+%d/%m/%Y %H:%M')"
  exit 1
fi
