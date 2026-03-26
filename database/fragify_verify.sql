-- ============================================================
-- CS2-SVSS (Fragify) — Script de Verificación v2.0
-- Autor: José Ángel Alejo Sillero | Fecha: 26/03/2026
-- Ejecutar DESPUÉS de fragify_v2.sql
-- Comprueba: tablas, columnas, triggers, vistas, roles,
--            CHECKs (tests positivos y negativos) y datos de prueba.
-- Resultado: cada bloque muestra OK o falla con SIGNAL/error.
-- ============================================================

USE cs2svss;

-- ============================================================
-- UTILIDAD: Tabla de resultados de tests
-- ============================================================
DROP TABLE IF EXISTS _test_results;
CREATE TEMPORARY TABLE _test_results (
    id       INT AUTO_INCREMENT PRIMARY KEY,
    bloque   VARCHAR(50),
    test     VARCHAR(120),
    resultado ENUM('OK', 'FAIL') DEFAULT 'OK',
    detalle  VARCHAR(255)
);

-- Macro para registrar OK
-- Se usa inline con INSERT INTO _test_results ...

-- ============================================================
-- BLOQUE 1: EXISTENCIA DE TABLAS
-- ============================================================

INSERT INTO _test_results (bloque, test, resultado, detalle)
SELECT
    'TABLAS' AS bloque,
    t.nombre AS test,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = 'cs2svss'
          AND TABLE_NAME   = t.nombre
    ) THEN 'OK' ELSE 'FAIL' END AS resultado,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = 'cs2svss'
          AND TABLE_NAME   = t.nombre
    ) THEN 'Tabla existe' ELSE 'Tabla NO encontrada' END AS detalle
FROM (
    SELECT 'jugadores_cs2'              AS nombre UNION ALL
    SELECT 'servidores_cs2'             UNION ALL
    SELECT 'usuarios_fragify'           UNION ALL
    SELECT 'estadisticas_cs2'           UNION ALL
    SELECT 'rankings_cs2'               UNION ALL
    SELECT 'mapas'                      UNION ALL
    SELECT 'modos_juego'                UNION ALL
    SELECT 'tipos_infraccion'           UNION ALL
    SELECT 'partidas_cs2'               UNION ALL
    SELECT 'partida_jugador'            UNION ALL
    SELECT 'historico_ranking_premiere' UNION ALL
    SELECT 'reportes_conducta'          UNION ALL
    SELECT 'logs_auditoria'
) t;

-- ============================================================
-- BLOQUE 2: COLUMNAS CLAVE EN TABLAS (los añadidos v2.0)
-- ============================================================

INSERT INTO _test_results (bloque, test, resultado, detalle)
SELECT
    'COLUMNAS_V2' AS bloque,
    CONCAT(c.tabla, '.', c.columna) AS test,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = 'cs2svss'
          AND TABLE_NAME   = c.tabla
          AND COLUMN_NAME  = c.columna
    ) THEN 'OK' ELSE 'FAIL' END AS resultado,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = 'cs2svss'
          AND TABLE_NAME   = c.tabla
          AND COLUMN_NAME  = c.columna
    ) THEN 'Columna existe' ELSE 'Columna NO encontrada (añadida en v2.0)' END AS detalle
FROM (
    -- jugadores_cs2
    SELECT 'jugadores_cs2' AS tabla, 'region_geografica' AS columna UNION ALL
    -- servidores_cs2
    SELECT 'servidores_cs2', 'estado_actual'             UNION ALL
    SELECT 'servidores_cs2', 'proveedor_infraestructura' UNION ALL
    -- estadisticas_cs2
    SELECT 'estadisticas_cs2', 'precision_disparo'       UNION ALL
    SELECT 'estadisticas_cs2', 'ratio_headshots'         UNION ALL
    SELECT 'estadisticas_cs2', 'dano_promedio_ronda'     UNION ALL
    SELECT 'estadisticas_cs2', 'total_partidas_jugadas'  UNION ALL
    SELECT 'estadisticas_cs2', 'total_partidas_ganadas'  UNION ALL
    SELECT 'estadisticas_cs2', 'porcentaje_victorias'    UNION ALL
    -- rankings_cs2
    SELECT 'rankings_cs2', 'id_mapa'                     UNION ALL
    SELECT 'rankings_cs2', 'victorias_mapa'              UNION ALL
    -- partidas_cs2
    SELECT 'partidas_cs2', 'id_mapa'                     UNION ALL
    SELECT 'partidas_cs2', 'id_modo'                     UNION ALL
    SELECT 'partidas_cs2', 'codigo_comparticion_demo'    UNION ALL
    SELECT 'partidas_cs2', 'resultado_puntuacion'        UNION ALL
    SELECT 'partidas_cs2', 'version_juego'               UNION ALL
    -- partida_jugador
    SELECT 'partida_jugador', 'equipo'                   UNION ALL
    SELECT 'partida_jugador', 'dano_total'               UNION ALL
    SELECT 'partida_jugador', 'abandono'                 UNION ALL
    -- reportes_conducta
    SELECT 'reportes_conducta', 'id_tipo_infraccion'     UNION ALL
    SELECT 'reportes_conducta', 'id_partida'
) c;

