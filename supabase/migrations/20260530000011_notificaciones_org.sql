-- Notificaciones simples de organizacion para el buzon.

CREATE TABLE IF NOT EXISTS "org_notificaciones" (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id uuid REFERENCES "organizaciones"(id) ON DELETE SET NULL,
    tipo text NOT NULL,
    mensaje text NOT NULL,
    leida boolean NOT NULL DEFAULT false,
    fecha timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE "org_notificaciones" ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS org_notificaciones_user_idx
    ON "org_notificaciones" (user_id, leida, fecha DESC);

DROP POLICY IF EXISTS "org_notificaciones_lectura_usuario" ON "org_notificaciones";
CREATE POLICY "org_notificaciones_lectura_usuario" ON "org_notificaciones"
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "org_notificaciones_update_usuario" ON "org_notificaciones";
CREATE POLICY "org_notificaciones_update_usuario" ON "org_notificaciones"
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
