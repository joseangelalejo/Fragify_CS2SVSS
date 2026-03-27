-- ============================================================
-- Fragify — Fix de permisos MySQL para acceso desde Docker
-- ============================================================
-- Problema: fragify_app fue creado con @'localhost' pero Next.js
-- en red Docker bridge conecta desde 172.x.x.x.
-- Solución: dar permisos con @'%' (cualquier host en la red interna).
--
-- Ejecutar en el homelab (sustituir PASSWORD por el valor de MYSQL_PASSWORD en docker/.env):
--
--   PASS=$(grep ^MYSQL_PASSWORD ~/docker-compose-files/Fragify_CS2SVSS/docker/.env | cut -d= -f2)
--   docker exec -i fragify_mysql mysql -u root \
--     -p"$(grep MYSQL_ROOT_PASSWORD ~/docker-compose-files/Fragify_CS2SVSS/docker/.env | cut -d= -f2)" \
--     cs2svss -e "
--       CREATE USER IF NOT EXISTS 'fragify_app'@'%' IDENTIFIED BY '$PASS';
--       GRANT ALL PRIVILEGES ON cs2svss.* TO 'fragify_app'@'%';
--       FLUSH PRIVILEGES;
--     "
-- ============================================================

-- Alternativa: ejecutar este script pasando la contraseña como variable MySQL
-- El script de instrucciones del README lo hace automáticamente.

SELECT 'Ejecuta el comando del comentario superior en el homelab' AS instruccion;