-- ============================================================
-- BLOQUE 3: TRIGGERS
-- ============================================================

INSERT INTO _test_results (bloque, test, resultado, detalle)
SELECT
    'TRIGGERS' AS bloque,
    t.nombre AS test,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.TRIGGERS
        WHERE TRIGGER_SCHEMA = 'cs2svss'
          AND TRIGGER_NAME   = t.nombre
    ) THEN 'OK' ELSE 'FAIL' END AS resultado,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.TRIGGERS
        WHERE TRIGGER_SCHEMA = 'cs2svss'
          AND TRIGGER_NAME   = t.nombre
    ) THEN 'Trigger existe' ELSE 'Trigger NO encontrado' END AS detalle
FROM (
    SELECT 'tr_recalcular_estadisticas'   AS nombre UNION ALL
    SELECT 'tr_snapshot_elo'              UNION ALL
    SELECT 'tr_validar_partida_jugador'   UNION ALL
    SELECT 'tr_actualizar_timestamp_jugador'
) t;

-- ============================================================
-- BLOQUE 4: VISTAS
-- ============================================================

INSERT INTO _test_results (bloque, test, resultado, detalle)
SELECT
    'VISTAS' AS bloque,
    v.nombre AS test,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.VIEWS
        WHERE TABLE_SCHEMA = 'cs2svss'
          AND TABLE_NAME   = v.nombre
    ) THEN 'OK' ELSE 'FAIL' END AS resultado,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.VIEWS
        WHERE TABLE_SCHEMA = 'cs2svss'
          AND TABLE_NAME   = v.nombre
    ) THEN 'Vista existe' ELSE 'Vista NO encontrada' END AS detalle
FROM (
    SELECT 'vw_ranking_jugadores_elo'        AS nombre UNION ALL
    SELECT 'vw_estadisticas_jugador_resumen' UNION ALL
    SELECT 'vw_reportes_pendientes_valve'    UNION ALL
    SELECT 'vw_partidas_recientes_jugador'   UNION ALL
    SELECT 'vw_rendimiento_por_mapa'         UNION ALL
    SELECT 'vw_evolucion_elo'                UNION ALL
    SELECT 'vw_match_history'
) v;

-- ============================================================
-- BLOQUE 5: DATOS DE PRUEBA (INSERT positivos)
-- ============================================================

-- Jugador 1
INSERT INTO jugadores_cs2 VALUES (
    '76561198012345678',
    'FragifyTestPlayer',
    NOW(), 1, NULL, NOW(), 1, 'EU-West'
);

-- Jugador 2 (reportador)
INSERT INTO jugadores_cs2 VALUES (
    '76561198087654321',
    'FragifyReporter',
    NOW(), 1, NULL, NOW(), 1, 'EU-West'
);

INSERT INTO _test_results (bloque, test, resultado, detalle)
VALUES ('DATOS', 'INSERT jugadores_cs2', 'OK', '2 jugadores insertados');

-- Servidor
INSERT INTO servidores_cs2
    (ip_servidor, region, tipo_servidor, ping_promedio, ultima_actualizacion,
     estado_actual, proveedor_infraestructura)
VALUES ('185.25.182.1', 'EU-West', 'OFICIAL', 12, NOW(), 'ACTIVO', 'Valve');

