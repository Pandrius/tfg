-- Guarda la carpeta del documento dentro de una organizacion sin moverlo
-- de su carpeta personal en Documentos.carpeta_id.

ALTER TABLE "org_documentos"
    ADD COLUMN IF NOT EXISTS carpeta_id uuid REFERENCES "carpetas"(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS org_documentos_carpeta_idx ON "org_documentos" (carpeta_id);
