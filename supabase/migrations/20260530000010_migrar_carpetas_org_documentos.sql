-- Migra documentos que antes se movian a carpetas de organizacion.
-- La carpeta de organizacion queda en org_documentos.carpeta_id y
-- Documentos.carpeta_id vuelve a representar solo la carpeta personal.

UPDATE "org_documentos" od
SET carpeta_id = d.carpeta_id
FROM "Documentos" d
JOIN "carpetas" c ON c.id = d.carpeta_id
WHERE od.documento_id = d.id
  AND c.org_id = od.org_id
  AND od.carpeta_id IS NULL;

UPDATE "Documentos" d
SET carpeta_id = NULL
FROM "carpetas" c
WHERE d.carpeta_id = c.id
  AND c.org_id IS NOT NULL;
