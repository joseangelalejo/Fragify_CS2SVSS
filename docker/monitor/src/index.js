// ============================================================
// Fragify Monitor — Alertas Telegram
// Vigila: MySQL, API, frontend, nuevos usuarios, ataques
// Autor: José Ángel Alejo Sillero
// ============================================================

import mysql from 'mysql2/promise';
import fetch from 'node-fetch';

const {
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
  DATABASE_URL,
  API_URL,
  FRONTEND_URL,
  CHECK_INTERVAL_MS    = '30000',
  NEW_USER_CHECK_MS    = '60000',
  MONITOR_ENV          = 'production',
} = process.env;

// ── Estado interno del monitor
const state = {
  dbUp:           null,   // null = desconocido (primera vez)
  apiUp:          null,
  frontendUp:     null,
  lastNewUserId:  0,      // Último id_usuario visto
  lastReportId:   0,      // Último id_reporte visto
  failedLogins:   {},     // IP → intentos fallidos en últimos 5 min
  startedAt:      new Date(),
};

// ── Parsear DATABASE_URL
function parseDbUrl(url) {
  const m = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (!m) throw new Error('DATABASE_URL inválida');
  return { user: m[1], password: m[2], host: m[3], port: +m[4], database: m[5] };
}

// ── Pool de conexiones MySQL
let pool = null;
function getPool() {
  if (!pool) {
    pool = mysql.createPool({ ...parseDbUrl(DATABASE_URL), connectionLimit: 3 });
  }
  return pool;
}

// ============================================================
// TELEGRAM
// ============================================================
async function sendTelegram(message, emoji = '') {
  const text = `${emoji ? emoji + ' ' : ''}*[FRAGIFY ${MONITOR_ENV.toUpperCase()}]*\n${message}`;
  try {
    await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text,
          parse_mode: 'Markdown',
        }),
      }
    );
  } catch (err) {
    console.error('[Monitor] Error enviando Telegram:', err.message);
  }
}

function ts() {
  return new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
}

// ============================================================
// CHECK: BASE DE DATOS
// ============================================================
async function checkDatabase() {
  try {
    const conn = await getPool().getConnection();
    await conn.ping();
    conn.release();

    if (state.dbUp === false) {
      // Recuperación tras caída
      await sendTelegram(
        `✅ MySQL recuperado\n🕐 ${ts()}`,
        '🔄'
      );
    }
    state.dbUp = true;
  } catch (err) {
    if (state.dbUp !== false) {
      await sendTelegram(
        `❌ *MySQL caído*\nError: \`${err.message}\`\n🕐 ${ts()}`,
        '🚨'
      );
    }
    state.dbUp = false;
    pool = null; // Forzar reconexión en el siguiente ciclo
  }
}

// ============================================================
// CHECK: API (backend homelab)
// ============================================================
async function checkApi() {
  try {
    const res = await fetch(`${API_URL}/api/health`, { timeout: 8000 });
    const ok = res.ok;

    if (!ok && state.apiUp !== false) {
      await sendTelegram(
        `❌ *API caída* (HTTP ${res.status})\nURL: ${API_URL}\n🕐 ${ts()}`,
        '🚨'
      );
    } else if (ok && state.apiUp === false) {
      await sendTelegram(
        `✅ API recuperada\n🕐 ${ts()}`,
        '🔄'
      );
    }
    state.apiUp = ok;
  } catch (err) {
    if (state.apiUp !== false) {
      await sendTelegram(
        `❌ *API inaccesible*\nError: \`${err.message}\`\n🕐 ${ts()}`,
        '🚨'
      );
    }
    state.apiUp = false;
  }
}

