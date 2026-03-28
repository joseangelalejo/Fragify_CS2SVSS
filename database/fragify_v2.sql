-- ============================================================
-- CS2-SVSS (Fragify) — Base de Datos Extendida
-- Versión: 2.0 | Fecha: 26/03/2026 | Autor: José Ángel Alejo Sillero
-- Módulo: Base de Datos — 1º DAW
-- Descripción: SQL completo ampliado respecto al E3 (v1.0).
--   Añade tablas faltantes del Modelo LR (E2), atributos ausentes
--   en tablas existentes, triggers de la ERS (sección 3.2.7),
--   expansión de frontend (usuarios_fragify, tipos_infraccion),
--   vistas actualizadas y permisos revisados.
-- Compatible con MySQL 8.0.11 | InnoDB | utf8mb4_unicode_ci
-- ============================================================

-- ============================================================
-- BLOQUE 0: INICIALIZACIÓN
-- ============================================================

DROP DATABASE IF EXISTS cs2svss;
CREATE DATABASE cs2svss CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cs2svss;

-- Desactivar comprobaciones de FK durante la creación inicial
-- para poder declarar tablas sin respetar orden de dependencias
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- BLOQUE 1: TABLAS CATÁLOGO (sin dependencias externas)
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- TABLA: mapas
-- Catálogo de mapas del juego. Sustituye el ENUM en partidas_cs2.
-- Permite añadir mapas nuevos sin ALTER TABLE; mejora extensibilidad (ERS).
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS mapas;
CREATE TABLE mapas (
    id_mapa       INT           PRIMARY KEY AUTO_INCREMENT,
    nombre_mapa   VARCHAR(50)   NOT NULL UNIQUE,   /* Nombre interno (de_dust2, de_mirage…) */
    nombre_display VARCHAR(80)  NOT NULL,           /* Nombre legible para UI (Dust 2, Mirage…) */
    activo        TINYINT       NOT NULL DEFAULT 1  /* 0 = retirado del pool competitivo */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE mapas
    ADD CONSTRAINT chk_mapas_activo CHECK (activo IN (0, 1));

-- Pool competitivo CS2 inicial
INSERT INTO mapas (nombre_mapa, nombre_display, activo) VALUES
    ('de_ancient',   'Ancient',   1),
    ('de_anubis',    'Anubis',    1),
    ('de_dust2',     'Dust 2',    1),
    ('de_inferno',   'Inferno',   1),
    ('de_mirage',    'Mirage',    1),
    ('de_nuke',      'Nuke',      1),
    ('de_vertigo',   'Vertigo',   1),
    ('de_train',     'Train',     0), /* Retirado */
    ('de_overpass',  'Overpass',  0); /* Retirado */

-- ─────────────────────────────────────────────────────────────
-- TABLA: modos_juego
-- Catálogo de modos. Sustituye el ENUM en partidas_cs2.
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS modos_juego;
CREATE TABLE modos_juego (
    id_modo     INT          PRIMARY KEY AUTO_INCREMENT,
    nombre_modo VARCHAR(50)  NOT NULL UNIQUE,  /* COMPETITIVO, PREMIER, CASUAL… */
    descripcion VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO modos_juego (nombre_modo, descripcion) VALUES
    ('COMPETITIVO', 'Modo ranked por mapa con sistema de rangos Silver-Global Elite'),
    ('PREMIER',     'Modo ranked global con sistema de puntos ELO (0-40000)'),
    ('CASUAL',      'Partidas sin impacto en ranking'),
    ('DEATHMATCH',  'Modo de entrenamiento sin rondas');

-- ─────────────────────────────────────────────────────────────
-- TABLA: tipos_infraccion
-- Normaliza el campo motivo de reportes_conducta (3FN estricta).
-- Permite añadir tipos de infracción sin ALTER TABLE.
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS tipos_infraccion;
CREATE TABLE tipos_infraccion (
    id_tipo_infraccion  INT          PRIMARY KEY AUTO_INCREMENT,
    codigo              VARCHAR(30)  NOT NULL UNIQUE,   /* GRIEFING, CHEATING… */
    descripcion         VARCHAR(255) NOT NULL,
    severidad           TINYINT      NOT NULL DEFAULT 1 /* 1=leve, 2=moderada, 3=grave */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE tipos_infraccion
    ADD CONSTRAINT chk_severidad CHECK (severidad BETWEEN 1 AND 3);

INSERT INTO tipos_infraccion (codigo, descripcion, severidad) VALUES
    ('GRIEFING',  'Sabotaje deliberado al equipo propio',              2),
    ('CHEATING',  'Uso de trampas o software no autorizado',           3),
    ('TOXICITY',  'Comportamiento tóxico, insultos o acoso verbal',    1),
    ('SMURFING',  'Jugar con cuenta alternativa en nivel inferior',    2),
    ('AFK',       'Abandono o inactividad durante la partida',         1),
    ('OTRO',      'Otro tipo de infracción no categorizada',           1);

-- ============================================================
-- BLOQUE 2: TABLAS ENTIDADES PRINCIPALES
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- TABLA: jugadores_cs2  (v1.0 + atributos añadidos)
-- Añadidos: region_geografica, estado_verificacion CHECK
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS jugadores_cs2;
CREATE TABLE jugadores_cs2 (
    steam_id64                  VARCHAR(17)  PRIMARY KEY,
    nombre_usuario_steam        VARCHAR(255) NOT NULL,
    fecha_registro_fragify      DATETIME     NOT NULL,
    estado_verificacion         TINYINT      NOT NULL DEFAULT 0,
    clave_juego_unica           VARCHAR(255),                         /* Nullable: acceso a datos avanzados */
    ultima_actualizacion_datos  DATETIME     NOT NULL,
    estado_actividad            TINYINT      NOT NULL DEFAULT 1,
    region_geografica           VARCHAR(50)  NULL                     /* [NUEVO] p.ej. 'EU-West', 'NA-East' */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE jugadores_cs2
    ADD CONSTRAINT chk_steam_id64_format
        CHECK (steam_id64 REGEXP '^[0-9]{17}$'),
    ADD CONSTRAINT chk_estado_verificacion
        CHECK (estado_verificacion IN (0, 1)),
    ADD CONSTRAINT chk_estado_actividad
        CHECK (estado_actividad IN (0, 1));

CREATE INDEX idx_nombre_usuario       ON jugadores_cs2 (nombre_usuario_steam);
CREATE INDEX idx_estado_verificacion  ON jugadores_cs2 (estado_verificacion);
CREATE INDEX idx_estado_actividad     ON jugadores_cs2 (estado_actividad);
CREATE INDEX idx_region_geografica    ON jugadores_cs2 (region_geografica);

-- ─────────────────────────────────────────────────────────────
-- TABLA: servidores_cs2  (v1.0 + atributos añadidos)
-- Añadidos: estado_actual, proveedor_infraestructura
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS servidores_cs2;
CREATE TABLE servidores_cs2 (
    id_servidor               INT          PRIMARY KEY AUTO_INCREMENT,
    ip_servidor               VARCHAR(45)  NOT NULL,
    region                    VARCHAR(50)  NOT NULL,
    tipo_servidor             ENUM('OFICIAL', 'COMUNITARIO') NOT NULL,
    ping_promedio             INT,
    ultima_actualizacion      DATETIME     NOT NULL,
    estado_actual             ENUM('ACTIVO', 'MANTENIMIENTO', 'INACTIVO')
                                           NOT NULL DEFAULT 'ACTIVO',  /* [NUEVO] */
    proveedor_infraestructura VARCHAR(100) NULL                         /* [NUEVO] p.ej. 'Valve', 'AWS' */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE servidores_cs2
    ADD CONSTRAINT chk_ping CHECK (ping_promedio >= 0 OR ping_promedio IS NULL);

CREATE INDEX idx_region       ON servidores_cs2 (region);
CREATE INDEX idx_tipo_servidor ON servidores_cs2 (tipo_servidor);
CREATE INDEX idx_estado_actual ON servidores_cs2 (estado_actual);

-- ─────────────────────────────────────────────────────────────
-- TABLA: usuarios_fragify  [NUEVA — expansión frontend]
-- Usuarios registrados en la plataforma web con Steam OAuth.
-- Preparada para autenticación; separada de jugadores_cs2
-- para no acoplar identidad Steam con cuenta de plataforma.
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS usuarios_fragify;
CREATE TABLE usuarios_fragify (
    id_usuario          INT          PRIMARY KEY AUTO_INCREMENT,
    steam_id64          VARCHAR(17)  NOT NULL UNIQUE,  /* FK 1:1 a jugadores_cs2 */
    email               VARCHAR(255) NULL UNIQUE,
    fecha_registro      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ultimo_acceso       DATETIME,
    rol_plataforma      ENUM('USUARIO', 'MODERADOR', 'ADMIN')
                                     NOT NULL DEFAULT 'USUARIO',
    activo              TINYINT      NOT NULL DEFAULT 1,
    token_oauth         VARCHAR(512) NULL,              /* Token Steam OAuth (cifrado en app) */
    FOREIGN KEY (steam_id64)
        REFERENCES jugadores_cs2(steam_id64)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE usuarios_fragify
    ADD CONSTRAINT chk_uf_activo CHECK (activo IN (0, 1));

CREATE INDEX idx_uf_steam      ON usuarios_fragify (steam_id64);
CREATE INDEX idx_uf_email      ON usuarios_fragify (email);
CREATE INDEX idx_uf_rol        ON usuarios_fragify (rol_plataforma);

-- ============================================================
-- BLOQUE 3: TABLAS DE DATOS CENTRALES
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- TABLA: estadisticas_cs2  (v1.0 + atributos añadidos)
-- Añadidos: precision_disparo, ratio_headshots, dano_promedio_ronda,
--           total_partidas_jugadas, total_partidas_ganadas, porcentaje_victorias
-- Los 3 últimos se actualizan automáticamente mediante trigger.
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS estadisticas_cs2;
CREATE TABLE estadisticas_cs2 (
    id_estadistica          INT           PRIMARY KEY AUTO_INCREMENT,
    steam_id64              VARCHAR(17)   NOT NULL,
    kills                   INT           NOT NULL DEFAULT 0,
    deaths                  INT           NOT NULL DEFAULT 0,
    assists                 INT           NOT NULL DEFAULT 0,
    headshots               INT           NOT NULL DEFAULT 0,
    clutches                INT           NOT NULL DEFAULT 0,
    kd_ratio                DECIMAL(5,2)  NOT NULL DEFAULT 0.00,
    mvps                    INT           NOT NULL DEFAULT 0,
    tiempo_jugado           INT           NOT NULL DEFAULT 0,  /* minutos totales */
    precision_disparo       DECIMAL(5,2)  NULL,                /* [NUEVO] % disparos acertados */
    ratio_headshots         DECIMAL(5,2)  NULL,                /* [NUEVO] % kills que son HS */
    dano_promedio_ronda     DECIMAL(7,2)  NULL,                /* [NUEVO] ADR: Average Damage per Round */
    total_partidas_jugadas  INT           NOT NULL DEFAULT 0,  /* [NUEVO] se actualiza por trigger */
    total_partidas_ganadas  INT           NOT NULL DEFAULT 0,  /* [NUEVO] se actualiza por trigger */
    porcentaje_victorias    DECIMAL(5,2)  GENERATED ALWAYS AS  /* [NUEVO] columna calculada */
                                (CASE WHEN total_partidas_jugadas = 0 THEN 0.00
                                 ELSE ROUND(total_partidas_ganadas /
                                            total_partidas_jugadas * 100, 2)
                                 END) STORED,
    ultima_actualizacion    DATETIME      NOT NULL,
    FOREIGN KEY (steam_id64)
        REFERENCES jugadores_cs2(steam_id64)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE estadisticas_cs2
    ADD CONSTRAINT chk_kd_ratio           CHECK (kd_ratio >= 0),
    ADD CONSTRAINT chk_tiempo_jugado      CHECK (tiempo_jugado >= 0),
    ADD CONSTRAINT chk_precision_disparo  CHECK (precision_disparo BETWEEN 0 AND 100
                                                  OR precision_disparo IS NULL),
    ADD CONSTRAINT chk_ratio_hs           CHECK (ratio_headshots BETWEEN 0 AND 100
                                                  OR ratio_headshots IS NULL),
    ADD CONSTRAINT chk_adr               CHECK (dano_promedio_ronda >= 0
                                                  OR dano_promedio_ronda IS NULL),
    ADD CONSTRAINT chk_partidas_ganadas   CHECK (total_partidas_ganadas <= total_partidas_jugadas);

CREATE INDEX idx_steam_estadisticas ON estadisticas_cs2 (steam_id64);
CREATE INDEX idx_kd_ratio           ON estadisticas_cs2 (kd_ratio);
CREATE INDEX idx_pct_victorias      ON estadisticas_cs2 (porcentaje_victorias);

-- ─────────────────────────────────────────────────────────────
-- TABLA: rankings_cs2  (v1.0 + CHECK puntos_elo mejorado)
-- El CHECK de ELO limita a 40000 (máximo del sistema PREMIER de CS2).
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS rankings_cs2;
CREATE TABLE rankings_cs2 (
    id_ranking          INT          PRIMARY KEY AUTO_INCREMENT,
    steam_id64          VARCHAR(17)  NOT NULL,
    tipo_ranking        ENUM('PREMIERE', 'MAPA') NOT NULL,
    id_mapa             INT          NULL,  /* FK a mapas (solo si tipo_ranking='MAPA') */
    mapa                VARCHAR(50)  NULL,  /* Nombre legacy — mantenido por compatibilidad */
    puntos_elo          INT          NOT NULL DEFAULT 0,
    tier                VARCHAR(20)  NOT NULL,
    victorias_mapa      INT          NULL DEFAULT 0,  /* [NUEVO] solo para tipo='MAPA' */
    posicion_global     INT          NULL,
    ultima_actualizacion DATETIME   NOT NULL,
    FOREIGN KEY (steam_id64)
        REFERENCES jugadores_cs2(steam_id64)
        ON DELETE CASCADE,
    FOREIGN KEY (id_mapa)
        REFERENCES mapas(id_mapa)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE rankings_cs2
    ADD CONSTRAINT chk_puntos_elo       CHECK (puntos_elo BETWEEN 0 AND 40000),
    ADD CONSTRAINT chk_posicion_global  CHECK (posicion_global > 0 OR posicion_global IS NULL),
    ADD CONSTRAINT chk_victorias_mapa   CHECK (victorias_mapa >= 0 OR victorias_mapa IS NULL);

CREATE INDEX idx_steam_rankings ON rankings_cs2 (steam_id64);
CREATE INDEX idx_tipo_ranking   ON rankings_cs2 (tipo_ranking);
CREATE INDEX idx_puntos_elo     ON rankings_cs2 (puntos_elo DESC);
CREATE INDEX idx_id_mapa_rank   ON rankings_cs2 (id_mapa);

-- ─────────────────────────────────────────────────────────────
-- TABLA: partidas_cs2  (v1.0 + atributos añadidos + FK a modo y mapa)
-- Añadidos: id_mapa (FK), id_modo (FK), codigo_comparticion_demo,
--           resultado_puntuacion, version_juego, id_partida_valve
-- NOTA: steam_id64 se ELIMINA de esta tabla — la relación N:M
--       correcta se implementa en partida_jugador (tabla intermedia).
--       Se mantiene con NULL para compatibilidad durante migración.
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS partidas_cs2;
CREATE TABLE partidas_cs2 (
    id_partida              VARCHAR(50)  PRIMARY KEY,   /* ID Valve */
    id_mapa                 INT          NULL,           /* [NUEVO] FK a mapas */
    mapa                    VARCHAR(50)  NULL,           /* Legacy, NULL si id_mapa presente */
    id_modo                 INT          NULL,           /* [NUEVO] FK a modos_juego */
    modo                    ENUM('COMPETITIVO', 'PREMIER') NULL, /* Legacy */
    duracion_minutos        INT          NOT NULL,
    fecha_partida           DATETIME     NOT NULL,
    id_servidor             INT          NULL,
    codigo_comparticion_demo VARCHAR(50) NULL UNIQUE,   /* [NUEVO] formato CSGO-XXXXX-… */
    resultado_puntuacion    VARCHAR(10)  NULL,           /* [NUEVO] e.g. '13-11', '16-4' */
    version_juego           VARCHAR(20)  NULL,           /* [NUEVO] e.g. '13992' */
    id_partida_valve        VARCHAR(50)  NULL,           /* [NUEVO] ID alternativo Valve (nullable) */
    /* Columnas legacy mantenidas para no romper scripts v1.0 en producción */
    steam_id64              VARCHAR(17)  NULL,
    resultado               ENUM('VICTORIA', 'DERROTA') NULL,
    kills                   INT          NULL DEFAULT 0,
    deaths                  INT          NULL DEFAULT 0,
    FOREIGN KEY (id_mapa)
        REFERENCES mapas(id_mapa)
        ON DELETE SET NULL,
    FOREIGN KEY (id_modo)
        REFERENCES modos_juego(id_modo)
        ON DELETE SET NULL,
    FOREIGN KEY (id_servidor)
        REFERENCES servidores_cs2(id_servidor)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE partidas_cs2
    ADD CONSTRAINT chk_duracion
        CHECK (duracion_minutos BETWEEN 1 AND 120),
    ADD CONSTRAINT chk_demo_format
        CHECK (codigo_comparticion_demo REGEXP
               '^CSGO-[A-Za-z0-9]{5}-[A-Za-z0-9]{10}-[A-Za-z0-9]{5}-[A-Za-z0-9]{5}$'
               OR codigo_comparticion_demo IS NULL),
    ADD CONSTRAINT chk_resultado_puntuacion
        CHECK (resultado_puntuacion REGEXP '^[0-9]{1,2}-[0-9]{1,2}$'
               OR resultado_puntuacion IS NULL);

CREATE INDEX idx_fecha_partida ON partidas_cs2 (fecha_partida);
CREATE INDEX idx_id_mapa       ON partidas_cs2 (id_mapa);
CREATE INDEX idx_id_modo       ON partidas_cs2 (id_modo);
CREATE INDEX idx_id_servidor   ON partidas_cs2 (id_servidor);
-- Índice legacy para compatibilidad con consultas v1.0
CREATE INDEX idx_steam_partidas ON partidas_cs2 (steam_id64);

-- ============================================================
-- BLOQUE 4: TABLAS RELACIONALES (N:M y dependientes)
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- TABLA: partida_jugador  [NUEVA — tabla intermedia N:M]
-- Una partida CS2 tiene exactamente 10 jugadores (5v5).
-- Esta tabla reemplaza la relación 1:N que había en v1.0.
-- Contiene stats POR PARTIDA de cada jugador (granularidad máxima).
-- Equivale a rendimiento_partida_jugador del Modelo LR (E2).
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS partida_jugador;
CREATE TABLE partida_jugador (
    id_partida          VARCHAR(50)  NOT NULL,
    steam_id64          VARCHAR(17)  NOT NULL,
    /* Stats de la partida para este jugador */
    equipo              ENUM('T', 'CT') NOT NULL,   /* Terrorista o Contraterrorista (primera mitad) */
    abandono            TINYINT      NOT NULL DEFAULT 0,
    kills               INT          NOT NULL DEFAULT 0,
    deaths              INT          NOT NULL DEFAULT 0,
    assists             INT          NOT NULL DEFAULT 0,
    headshots           INT          NOT NULL DEFAULT 0,
    dano_total          INT          NOT NULL DEFAULT 0,   /* Daño infligido en la partida */
    precision_disparo   DECIMAL(5,2) NULL,
    mvp                 TINYINT      NOT NULL DEFAULT 0,
    resultado           ENUM('VICTORIA', 'DERROTA', 'EMPATE') NOT NULL,
    /* PK compuesta */
    PRIMARY KEY (id_partida, steam_id64),
    FOREIGN KEY (id_partida)
        REFERENCES partidas_cs2(id_partida)
        ON DELETE CASCADE,
    FOREIGN KEY (steam_id64)
        REFERENCES jugadores_cs2(steam_id64)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE partida_jugador
    ADD CONSTRAINT chk_pj_abandono   CHECK (abandono IN (0, 1)),
    ADD CONSTRAINT chk_pj_mvp        CHECK (mvp IN (0, 1)),
    ADD CONSTRAINT chk_pj_kills      CHECK (kills >= 0),
    ADD CONSTRAINT chk_pj_deaths     CHECK (deaths >= 0),
    ADD CONSTRAINT chk_pj_assists    CHECK (assists >= 0),
    ADD CONSTRAINT chk_pj_headshots  CHECK (headshots >= 0),
    ADD CONSTRAINT chk_pj_dano       CHECK (dano_total >= 0),
    ADD CONSTRAINT chk_pj_precision  CHECK (precision_disparo BETWEEN 0 AND 100
                                             OR precision_disparo IS NULL);

CREATE INDEX idx_pj_steam    ON partida_jugador (steam_id64);
CREATE INDEX idx_pj_partida  ON partida_jugador (id_partida);
CREATE INDEX idx_pj_resultado ON partida_jugador (resultado);

-- ─────────────────────────────────────────────────────────────
-- TABLA: historico_ranking_premiere  [NUEVA]
-- Guarda instantáneas del ELO cada vez que cambia.
-- Permite a Fragify mostrar gráfica de evolución del ranking.
-- Se alimenta automáticamente mediante trigger tr_snapshot_elo.
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS historico_ranking_premiere;
CREATE TABLE historico_ranking_premiere (
    id_historico     INT          PRIMARY KEY AUTO_INCREMENT,
    steam_id64       VARCHAR(17)  NOT NULL,
    puntos_elo       INT          NOT NULL,
    tier             VARCHAR(20)  NOT NULL,
    fecha_snapshot   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    variacion_elo    INT          NULL,  /* Diferencia con snapshot anterior (+/-) */
    FOREIGN KEY (steam_id64)
        REFERENCES jugadores_cs2(steam_id64)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE historico_ranking_premiere
    ADD CONSTRAINT chk_hist_elo CHECK (puntos_elo BETWEEN 0 AND 40000);

CREATE INDEX idx_hist_steam   ON historico_ranking_premiere (steam_id64);
CREATE INDEX idx_hist_fecha   ON historico_ranking_premiere (fecha_snapshot);
CREATE INDEX idx_hist_elo     ON historico_ranking_premiere (puntos_elo);

-- ─────────────────────────────────────────────────────────────
-- TABLA: reportes_conducta  (v1.0 + FK a partida + FK a tipo_infraccion)
-- Añadidos: id_partida (FK, requerida por ERS para referenciar demo),
--           id_tipo_infraccion (FK, normaliza motivo)
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS reportes_conducta;
CREATE TABLE reportes_conducta (
    id_reporte              INT          PRIMARY KEY AUTO_INCREMENT,
    steam_id64_reportado    VARCHAR(17)  NOT NULL,
    steam_id64_reportador   VARCHAR(17)  NOT NULL,
    id_tipo_infraccion      INT          NOT NULL,   /* [NUEVO] FK a tipos_infraccion */
    motivo                  ENUM('GRIEFING', 'CHEATING', 'TOXICITY', 'OTRO') NULL, /* Legacy */
    descripcion             TEXT,
    evidencia               VARCHAR(255),
    id_partida              VARCHAR(50)  NULL,       /* [NUEVO] FK a partidas_cs2 (demo) */
    fecha_reporte           DATETIME     NOT NULL,
    estado_reporte          ENUM('PENDIENTE', 'REVISADO', 'RESUELTO')
                                         NOT NULL DEFAULT 'PENDIENTE',
    FOREIGN KEY (steam_id64_reportado)
        REFERENCES jugadores_cs2(steam_id64)
        ON DELETE CASCADE,
    FOREIGN KEY (steam_id64_reportador)
        REFERENCES jugadores_cs2(steam_id64)
        ON DELETE CASCADE,
    FOREIGN KEY (id_tipo_infraccion)
        REFERENCES tipos_infraccion(id_tipo_infraccion)
        ON DELETE RESTRICT,
    FOREIGN KEY (id_partida)
        REFERENCES partidas_cs2(id_partida)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_reportado     ON reportes_conducta (steam_id64_reportado);
CREATE INDEX idx_reportador    ON reportes_conducta (steam_id64_reportador);
CREATE INDEX idx_estado_reporte ON reportes_conducta (estado_reporte);
CREATE INDEX idx_reporte_tipo  ON reportes_conducta (id_tipo_infraccion);
CREATE INDEX idx_reporte_partida ON reportes_conducta (id_partida);

-- ─────────────────────────────────────────────────────────────
-- TABLA: logs_auditoria  (v1.0 — sin cambios estructurales)
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS logs_auditoria;
CREATE TABLE logs_auditoria (
    id_log              INT          PRIMARY KEY AUTO_INCREMENT,
    tabla_afectada      VARCHAR(50)  NOT NULL,
    accion              ENUM('INSERT', 'UPDATE', 'DELETE', 'SELECT') NOT NULL,
    steam_id64_usuario  VARCHAR(17),
    descripcion         TEXT,
    fecha_log           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_origen           VARCHAR(45)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_tabla_afectada ON logs_auditoria (tabla_afectada);
CREATE INDEX idx_fecha_log      ON logs_auditoria (fecha_log);
CREATE INDEX idx_steam_log      ON logs_auditoria (steam_id64_usuario);

-- Reactivar FK checks
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- BLOQUE 5: TRIGGERS
-- ERS Sección 3.2.7 — 4 triggers solicitados
-- ============================================================

DELIMITER $$

-- ─────────────────────────────────────────────────────────────
-- TRIGGER 1: tr_recalcular_estadisticas
-- Disparo: AFTER INSERT en partida_jugador
-- Función: Recalcula estadísticas agregadas en estadisticas_cs2
--          cuando se registra una nueva fila de rendimiento por partida.
--          Si no existe fila en estadisticas_cs2 para ese jugador, la crea.
-- ERS 3.2.7 — Requisito 1
-- ─────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS tr_recalcular_estadisticas$$
CREATE TRIGGER tr_recalcular_estadisticas
AFTER INSERT ON partida_jugador
FOR EACH ROW
BEGIN
    -- Insertar fila si el jugador aún no tiene estadísticas globales
    INSERT INTO estadisticas_cs2 (
        steam_id64, kills, deaths, assists, headshots, kd_ratio, mvps,
        tiempo_jugado, total_partidas_jugadas, total_partidas_ganadas,
        ultima_actualizacion
    )
    SELECT
        NEW.steam_id64,
        0, 0, 0, 0, 0.00, 0, 0, 0, 0,
        NOW()
    FROM DUAL
    WHERE NOT EXISTS (
        SELECT 1 FROM estadisticas_cs2 WHERE steam_id64 = NEW.steam_id64
    );

    -- Recalcular desde cero a partir de partida_jugador (fuente de verdad)
    UPDATE estadisticas_cs2 e
    INNER JOIN (
        SELECT
            pj.steam_id64,
            SUM(pj.kills)                                            AS total_kills,
            SUM(pj.deaths)                                           AS total_deaths,
            SUM(pj.assists)                                          AS total_assists,
            SUM(pj.headshots)                                        AS total_hs,
            SUM(pj.mvp)                                              AS total_mvps,
            COUNT(pj.id_partida)                                     AS total_partidas,
            SUM(CASE WHEN pj.resultado = 'VICTORIA' THEN 1 ELSE 0 END) AS total_victorias,
            ROUND(SUM(pj.kills) / NULLIF(SUM(pj.deaths), 0), 2)     AS nuevo_kd,
            ROUND(SUM(pj.headshots) / NULLIF(SUM(pj.kills), 0) * 100, 2) AS nuevo_ratio_hs,
            ROUND(AVG(pj.precision_disparo), 2)                      AS nueva_precision
        FROM partida_jugador pj
        WHERE pj.steam_id64 = NEW.steam_id64
        GROUP BY pj.steam_id64
    ) AS calc ON e.steam_id64 = calc.steam_id64
    SET
        e.kills                  = calc.total_kills,
        e.deaths                 = calc.total_deaths,
        e.assists                = calc.total_assists,
        e.headshots              = calc.total_hs,
        e.mvps                   = calc.total_mvps,
        e.kd_ratio               = IFNULL(calc.nuevo_kd, 0.00),
        e.ratio_headshots        = calc.nuevo_ratio_hs,
        e.precision_disparo      = calc.nueva_precision,
        e.total_partidas_jugadas = calc.total_partidas,
        e.total_partidas_ganadas = calc.total_victorias,
        e.ultima_actualizacion   = NOW()
    WHERE e.steam_id64 = NEW.steam_id64;

    -- Registrar en auditoría
    INSERT INTO logs_auditoria (tabla_afectada, accion, steam_id64_usuario, descripcion)
    VALUES ('estadisticas_cs2', 'UPDATE', NEW.steam_id64,
            CONCAT('Recálculo automático tras inserción en partida ', NEW.id_partida));
END$$

-- ─────────────────────────────────────────────────────────────
-- TRIGGER 2: tr_snapshot_elo
-- Disparo: AFTER UPDATE en rankings_cs2
-- Función: Captura una instantánea en historico_ranking_premiere
--          cada vez que cambia puntos_elo de un ranking PREMIERE.
-- ERS 3.2.7 — Requisito 2
-- ─────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS tr_snapshot_elo$$
CREATE TRIGGER tr_snapshot_elo
AFTER UPDATE ON rankings_cs2
FOR EACH ROW
BEGIN
    -- Solo actuar sobre cambios en PREMIERE y cuando el ELO realmente cambia
    IF NEW.tipo_ranking = 'PREMIERE' AND NEW.puntos_elo <> OLD.puntos_elo THEN
        INSERT INTO historico_ranking_premiere (
            steam_id64,
            puntos_elo,
            tier,
            fecha_snapshot,
            variacion_elo
        ) VALUES (
            NEW.steam_id64,
            NEW.puntos_elo,
            NEW.tier,
            NOW(),
            NEW.puntos_elo - OLD.puntos_elo
        );

        -- Actualizar ultima_actualizacion en jugadores_cs2
        UPDATE jugadores_cs2
        SET ultima_actualizacion_datos = NOW()
        WHERE steam_id64 = NEW.steam_id64;

        -- Log de auditoría
        INSERT INTO logs_auditoria (tabla_afectada, accion, steam_id64_usuario, descripcion)
        VALUES ('historico_ranking_premiere', 'INSERT', NEW.steam_id64,
                CONCAT('Snapshot ELO: ', OLD.puntos_elo, ' → ', NEW.puntos_elo,
                       ' (', IF(NEW.puntos_elo > OLD.puntos_elo, '+', ''),
                       NEW.puntos_elo - OLD.puntos_elo, ')'));
    END IF;
END$$

-- ─────────────────────────────────────────────────────────────
-- TRIGGER 3: tr_validar_partida_jugador
-- Disparo: BEFORE INSERT en partida_jugador
-- Función: Valida que existan tanto la partida como el jugador
--          antes de insertar rendimiento. Previene huérfanos silenciosos.
--          Además, impone máximo 10 jugadores por partida.
-- ERS 3.2.7 — Requisito 3
-- ─────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS tr_validar_partida_jugador$$
CREATE TRIGGER tr_validar_partida_jugador
BEFORE INSERT ON partida_jugador
FOR EACH ROW
BEGIN
    DECLARE jugadores_en_partida INT;
    DECLARE partida_existe INT;
    DECLARE jugador_existe INT;

    -- Verificar existencia de partida
    SELECT COUNT(*) INTO partida_existe
    FROM partidas_cs2 WHERE id_partida = NEW.id_partida;

    IF partida_existe = 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'ERROR: La partida referenciada no existe en partidas_cs2';
    END IF;

    -- Verificar existencia de jugador
    SELECT COUNT(*) INTO jugador_existe
    FROM jugadores_cs2 WHERE steam_id64 = NEW.steam_id64;

    IF jugador_existe = 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'ERROR: El jugador (steam_id64) no existe en jugadores_cs2';
    END IF;

    -- Verificar límite de 10 jugadores por partida (CS2 es 5v5)
    SELECT COUNT(*) INTO jugadores_en_partida
    FROM partida_jugador WHERE id_partida = NEW.id_partida;

    IF jugadores_en_partida >= 10 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'ERROR: Una partida CS2 no puede tener más de 10 jugadores';
    END IF;
END$$

-- ─────────────────────────────────────────────────────────────
-- TRIGGER 4: tr_actualizar_timestamp_jugador
-- Disparo: BEFORE UPDATE en jugadores_cs2
-- Función: Actualiza ultima_actualizacion_datos automáticamente
--          en cualquier UPDATE sobre la tabla jugadores_cs2.
-- ERS 3.2.7 — Requisito 4
-- ─────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS tr_actualizar_timestamp_jugador$$
CREATE TRIGGER tr_actualizar_timestamp_jugador
BEFORE UPDATE ON jugadores_cs2
FOR EACH ROW
BEGIN
    SET NEW.ultima_actualizacion_datos = NOW();
END$$

DELIMITER ;

-- ============================================================
-- BLOQUE 6: VISTAS ACTUALIZADAS
-- Las 5 originales + 2 nuevas para las tablas añadidas
-- ============================================================

-- VISTA 1: Ranking PREMIERE por ELO (igual que v1.0)
CREATE OR REPLACE VIEW vw_ranking_jugadores_elo AS
SELECT
    j.steam_id64,
    j.nombre_usuario_steam,
    j.region_geografica,
    r.puntos_elo,
    r.tier,
    r.posicion_global,
    r.ultima_actualizacion,
    RANK() OVER (ORDER BY r.puntos_elo DESC) AS ranking_posicion
FROM jugadores_cs2 j
INNER JOIN rankings_cs2 r ON j.steam_id64 = r.steam_id64
WHERE r.tipo_ranking = 'PREMIERE'
ORDER BY r.puntos_elo DESC;

-- VISTA 2: Resumen de estadísticas del jugador (ampliada con nuevos campos)
CREATE OR REPLACE VIEW vw_estadisticas_jugador_resumen AS
SELECT
    j.steam_id64,
    j.nombre_usuario_steam,
    j.estado_actividad,
    j.region_geografica,
    e.kills,
    e.deaths,
    e.assists,
    e.kd_ratio,
    e.mvps,
    e.headshots,
    e.precision_disparo,
    e.ratio_headshots,
    e.dano_promedio_ronda,
    e.total_partidas_jugadas,
    e.total_partidas_ganadas,
    e.porcentaje_victorias,
    e.tiempo_jugado,
    e.ultima_actualizacion
FROM jugadores_cs2 j
LEFT JOIN estadisticas_cs2 e ON j.steam_id64 = e.steam_id64
WHERE j.estado_actividad = 1;

-- VISTA 3: Reportes pendientes para Valve (ampliada con tipo_infraccion)
CREATE OR REPLACE VIEW vw_reportes_pendientes_valve AS
SELECT
    r.id_reporte,
    j_reportado.nombre_usuario_steam  AS jugador_reportado,
    j_reportador.nombre_usuario_steam AS jugador_reportador,
    ti.codigo                         AS tipo_infraccion,
    ti.severidad,
    r.descripcion,
    r.evidencia,
    r.id_partida,
    r.fecha_reporte,
    r.estado_reporte,
    DATEDIFF(NOW(), r.fecha_reporte)  AS dias_desde_reporte
FROM reportes_conducta r
INNER JOIN jugadores_cs2 j_reportado
    ON r.steam_id64_reportado = j_reportado.steam_id64
INNER JOIN jugadores_cs2 j_reportador
    ON r.steam_id64_reportador = j_reportador.steam_id64
INNER JOIN tipos_infraccion ti
    ON r.id_tipo_infraccion = ti.id_tipo_infraccion
WHERE r.estado_reporte = 'PENDIENTE'
ORDER BY ti.severidad DESC, r.fecha_reporte ASC;

-- VISTA 4: Partidas recientes (ahora desde partida_jugador)
CREATE OR REPLACE VIEW vw_partidas_recientes_jugador AS
SELECT
    pj.id_partida,
    pj.steam_id64,
    j.nombre_usuario_steam,
    COALESCE(m.nombre_display, p.mapa)  AS mapa,
    pj.equipo,
    pj.resultado,
    p.duracion_minutos,
    p.fecha_partida,
    pj.kills,
    pj.deaths,
    pj.assists,
    pj.headshots,
    pj.dano_total,
    pj.mvp,
    ROUND(pj.kills / NULLIF(pj.deaths, 0), 2) AS kd_partida
FROM partida_jugador pj
INNER JOIN partidas_cs2 p  ON pj.id_partida = p.id_partida
INNER JOIN jugadores_cs2 j ON pj.steam_id64 = j.steam_id64
LEFT  JOIN mapas m         ON p.id_mapa = m.id_mapa
ORDER BY p.fecha_partida DESC
LIMIT 1000;

-- VISTA 5: Rendimiento por mapa (ahora desde partida_jugador + mapas)
CREATE OR REPLACE VIEW vw_rendimiento_por_mapa AS
SELECT
    pj.steam_id64,
    j.nombre_usuario_steam,
    COALESCE(m.nombre_display, p.mapa) AS mapa,
    COUNT(pj.id_partida)               AS total_partidas_mapa,
    SUM(CASE WHEN pj.resultado = 'VICTORIA' THEN 1 ELSE 0 END) AS victorias_mapa,
    ROUND(SUM(CASE WHEN pj.resultado = 'VICTORIA' THEN 1 ELSE 0 END)
          / COUNT(pj.id_partida) * 100, 2) AS tasa_victoria_mapa,
    ROUND(AVG(pj.kills),  2)           AS kills_promedio_mapa,
    ROUND(AVG(pj.deaths), 2)           AS deaths_promedio_mapa,
    ROUND(AVG(pj.dano_total), 2)       AS adr_promedio_mapa,
    MAX(p.fecha_partida)               AS ultima_partida_mapa
FROM partida_jugador pj
INNER JOIN partidas_cs2 p  ON pj.id_partida = p.id_partida
INNER JOIN jugadores_cs2 j ON pj.steam_id64 = j.steam_id64
LEFT  JOIN mapas m         ON p.id_mapa = m.id_mapa
GROUP BY pj.steam_id64, COALESCE(m.nombre_display, p.mapa)
ORDER BY pj.steam_id64, mapa;

-- VISTA 6: Evolución histórica de ELO [NUEVA]
-- Permite mostrar gráfica de progresión del ranking PREMIERE.
CREATE OR REPLACE VIEW vw_evolucion_elo AS
SELECT
    h.steam_id64,
    j.nombre_usuario_steam,
    h.puntos_elo,
    h.tier,
    h.variacion_elo,
    h.fecha_snapshot,
    ROW_NUMBER() OVER (PARTITION BY h.steam_id64
                       ORDER BY h.fecha_snapshot)  AS numero_partida_acumulada
FROM historico_ranking_premiere h
INNER JOIN jugadores_cs2 j ON h.steam_id64 = j.steam_id64
ORDER BY h.steam_id64, h.fecha_snapshot;

-- VISTA 7: Rendimiento detallado por partida [NUEVA]
-- Detalle por jugador y partida; base de la página de match history de Fragify.
CREATE OR REPLACE VIEW vw_match_history AS
SELECT
    p.id_partida,
    p.fecha_partida,
    COALESCE(m.nombre_display, p.mapa) AS mapa,
    p.resultado_puntuacion,
    p.duracion_minutos,
    pj.steam_id64,
    j.nombre_usuario_steam,
    pj.equipo,
    pj.resultado,
    pj.kills,
    pj.deaths,
    pj.assists,
    pj.headshots,
    pj.dano_total,
    pj.precision_disparo,
    pj.mvp,
    pj.abandono
FROM partida_jugador pj
INNER JOIN partidas_cs2 p  ON pj.id_partida = p.id_partida
INNER JOIN jugadores_cs2 j ON pj.steam_id64 = j.steam_id64
LEFT  JOIN mapas m         ON p.id_mapa = m.id_mapa
ORDER BY p.fecha_partida DESC, p.id_partida, pj.equipo;

-- ============================================================
-- BLOQUE 7: ROLES, USUARIOS Y PERMISOS (actualizados)
-- Se añaden permisos sobre las nuevas tablas.
-- ============================================================

-- ROLE 1: ADMINISTRADOR DEL SISTEMA
CREATE USER IF NOT EXISTS 'admin_cs2'@'localhost'
    IDENTIFIED BY 'admin_secure_pass_2026';
GRANT ALL PRIVILEGES ON cs2svss.* TO 'admin_cs2'@'localhost' WITH GRANT OPTION;
FLUSH PRIVILEGES;

-- ROLE 2: SERVICIO API
-- Ahora también puede insertar en partida_jugador y tablas catálogo
CREATE USER IF NOT EXISTS 'api_service'@'localhost'
    IDENTIFIED BY 'api_service_key_2026';
GRANT SELECT          ON cs2svss.jugadores_cs2            TO 'api_service'@'localhost';
GRANT SELECT          ON cs2svss.servidores_cs2           TO 'api_service'@'localhost';
GRANT SELECT          ON cs2svss.mapas                    TO 'api_service'@'localhost';
GRANT SELECT          ON cs2svss.modos_juego              TO 'api_service'@'localhost';
GRANT INSERT, UPDATE  ON cs2svss.estadisticas_cs2         TO 'api_service'@'localhost';
GRANT INSERT, UPDATE  ON cs2svss.rankings_cs2             TO 'api_service'@'localhost';
GRANT INSERT, UPDATE  ON cs2svss.partidas_cs2             TO 'api_service'@'localhost';
GRANT INSERT          ON cs2svss.partida_jugador          TO 'api_service'@'localhost';
GRANT SELECT          ON cs2svss.logs_auditoria           TO 'api_service'@'localhost';
FLUSH PRIVILEGES;

-- ROLE 3: INSPECTOR DE VALVE (solo lectura)
CREATE USER IF NOT EXISTS 'valve_inspector'@'remote_valve_server'
    IDENTIFIED BY 'valve_api_readonly_key_2026';
GRANT SELECT ON cs2svss.reportes_conducta            TO 'valve_inspector'@'remote_valve_server';
GRANT SELECT ON cs2svss.jugadores_cs2                TO 'valve_inspector'@'remote_valve_server';
GRANT SELECT ON cs2svss.estadisticas_cs2             TO 'valve_inspector'@'remote_valve_server';
GRANT SELECT ON cs2svss.partidas_cs2                 TO 'valve_inspector'@'remote_valve_server';
GRANT SELECT ON cs2svss.partida_jugador              TO 'valve_inspector'@'remote_valve_server';
GRANT SELECT ON cs2svss.tipos_infraccion             TO 'valve_inspector'@'remote_valve_server';
GRANT SELECT ON cs2svss.vw_reportes_pendientes_valve TO 'valve_inspector'@'remote_valve_server';
FLUSH PRIVILEGES;

-- ROLE 4: JUGADOR FRAGIFY
CREATE USER IF NOT EXISTS 'jugador_fragify'@'localhost'
    IDENTIFIED BY 'jugador_pass_2026';
GRANT SELECT ON cs2svss.estadisticas_cs2             TO 'jugador_fragify'@'localhost';
GRANT SELECT ON cs2svss.rankings_cs2                 TO 'jugador_fragify'@'localhost';
GRANT SELECT ON cs2svss.partidas_cs2                 TO 'jugador_fragify'@'localhost';
GRANT SELECT ON cs2svss.partida_jugador              TO 'jugador_fragify'@'localhost';
GRANT SELECT ON cs2svss.historico_ranking_premiere   TO 'jugador_fragify'@'localhost';
GRANT SELECT ON cs2svss.mapas                        TO 'jugador_fragify'@'localhost';
GRANT SELECT ON cs2svss.vw_evolucion_elo             TO 'jugador_fragify'@'localhost';
GRANT SELECT ON cs2svss.vw_match_history             TO 'jugador_fragify'@'localhost';
GRANT SELECT ON cs2svss.vw_rendimiento_por_mapa      TO 'jugador_fragify'@'localhost';
/* En futuro: permisos sobre usuarios_fragify (solo su propia fila) via app */
FLUSH PRIVILEGES;

-- ROLE 5: PROFESOR/EVALUADOR (SELECT en todo)
CREATE USER IF NOT EXISTS 'profesor_evaluador'@'localhost'
    IDENTIFIED BY 'profesor_cs2_2026';
GRANT SELECT ON cs2svss.jugadores_cs2                TO 'profesor_evaluador'@'localhost';
GRANT SELECT ON cs2svss.servidores_cs2               TO 'profesor_evaluador'@'localhost';
GRANT SELECT ON cs2svss.estadisticas_cs2             TO 'profesor_evaluador'@'localhost';
GRANT SELECT ON cs2svss.rankings_cs2                 TO 'profesor_evaluador'@'localhost';
GRANT SELECT ON cs2svss.partidas_cs2                 TO 'profesor_evaluador'@'localhost';
GRANT SELECT ON cs2svss.partida_jugador              TO 'profesor_evaluador'@'localhost';
GRANT SELECT ON cs2svss.reportes_conducta            TO 'profesor_evaluador'@'localhost';
GRANT SELECT ON cs2svss.logs_auditoria               TO 'profesor_evaluador'@'localhost';
GRANT SELECT ON cs2svss.historico_ranking_premiere   TO 'profesor_evaluador'@'localhost';
GRANT SELECT ON cs2svss.mapas                        TO 'profesor_evaluador'@'localhost';
GRANT SELECT ON cs2svss.modos_juego                  TO 'profesor_evaluador'@'localhost';
GRANT SELECT ON cs2svss.tipos_infraccion             TO 'profesor_evaluador'@'localhost';
GRANT SELECT ON cs2svss.usuarios_fragify             TO 'profesor_evaluador'@'localhost';
GRANT SELECT ON cs2svss.vw_ranking_jugadores_elo     TO 'profesor_evaluador'@'localhost';
GRANT SELECT ON cs2svss.vw_estadisticas_jugador_resumen TO 'profesor_evaluador'@'localhost';
GRANT SELECT ON cs2svss.vw_reportes_pendientes_valve TO 'profesor_evaluador'@'localhost';
GRANT SELECT ON cs2svss.vw_partidas_recientes_jugador TO 'profesor_evaluador'@'localhost';
GRANT SELECT ON cs2svss.vw_rendimiento_por_mapa      TO 'profesor_evaluador'@'localhost';
GRANT SELECT ON cs2svss.vw_evolucion_elo             TO 'profesor_evaluador'@'localhost';
GRANT SELECT ON cs2svss.vw_match_history             TO 'profesor_evaluador'@'localhost';
FLUSH PRIVILEGES;

-- ============================================================
-- FIN DEL SCRIPT
-- CS2-SVSS v2.0 — 12 tablas | 7 vistas | 4 triggers | 5 roles
-- ============================================================