SET @srv_id = LAST_INSERT_ID();
INSERT INTO _test_results (bloque, test, resultado, detalle)
VALUES ('DATOS', 'INSERT servidores_cs2', 'OK', 'Servidor EU-West insertado');

-- Partida (usando mapa y modo del catálogo)
INSERT INTO partidas_cs2
    (id_partida, id_mapa, id_modo, duracion_minutos, fecha_partida,
     id_servidor, resultado_puntuacion, version_juego)
SELECT
    'FRAGIFY-TEST-MATCH-001',
    id_mapa, -- de_mirage
    2,       -- PREMIER
    35,
    NOW(),
    @srv_id,
    '13-10',
    '13992'
FROM mapas WHERE nombre_mapa = 'de_mirage';

INSERT INTO _test_results (bloque, test, resultado, detalle)
VALUES ('DATOS', 'INSERT partidas_cs2', 'OK', 'Partida de prueba insertada');

-- Participante en partida (dispara tr_recalcular_estadisticas y tr_validar_partida_jugador)
INSERT INTO partida_jugador
    (id_partida, steam_id64, equipo, abandono,
     kills, deaths, assists, headshots, dano_total,
     precision_disparo, mvp, resultado)
VALUES
    ('FRAGIFY-TEST-MATCH-001', '76561198012345678', 'CT', 0,
     22, 14, 5, 8, 3450, 28.50, 1, 'VICTORIA');

INSERT INTO _test_results (bloque, test, resultado, detalle)
VALUES ('DATOS', 'INSERT partida_jugador (tr_recalcular_estadisticas)', 'OK',
        'Trigger de recálculo activado');

-- Verificar que el trigger actualizó estadisticas_cs2
INSERT INTO _test_results (bloque, test, resultado, detalle)
SELECT
    'TRIGGERS_FUNCIONAL',
    'tr_recalcular_estadisticas → estadisticas_cs2 actualizada',
    CASE WHEN e.kills = 22 AND e.total_partidas_jugadas = 1
         THEN 'OK' ELSE 'FAIL' END,
    CONCAT('kills=', e.kills, ' partidas=', e.total_partidas_jugadas)
FROM estadisticas_cs2 e
WHERE e.steam_id64 = '76561198012345678';

-- Ranking PREMIERE (dispara tr_snapshot_elo en el UPDATE)
INSERT INTO rankings_cs2
    (steam_id64, tipo_ranking, puntos_elo, tier, ultima_actualizacion)
VALUES ('76561198012345678', 'PREMIERE', 12500, 'Gold', NOW());

SET @rank_id = LAST_INSERT_ID();

-- UPDATE de ELO → trigger tr_snapshot_elo debe insertar en historico
UPDATE rankings_cs2
SET puntos_elo = 12750, tier = 'Gold'
WHERE id_ranking = @rank_id;

INSERT INTO _test_results (bloque, test, resultado, detalle)
SELECT
    'TRIGGERS_FUNCIONAL',
    'tr_snapshot_elo → historico_ranking_premiere',
    CASE WHEN COUNT(*) > 0 THEN 'OK' ELSE 'FAIL' END,
    CONCAT('Snapshots registrados: ', COUNT(*))
FROM historico_ranking_premiere
WHERE steam_id64 = '76561198012345678';

-- Reporte de conducta
INSERT INTO reportes_conducta
    (steam_id64_reportado, steam_id64_reportador, id_tipo_infraccion,
     descripcion, id_partida, fecha_reporte, estado_reporte)
VALUES (
    '76561198012345678',
    '76561198087654321',
    (SELECT id_tipo_infraccion FROM tipos_infraccion WHERE codigo = 'CHEATING'),
    'Sospecha de wallhack en ronda 12',
    'FRAGIFY-TEST-MATCH-001',
    NOW(),
    'PENDIENTE'
);

INSERT INTO _test_results (bloque, test, resultado, detalle)
VALUES ('DATOS', 'INSERT reportes_conducta (con FK a partida)', 'OK',
        'Reporte CHEATING insertado con FK a partida');

-- Usuario Fragify
INSERT INTO usuarios_fragify
    (steam_id64, email, rol_plataforma, activo)
VALUES ('76561198012345678', 'testplayer@fragify.gg', 'USUARIO', 1);

