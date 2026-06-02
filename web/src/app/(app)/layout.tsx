import { redirect } from "next/navigation";

import { ToastProvider } from "@/components/ui/Toast";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/servidor";

import { AppLayoutClient } from "./AppLayoutClient";

export default async function LayoutApp({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = crearClienteAdmin();
  const { data: perfil } = await admin
    .from("profiles")
    .select("nombre_usuario, nombre_completo, avatar_url")
    .eq("id", user.id)
    .single();

  const [{ count: solicitudesAmistad }, { count: invitacionesOrg }, { count: notificacionesOrg }] = await Promise.all([
    admin
      .from("amistades")
      .select("id", { count: "exact", head: true })
      .eq("receptor_id", user.id)
      .eq("estado", "pendiente"),
    admin
      .from("org_invitaciones")
      .select("id", { count: "exact", head: true })
      .eq("invitado_id", user.id)
      .eq("estado", "pendiente"),
    admin
      .from("org_notificaciones")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("leida", false),
  ]);

  const pendientesBuzon = (solicitudesAmistad ?? 0) + (invitacionesOrg ?? 0) + (notificacionesOrg ?? 0);

  return (
    <ToastProvider>
      <AppLayoutClient
        perfil={perfil}
        userEmail={user.email ?? ""}
        pendientesBuzon={pendientesBuzon}
      >
        {children}
      </AppLayoutClient>
    </ToastProvider>
  );
}
