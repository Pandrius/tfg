import Link from "next/link";
import { redirect } from "next/navigation";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Kpi } from "@/components/ui/Kpi";
import { KpiAnillo } from "@/components/ui/KpiAnillo";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { expulsarMiembro } from "../acciones";
import { BotonSalirOrganizacion } from "./BotonSalirOrganizacion";
import { ExploradorOrganizacionAdmin, type DocumentoOrgAdmin } from "./ExploradorOrganizacionAdmin";
import { SelectorDocumentosOrganizacion } from "./SelectorDocumentosOrganizacion";
import FormularioMiembro from "./FormularioMiembro";
import ResumenMiembros, { type MiembroResumen } from "./ResumenMiembros";
import { FormularioInlineCarpeta } from "../../carpetas/FormularioInlineCarpeta";

const ESPACIO_ORG_TOTAL_MB = 500;

export default async function PaginaOrganizacion({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = crearClienteAdmin();

  // Verificar membresía usando admin para evitar fallos de RLS en el check
  const { data: miMembresia } = await admin
    .from("org_miembros")
    .select("rol")
    .eq("org_id", id)
    .eq("user_id", user.id)
    .single();

  if (!miMembresia) redirect("/organizaciones");

  const esAdmin = miMembresia.rol === "admin";

  const { data: org } = await admin
    .from("organizaciones")
    .select("id, nombre")
    .eq("id", id)
    .single();

  if (!org) redirect("/organizaciones");

  // Miembros de la org
  const { data: miembros } = await admin
    .from("org_miembros")
    .select("user_id, rol")
    .eq("org_id", id);

  const miembroIds = new Set(miembros?.map((m) => m.user_id) ?? []);
  const { data: invitacionesPendientes } = await admin
    .from("org_invitaciones")
    .select("invitado_id")
    .eq("org_id", id)
    .eq("estado", "pendiente");

  const invitadosPendientesIds = new Set(
    invitacionesPendientes?.map((invitacion) => invitacion.invitado_id) ?? [],
  );
  const { data: perfiles } = await admin
    .from("profiles")
    .select("id, nombre_usuario, nombre_completo")
    .order("nombre_usuario");

  const usuariosDisponibles =
    perfiles?.filter(
      (perfil) => !miembroIds.has(perfil.id) && !invitadosPendientesIds.has(perfil.id),
    ) ?? [];
  const perfilesPorId = new Map((perfiles ?? []).map((perfil) => [perfil.id, perfil]));

  // Carpetas de la org
  const { data: carpetas } = await admin
    .from("carpetas")
    .select("id, nombre, parent_id")
    .eq("org_id", id)
    .order("nombre");

  // Documentos vinculados a la org
  const { data: orgDocs } = await admin
    .from("org_documentos")
    .select("documento_id, carpeta_id, Documentos ( id, nombre, tipo_archivo, confidencialidad, probabilidad, tamano_bytes )")
    .eq("org_id", id);

  const totalCarpetas = carpetas?.length ?? 0;
  const [{ count: totalMiembros }, { count: totalDocumentos }] = await Promise.all([
    admin
      .from("org_miembros")
      .select("user_id", { count: "exact", head: true })
      .eq("org_id", id),
    admin
      .from("org_documentos")
      .select("documento_id", { count: "exact", head: true })
      .eq("org_id", id),
  ]);

  // Mis documentos no vinculados a esta org (para poder añadirlos)
  const vinculadosIds = new Set(orgDocs?.map((od) => od.documento_id) ?? []);
  const nombresOrg = new Set(
    (orgDocs ?? [])
      .map((od) => {
        const doc = Array.isArray(od.Documentos) ? od.Documentos[0] : od.Documentos;
        return String(doc?.nombre ?? "").toLowerCase();
      })
      .filter(Boolean),
  );
  const { data: misDocumentos } = await admin
    .from("Documentos")
    .select("id, nombre, tipo_archivo, confidencialidad, probabilidad")
    .eq("user_id", user.id)
    .order("nombre");

  const docsSinVincular =
    misDocumentos?.filter((d) => !vinculadosIds.has(d.id) && !nombresOrg.has(d.nombre.toLowerCase())) ?? [];
  const documentosOrganizacion: DocumentoOrgAdmin[] = (orgDocs ?? []).flatMap((od) => {
    const doc = Array.isArray(od.Documentos) ? od.Documentos[0] : od.Documentos;
    if (!doc) return [];
    return [{ ...doc, carpeta_id: od.carpeta_id }];
  });
  const espacioBytes = (orgDocs ?? []).reduce((acc, od) => {
    const doc = Array.isArray(od.Documentos) ? od.Documentos[0] : od.Documentos;
    return acc + Number(doc?.tamano_bytes ?? 0);
  }, 0);
  const espacioMB = espacioBytes / (1024 * 1024);
  const espacioPct = Math.min(100, (espacioMB / ESPACIO_ORG_TOTAL_MB) * 100);
  const espacioLibreMB = Math.max(0, ESPACIO_ORG_TOTAL_MB - espacioMB);
  const miembrosResumen: MiembroResumen[] =
    miembros?.map((m) => {
      const perfil = perfilesPorId.get(m.user_id);
      return {
        user_id: m.user_id,
        rol: m.rol,
        nombre_completo: perfil?.nombre_completo ?? null,
        nombre_usuario: perfil?.nombre_usuario ?? null,
      };
    }) ?? [];
  const otrosMiembrosIds = miembrosResumen
    .filter((miembro) => miembro.user_id !== user.id)
    .map((miembro) => miembro.user_id);
  const { data: adminsExternos } =
    otrosMiembrosIds.length > 0
      ? await admin
          .from("org_miembros")
          .select("user_id")
          .in("user_id", otrosMiembrosIds)
          .eq("rol", "admin")
          .neq("org_id", id)
      : { data: [] };
  const adminsExternosIds = new Set((adminsExternos ?? []).map((item) => item.user_id));
  const puedeTransferirAdmin =
    esAdmin &&
    miembrosResumen.some((miembro) => miembro.user_id !== user.id && !adminsExternosIds.has(miembro.user_id));

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col gap-8">
      <Link
        href="/organizaciones"
        className="text-mute text-sm hover:text-ink transition-colors inline-flex items-center gap-1"
      >
        ‹ Organizaciones
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-display italic text-accent text-sm mb-1">— equipo</p>
          <h1 className="font-display font-medium text-[26px] tracking-[-0.02em] break-words">
            {org.nombre}
          </h1>
          <ResumenMiembros
            orgId={id}
            miembros={miembrosResumen}
            userId={user.id}
            esAdmin={esAdmin}
            totalMiembros={totalMiembros ?? 0}
            totalDocumentos={totalDocumentos ?? 0}
            totalCarpetas={totalCarpetas}
          />
        </div>
        <div className="sm:pt-1">
          <BotonSalirOrganizacion
            orgId={id}
            esAdmin={esAdmin}
            totalMiembros={totalMiembros ?? 0}
            puedeTransferirAdmin={puedeTransferirAdmin}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-4 gap-3.5">
        <Kpi
          label="Espacio usado"
          valor={
            <>
              {espacioMB.toFixed(1)}
              <span className="text-[16px] text-mute font-display italic"> MB</span>
            </>
          }
          pista={`de ${ESPACIO_ORG_TOTAL_MB} MB`}
          delta={`${espacioPct.toFixed(1)}%`}
          visual={<KpiAnillo porcentaje={espacioPct} />}
        />
        <Kpi
          label="Disponible"
          valor={
            <>
              {espacioLibreMB.toFixed(1)}
              <span className="text-[16px] text-mute font-display italic"> MB</span>
            </>
          }
          pista="para esta organizacion"
        />
        <Kpi
          label="Documentos"
          valor={totalDocumentos ?? 0}
          pista="vinculados"
        />
        <Kpi
          label="Carpetas"
          valor={totalCarpetas}
          pista="del equipo"
        />
      </div>

      {/* Miembros */}
      <section className="flex flex-col gap-4">
        <h2 className="font-display font-medium text-[18px] tracking-[-0.01em]">
          Miembros
        </h2>
        <div className="rounded-[14px] border border-rule bg-paper overflow-hidden">
          {miembros?.map((m) => {
            const perfil = perfilesPorId.get(m.user_id);
            const esYo = m.user_id === user.id;
            const nombreCompleto = perfil?.nombre_completo ?? null;
            const nombreUsuario = perfil?.nombre_usuario ?? null;
            return (
              <div
                key={m.user_id}
                className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5 border-b border-rule last:border-b-0 text-[13px]"
              >
                <Avatar
                  nombreCompleto={nombreCompleto ?? undefined}
                  nombreUsuario={nombreUsuario ?? undefined}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">
                    {nombreCompleto || nombreUsuario || "—"}
                    {esYo && (
                      <span className="text-mute font-normal text-[12px] ml-1">(tú)</span>
                    )}
                  </p>
                  {nombreUsuario && (
                    <p className="text-mute text-[11px] font-mono">@{nombreUsuario}</p>
                  )}
                </div>
                <span className="text-mute text-[12px] capitalize font-mono px-2 py-0.5 bg-soft rounded-full">
                  {m.rol}
                </span>
                {esAdmin && !esYo && (
                  <form
                    action={async () => {
                      "use server";
                      await expulsarMiembro(id, m.user_id);
                    }}
                  >
                    <Button type="submit" variant="danger" size="sm">
                      Expulsar
                    </Button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
        {esAdmin && <FormularioMiembro orgId={id} usuarios={usuariosDisponibles} />}
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-display font-medium text-[18px] tracking-[-0.01em]">
            Carpetas del equipo
          </h2>
          <div className="flex flex-col gap-2 min-[420px]:flex-row min-[420px]:items-center">
            <SelectorDocumentosOrganizacion orgId={id} documentos={docsSinVincular} />
            {esAdmin && <FormularioInlineCarpeta orgId={id} />}
          </div>
        </div>
        <ExploradorOrganizacionAdmin
          orgId={id}
          esAdmin={esAdmin}
          carpetas={carpetas ?? []}
          documentos={documentosOrganizacion}
        />
      </section>
    </div>
  );
}