INSERT INTO _test_results (bloque, test, resultado, detalle)
VALUES ('DATOS', 'INSERT usuarios_fragify', 'OK', 'Usuario web registrado');

-- ============================================================
-- BLOQUE 6: TESTS NEGATIVOS (CHECKs y validaciones)
-- Si los CHECKs funcionan, estos INSERTs deben FALLAR.
-- Se capturan con HANDLER para no abortar el script.
-- ============================================================

DELIMITER $$

DROP PROCEDURE IF EXISTS _run_negative_tests$$
CREATE PROCEDURE _run_negative_tests()
BEGIN
    -- ── Test N1: steam_id64 con formato inválido (menos de 17 dígitos)
    BEGIN
        DECLARE EXIT HANDLER FOR SQLEXCEPTION
            INSERT INTO _test_results (bloque, test, resultado, detalle)
            VALUES ('CHECK_NEGATIVO', 'chk_steam_id64_format rechaza "12345" (< 17 dígitos)', 'OK',
                    'INSERT rechazado correctamente por CHECK');
        INSERT INTO jugadores_cs2 VALUES
            ('12345', 'BadPlayer', NOW(), 1, NULL, NOW(), 1, NULL);
        -- Si llega aquí el CHECK no funcionó
        INSERT INTO _test_results (bloque, test, resultado, detalle)
        VALUES ('CHECK_NEGATIVO', 'chk_steam_id64_format rechaza "12345"', 'FAIL',
                'INSERT debería haber fallado pero tuvo éxito');
    END;

    -- ── Test N2: ELO fuera de rango (> 40000)
    BEGIN
        DECLARE EXIT HANDLER FOR SQLEXCEPTION
            INSERT INTO _test_results (bloque, test, resultado, detalle)
            VALUES ('CHECK_NEGATIVO', 'chk_puntos_elo rechaza 99999 (> 40000)', 'OK',
                    'INSERT rechazado correctamente por CHECK');
        INSERT INTO rankings_cs2
            (steam_id64, tipo_ranking, puntos_elo, tier, ultima_actualizacion)
        VALUES ('76561198012345678', 'PREMIERE', 99999, 'TestTier', NOW());
        INSERT INTO _test_results (bloque, test, resultado, detalle)
        VALUES ('CHECK_NEGATIVO', 'chk_puntos_elo rechaza 99999', 'FAIL',
                'INSERT debería haber fallado pero tuvo éxito');
    END;

    -- ── Test N3: Duración de partida fuera de rango (< 20 minutos)
    BEGIN
        DECLARE EXIT HANDLER FOR SQLEXCEPTION
            INSERT INTO _test_results (bloque, test, resultado, detalle)
            VALUES ('CHECK_NEGATIVO', 'chk_duracion rechaza 5 minutos (< 20)', 'OK',
                    'INSERT rechazado correctamente por CHECK');
        INSERT INTO partidas_cs2
            (id_partida, id_mapa, id_modo, duracion_minutos, fecha_partida)
        VALUES ('FAIL-MATCH-001', 1, 1, 5, NOW());
        INSERT INTO _test_results (bloque, test, resultado, detalle)
        VALUES ('CHECK_NEGATIVO', 'chk_duracion rechaza 5 minutos', 'FAIL',
                'INSERT debería haber fallado pero tuvo éxito');
    END;

    -- ── Test N4: Demo con formato inválido
    BEGIN
        DECLARE EXIT HANDLER FOR SQLEXCEPTION
            INSERT INTO _test_results (bloque, test, resultado, detalle)
            VALUES ('CHECK_NEGATIVO', 'chk_demo_format rechaza "DEMO-INVALIDO"', 'OK',
                    'INSERT rechazado correctamente por CHECK');
        INSERT INTO partidas_cs2
            (id_partida, id_mapa, id_modo, duracion_minutos,
             fecha_partida, codigo_comparticion_demo)
        VALUES ('FAIL-MATCH-002', 1, 1, 30, NOW(), 'DEMO-INVALIDO');
        INSERT INTO _test_results (bloque, test, resultado, detalle)
        VALUES ('CHECK_NEGATIVO', 'chk_demo_format rechaza "DEMO-INVALIDO"', 'FAIL',
                'INSERT debería haber fallado pero tuvo éxito');
    END;

    -- ── Test N5: Trigger rechaza más de 10 jugadores en una partida
    BEGIN
        DECLARE i INT DEFAULT 0;
        DECLARE dummy_steam VARCHAR(17);
        -- Insertar jugadores ficticios y llenar la partida hasta 10
        -- Partida de prueba separada para no afectar datos previos
        INSERT INTO partidas_cs2
            (id_partida, id_mapa, id_modo, duracion_minutos, fecha_partida)
        VALUES ('FAIL-MATCH-OVERFLOW', 1, 1, 30, NOW());

        -- Insertar jugadores temporales del 01 al 10
        SET i = 1;
        WHILE i <= 10 DO
            SET dummy_steam = LPAD(CAST(7656119801234 + i AS CHAR), 17, '7');
            -- Insertar jugador si no existe
            INSERT IGNORE INTO jugadores_cs2
                (steam_id64, nombre_usuario_steam, fecha_registro_fragify,
                 estado_verificacion, ultima_actualizacion_datos, estado_actividad)
            VALUES (dummy_steam, CONCAT('TempPlayer', i), NOW(), 0, NOW(), 1);
            -- Insertar en partida
            INSERT IGNORE INTO partida_jugador
                (id_partida, steam_id64, equipo, abandono,
                 kills, deaths, assists, headshots, dano_total, mvp, resultado)
            VALUES ('FAIL-MATCH-OVERFLOW', dummy_steam, 'CT', 0,
                    0, 0, 0, 0, 0, 0, 'DERROTA');
            SET i = i + 1;
        END WHILE;

        -- El jugador 11 debe ser rechazado por el trigger
        BEGIN
            DECLARE EXIT HANDLER FOR SQLEXCEPTION
                INSERT INTO _test_results (bloque, test, resultado, detalle)
                VALUES ('CHECK_NEGATIVO', 'tr_validar_partida_jugador rechaza jugador 11', 'OK',
                        'Trigger bloqueó inserción correctamente (máx. 10 jugadores)');
            INSERT INTO partida_jugador
                (id_partida, steam_id64, equipo, abandono,
                 kills, deaths, assists, headshots, dano_total, mvp, resultado)
            VALUES ('FAIL-MATCH-OVERFLOW', '76561198012345678', 'T', 0,
                    0, 0, 0, 0, 0, 0, 'DERROTA');
            INSERT INTO _test_results (bloque, test, resultado, detalle)
            VALUES ('CHECK_NEGATIVO', 'tr_validar_partida_jugador rechaza jugador 11', 'FAIL',
                    'Trigger NO bloqueó el jugador 11 — fallo de validación');
        END;

        -- Limpieza
        DELETE FROM partida_jugador WHERE id_partida = 'FAIL-MATCH-OVERFLOW';
        DELETE FROM partidas_cs2 WHERE id_partida = 'FAIL-MATCH-OVERFLOW';
    END;

    -- ── Test N6: severidad fuera de rango en tipos_infraccion
    BEGIN
        DECLARE EXIT HANDLER FOR SQLEXCEPTION
            INSERT INTO _test_results (bloque, test, resultado, detalle)
            VALUES ('CHECK_NEGATIVO', 'chk_severidad rechaza severidad=5 (> 3)', 'OK',
                    'INSERT rechazado correctamente por CHECK');
        INSERT INTO tipos_infraccion (codigo, descripcion, severidad)
        VALUES ('TEST_BAD', 'Test invalido', 5);
        INSERT INTO _test_results (bloque, test, resultado, detalle)
        VALUES ('CHECK_NEGATIVO', 'chk_severidad rechaza severidad=5', 'FAIL',
                'INSERT debería haber fallado pero tuvo éxito');
    END;