// ============================================================
// CHECK: FRONTEND (Vercel)
// ============================================================
async function checkFrontend() {
  if (!FRONTEND_URL) return;
  try {
    const res = await fetch(FRONTEND_URL, { timeout: 10000, method: 'HEAD' });
    const ok = res.ok || res.status === 308; // Vercel redirect

    if (!ok && state.frontendUp !== false) {
      await sendTelegram(
        `❌ *Frontend caído* (HTTP ${res.status})\nURL: ${FRONTEND_URL}\n🕐 ${ts()}`,
        '🚨'
      );
    } else if (ok && state.frontendUp === false) {
      await sendTelegram(
        `✅ Frontend recuperado\n🕐 ${ts()}`,
        '🔄'
      );
    }
    state.frontendUp = ok;
  } catch (err) {
    if (state.frontendUp !== false) {
      await sendTelegram(
        `❌ *Frontend inaccesible*\nError: \`${err.message}\`\n🕐 ${ts()}`,
        '🚨'
      );
    }
    state.frontendUp = false;
  }
}

// ============================================================
// CHECK: NUEVOS USUARIOS FRAGIFY
// ============================================================
async function checkNewUsers() {
  if (!state.dbUp) return;
  try {
    const [rows] = await getPool().query(
      `SELECT uf.id_usuario, uf.email, uf.fecha_registro, j.nombre_usuario_steam
       FROM usuarios_fragify uf
       JOIN jugadores_cs2 j ON uf.steam_id64 = j.steam_id64
       WHERE uf.id_usuario > ?
       ORDER BY uf.id_usuario ASC
       LIMIT 10`,
      [state.lastNewUserId]
    );

    for (const user of rows) {
      await sendTelegram(
        `👤 *Nuevo usuario registrado*\n` +
        `Steam: \`${user.nombre_usuario_steam}\`\n` +
        `Email: ${user.email || '—'}\n` +
        `🕐 ${new Date(user.fecha_registro).toLocaleString('es-ES')}`,
        '🎮'
      );
      state.lastNewUserId = user.id_usuario;
    }
  } catch (err) {
    console.error('[Monitor] Error en checkNewUsers:', err.message);
  }
}

// ============================================================
// CHECK: NUEVOS REPORTES DE CONDUCTA
// ============================================================
async function checkNewReports() {
  if (!state.dbUp) return;
  try {
    const [rows] = await getPool().query(
      `SELECT r.id_reporte, r.fecha_reporte,
              ti.codigo AS tipo, ti.severidad,
              j1.nombre_usuario_steam AS reportado,
              j2.nombre_usuario_steam AS reportador
       FROM reportes_conducta r
       JOIN tipos_infraccion ti ON r.id_tipo_infraccion = ti.id_tipo_infraccion
       JOIN jugadores_cs2 j1 ON r.steam_id64_reportado  = j1.steam_id64
       JOIN jugadores_cs2 j2 ON r.steam_id64_reportador = j2.steam_id64
       WHERE r.id_reporte > ?
       ORDER BY r.id_reporte ASC
       LIMIT 5`,
      [state.lastReportId]
    );

    const severityEmoji = { 1: '🟡', 2: '🟠', 3: '🔴' };
    for (const r of rows) {
      await sendTelegram(
        `${severityEmoji[r.severidad] || '⚪'} *Nuevo reporte de conducta*\n` +
        `Tipo: \`${r.tipo}\` (severidad ${r.severidad}/3)\n` +
        `Reportado: \`${r.reportado}\`\n` +
        `Reportador: \`${r.reportador}\`\n` +
        `🕐 ${new Date(r.fecha_reporte).toLocaleString('es-ES')}`,
        '🚩'
      );
      state.lastReportId = r.id_reporte;
    }
  } catch (err) {
    console.error('[Monitor] Error en checkNewReports:', err.message);
  }
}

