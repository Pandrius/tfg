-- Evita que un usuario tenga dos documentos con el mismo nombre.
-- Si ya existian duplicados, conserva el primero y renombra los siguientes.

WITH duplicados AS (
    SELECT
        id,
        nombre,
        row_number() OVER (PARTITION BY user_id, nombre ORDER BY fecha, id) AS rn
    FROM "Documentos"
)
UPDATE "Documentos" d
SET nombre = duplicados.nombre || ' (' || duplicados.rn || ')'
FROM duplicados
WHERE d.id = duplicados.id
  AND duplicados.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS documentos_user_nombre_unico_idx
    ON "Documentos" (user_id, nombre);