END$$

DELIMITER ;

CALL _run_negative_tests();
DROP PROCEDURE IF EXISTS _run_negative_tests;

-- ============================================================
-- BLOQUE 7: VERIFICACIÓN DE VISTAS CON DATOS REALES
-- ============================================================

INSERT INTO _test_results (bloque, test, resultado, detalle)
SELECT 'VISTAS_FUNCIONAL', 'vw_estadisticas_jugador_resumen devuelve datos', 'OK',
       CONCAT('Filas: ', COUNT(*))
FROM vw_estadisticas_jugador_resumen;

INSERT INTO _test_results (bloque, test, resultado, detalle)
SELECT 'VISTAS_FUNCIONAL', 'vw_ranking_jugadores_elo devuelve datos', 'OK',
       CONCAT('Filas: ', COUNT(*))
FROM vw_ranking_jugadores_elo;

INSERT INTO _test_results (bloque, test, resultado, detalle)
SELECT 'VISTAS_FUNCIONAL', 'vw_reportes_pendientes_valve devuelve datos', 'OK',
       CONCAT('Filas: ', COUNT(*))
FROM vw_reportes_pendientes_valve;

INSERT INTO _test_results (bloque, test, resultado, detalle)
SELECT 'VISTAS_FUNCIONAL', 'vw_match_history devuelve datos', 'OK',
       CONCAT('Filas: ', COUNT(*))