// ============================================================
// CHECK: POSIBLES ATAQUES
// Detecta: muchos reportes en poco tiempo (mismo reportador),
//          picos de registros (posible bot), logs de errores.
// ============================================================
async function checkAnomalies() {
  if (!state.dbUp) return;
  try {
    // Detectar spam de reportes: mismo reportador, > 5 reportes en 5 minutos
    const [spamRows] = await getPool().query(`
      SELECT j.nombre_usuario_steam, COUNT(*) AS num_reportes
      FROM reportes_conducta r
      JOIN jugadores_cs2 j ON r.steam_id64_reportador = j.steam_id64
      WHERE r.fecha_reporte > DATE_SUB(NOW(), INTERVAL 5 MINUTE)
      GROUP BY r.steam_id64_reportador
      HAVING num_reportes >= 5
    `);

    for (const row of spamRows) {
      await sendTelegram(
        `⚠️ *Posible spam de reportes*\n` +
        `Usuario: \`${row.nombre_usuario_steam}\`\n` +
        `Reportes en últimos 5 min: *${row.num_reportes}*\n` +
        `🕐 ${ts()}`,
        '🛡️'
      );
    }

    // Detectar pico de registros: > 10 usuarios en 5 minutos
    const [[{ nuevos }]] = await getPool().query(`
      SELECT COUNT(*) AS nuevos
      FROM usuarios_fragify
      WHERE fecha_registro > DATE_SUB(NOW(), INTERVAL 5 MINUTE)
    `);

    if (nuevos >= 10) {
      await sendTelegram(
        `⚠️ *Pico de registros sospechoso*\n` +
        `*${nuevos}* usuarios registrados en los últimos 5 minutos\n` +
        `Posible bot o ataque de registro masivo\n` +
        `🕐 ${ts()}`,
        '🛡️'
      );
    }
  } catch (err) {
    console.error('[Monitor] Error en checkAnomalies:', err.message);
  }
}

// ============================================================
// ARRANQUE
// ============================================================
async function main() {
  console.log(`[Monitor] Fragify Monitor arrancado — ${ts()}`);
  console.log(`[Monitor] API: ${API_URL} | Frontend: ${FRONTEND_URL}`);
  console.log(`[Monitor] Check interval: ${CHECK_INTERVAL_MS}ms | New user check: ${NEW_USER_CHECK_MS}ms`);

  // Notificar arranque
  await sendTelegram(
    `🚀 *Monitor arrancado*\n` +
    `Entorno: \`${MONITOR_ENV}\`\n` +
    `Vigilando: MySQL, API, Frontend, usuarios y conducta\n` +
    `🕐 ${ts()}`,
    '✅'
  );

  // Inicializar lastReportId y lastNewUserId al valor actual (no alertar histórico)
  try {
    const [[{ maxUser }]] = await getPool().query(
      'SELECT IFNULL(MAX(id_usuario), 0) AS maxUser FROM usuarios_fragify'
    );
    const [[{ maxReport }]] = await getPool().query(
      'SELECT IFNULL(MAX(id_reporte), 0) AS maxReport FROM reportes_conducta'
    );
    state.lastNewUserId = maxUser;
    state.lastReportId  = maxReport;
    console.log(`[Monitor] Baseline — lastUser: ${maxUser}, lastReport: ${maxReport}`);
    state.dbUp = true;
  } catch (err) {
    console.warn('[Monitor] No se pudo establecer baseline (BD no disponible aún):', err.message);
    state.dbUp = false;
  }

  // ── Loop de checks de infraestructura (cada CHECK_INTERVAL_MS)
  setInterval(async () => {
    await checkDatabase();
    await checkApi();
    await checkFrontend();
    await checkAnomalies();
  }, parseInt(CHECK_INTERVAL_MS));

  // ── Loop de nuevos eventos de BD (cada NEW_USER_CHECK_MS)
  setInterval(async () => {
    await checkNewUsers();
    await checkNewReports();
  }, parseInt(NEW_USER_CHECK_MS));

  // Ejecutar inmediatamente el primer ciclo
  await checkDatabase();
  await checkApi();
  await checkFrontend();
}

main().catch(async (err) => {
  console.error('[Monitor] Error fatal:', err);
  await sendTelegram(
    `💀 *Monitor caído con error fatal*\n\`${err.message}\`\n🕐 ${ts()}`,
    '🚨'
  );
  process.exit(1);
});
