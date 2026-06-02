import { redirect } from "next/navigation";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { aceptarInvitacionOrg, marcarNotificacionOrgLeida, rechazarInvitacionOrg } from "../organizaciones/acciones";
import { aceptarAmistad, rechazarAmistad } from "../usuarios/acciones";

type Perfil = {
  id: string;
  nombre_usuario: string;
  nombre_completo: string | null;
  avatar_url: string | null;
};

export default async function PaginaBuzon() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = crearClienteAdmin();
  const [{ data: solicitudes }, { data: invitaciones }, { data: notificaciones }] = await Promise.all([
    admin
      .from("amistades")
      .select("id, solicitante_id, fecha")
      .eq("receptor_id", user.id)
      .eq("estado", "pendiente")
      .order("fecha", { ascending: false }),
    admin
      .from("org_invitaciones")
      .select("id, org_id, invitador_id, fecha, organizaciones ( id, nombre )")
      .eq("invitado_id", user.id)
      .eq("estado", "pendiente")
      .order("fecha", { ascending: false }),
    admin
      .from("org_notificaciones")
      .select("id, mensaje, fecha, organizaciones ( id, nombre )")
      .eq("user_id", user.id)
      .eq("leida", false)
      .order("fecha", { ascending: false }),
  ]);

  const perfilIds = [
    ...new Set([
      ...(solicitudes ?? []).map((s) => s.solicitante_id),
      ...(invitaciones ?? []).map((i) => i.invitador_id).filter(Boolean),
    ]),
  ];
  const perfilesPorId = new Map<string, Perfil>();
  if (perfilIds.length > 0) {
    const { data: perfiles } = await admin
      .from("profiles")
      .select("id, nombre_usuario, nombre_completo, avatar_url")
      .in("id", perfilIds);
    for (const perfil of perfiles ?? []) perfilesPorId.set(perfil.id, perfil);
  }

  const total = (solicitudes?.length ?? 0) + (invitaciones?.length ?? 0) + (notificaciones?.length ?? 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col gap-8">
      <header>
        <p className="font-display italic text-accent text-sm mb-1">- buzon</p>
        <h1 className="font-display font-medium text-[26px] tracking-[-0.02em]">
          Invitaciones <em className="italic text-accent">pendientes</em>
        </h1>
        <p className="text-mute text-[13px] mt-1">
          {total} pendiente{total !== 1 ? "s" : ""} de aceptar o rechazar
        </p>
      </header>

      {total === 0 ? (
        <div className="py-16 text-center">
          <p className="font-display italic text-accent text-lg mb-1">Buzon vacio</p>
          <p className="text-mute text-sm">No tienes solicitudes ni invitaciones pendientes.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3">
            <h2 className="font-display font-medium text-lg tracking-[-0.01em]">
              Solicitudes de amistad
            </h2>
            <div className="rounded-[14px] border border-rule bg-paper overflow-hidden">
              {solicitudes?.length ? (
                solicitudes.map((solicitud) => {
                  const perfil = perfilesPorId.get(solicitud.solicitante_id);
                  return (
                    <div
                      key={solicitud.id}
                      className="flex flex-col items-stretch gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-5 sm:py-3 border-b border-rule last:border-b-0"
                    >
                      <Avatar
                        nombreCompleto={perfil?.nombre_completo ?? null}
                        nombreUsuario={perfil?.nombre_usuario ?? "Usuario"}
                        avatarUrl={perfil?.avatar_url ?? null}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-[13px] truncate">
                          {perfil?.nombre_completo || perfil?.nombre_usuario || "Usuario"}
                        </p>
                        <p className="text-mute text-[11px] font-mono">
                          @{perfil?.nombre_usuario ?? "usuario"}
                        </p>
                      </div>
                      <div className="flex gap-2 sm:shrink-0">
                        <form action={aceptarAmistad.bind(null, solicitud.id)} className="flex-1 sm:flex-none">
                          <Button type="submit" variant="primary" size="sm" className="w-full justify-center">Aceptar</Button>
                        </form>
                        <form action={rechazarAmistad.bind(null, solicitud.id)} className="flex-1 sm:flex-none">
                          <Button type="submit" variant="ghost" size="sm" className="w-full justify-center">Rechazar</Button>
                        </form>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="px-5 py-6 text-center text-mute text-sm">No hay solicitudes.</p>
              )}
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-display font-medium text-lg tracking-[-0.01em]">
              Invitaciones a organizaciones
            </h2>
            <div className="rounded-[14px] border border-rule bg-paper overflow-hidden">
              {invitaciones?.length ? (
                invitaciones.map((invitacion) => {
                  const perfil = invitacion.invitador_id
                    ? perfilesPorId.get(invitacion.invitador_id)
                    : null;
                  const org = Array.isArray(invitacion.organizaciones)
                    ? invitacion.organizaciones[0]
                    : invitacion.organizaciones;
                  return (
                    <div
                      key={invitacion.id}
                      className="flex flex-col items-stretch gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-5 sm:py-3 border-b border-rule last:border-b-0"
                    >
                      <Avatar
                        nombreCompleto={perfil?.nombre_completo ?? null}
                        nombreUsuario={perfil?.nombre_usuario ?? "Org"}
                        avatarUrl={perfil?.avatar_url ?? null}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-[13px] truncate">
                          {org?.nombre ?? "Organizacion"}
                        </p>
                        <p className="text-mute text-[11px] font-mono">
                          invita {perfil?.nombre_completo || perfil?.nombre_usuario || "un admin"}
                        </p>
                      </div>
                      <div className="flex gap-2 sm:shrink-0">
                        <form action={aceptarInvitacionOrg.bind(null, invitacion.id)} className="flex-1 sm:flex-none">
                          <Button type="submit" variant="primary" size="sm" className="w-full justify-center">Aceptar</Button>
                        </form>
                        <form action={rechazarInvitacionOrg.bind(null, invitacion.id)} className="flex-1 sm:flex-none">
                          <Button type="submit" variant="ghost" size="sm" className="w-full justify-center">Rechazar</Button>
                        </form>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="px-5 py-6 text-center text-mute text-sm">No hay invitaciones.</p>
              )}
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-display font-medium text-lg tracking-[-0.01em]">
              Avisos de organizaciones
            </h2>
            <div className="rounded-[14px] border border-rule bg-paper overflow-hidden">
              {notificaciones?.length ? (
                notificaciones.map((notificacion) => {
                  const org = Array.isArray(notificacion.organizaciones)
                    ? notificacion.organizaciones[0]
                    : notificacion.organizaciones;
                  return (
                    <div
                      key={notificacion.id}
                      className="flex flex-col items-stretch gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-5 sm:py-3 border-b border-rule last:border-b-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-[13px]">
                          {notificacion.mensaje}
                        </p>
                        <p className="text-mute text-[11px] font-mono">
                          {org?.nombre ?? "Organizacion"}
                        </p>
                      </div>
                      <form action={marcarNotificacionOrgLeida.bind(null, notificacion.id)}>
                        <Button type="submit" variant="ghost" size="sm" className="w-full justify-center sm:w-auto">
                          Entendido
                        </Button>
                      </form>
                    </div>
                  );
                })
              ) : (
                <p className="px-5 py-6 text-center text-mute text-sm">No hay avisos.</p>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