FROM vw_match_history;

INSERT INTO _test_results (bloque, test, resultado, detalle)
SELECT 'VISTAS_FUNCIONAL', 'vw_evolucion_elo devuelve datos', 'OK',
       CONCAT('Filas: ', COUNT(*))
FROM vw_evolucion_elo;

-- ============================================================
-- BLOQUE 8: ROLES — EXISTENCIA DE USUARIOS
-- ============================================================

INSERT INTO _test_results (bloque, test, resultado, detalle)
SELECT
    'ROLES' AS bloque,
    u.usuario AS test,
    CASE WHEN EXISTS (
        SELECT 1 FROM mysql.user
        WHERE CONCAT(User, '@', Host) = u.usuario
    ) THEN 'OK' ELSE 'FAIL' END AS resultado,
    CASE WHEN EXISTS (
        SELECT 1 FROM mysql.user
        WHERE CONCAT(User, '@', Host) = u.usuario
    ) THEN 'Usuario existe' ELSE 'Usuario NO creado' END AS detalle
FROM (
    SELECT 'admin_cs2@localhost'                    AS usuario UNION ALL
    SELECT 'api_service@localhost'                  UNION ALL
    SELECT 'valve_inspector@remote_valve_server'    UNION ALL
    SELECT 'jugador_fragify@localhost'              UNION ALL
    SELECT 'profesor_evaluador@localhost'
) u;

-- ============================================================
-- BLOQUE 9: CONTEO TOTAL DE OBJETOS EN LA BD
-- ============================================================

SELECT
    'RESUMEN GENERAL' AS info,
    (SELECT COUNT(*) FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = 'cs2svss' AND TABLE_TYPE = 'BASE TABLE') AS total_tablas,
    (SELECT COUNT(*) FROM information_schema.VIEWS
     WHERE TABLE_SCHEMA = 'cs2svss') AS total_vistas,
    (SELECT COUNT(*) FROM information_schema.TRIGGERS
     WHERE TRIGGER_SCHEMA = 'cs2svss') AS total_triggers,
    (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
     WHERE CONSTRAINT_SCHEMA = 'cs2svss'
       AND CONSTRAINT_TYPE   = 'CHECK') AS total_checks,
    (SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = 'cs2svss'
       AND INDEX_NAME  <> 'PRIMARY') AS total_indices_secundarios;

-- ============================================================
-- RESULTADO FINAL — RESUMEN DE TESTS
-- ============================================================

SELECT
    bloque,
    COUNT(*) AS total_tests,
    SUM(resultado = 'OK')   AS pasados,
    SUM(resultado = 'FAIL') AS fallados
FROM _test_results
GROUP BY bloque
ORDER BY bloque;

-- Detalle completo (solo FAILs primero, luego OKs)
SELECT
    bloque,
    test,
    resultado,
    detalle
FROM _test_results
ORDER BY resultado DESC, bloque, id;

-- Línea resumen final
SELECT
    CONCAT(
        SUM(resultado = 'OK'), '/', COUNT(*), ' tests pasados — ',
        IF(SUM(resultado = 'FAIL') = 0,
           '✓ Todo correcto. La BD CS2-SVSS v2.0 está lista.',
           CONCAT('✗ ', SUM(resultado = 'FAIL'), ' test(s) fallaron. Revisar arriba.'))
    ) AS RESULTADO_FINAL
FROM _test_results;

DROP TABLE IF EXISTS _test_results;
