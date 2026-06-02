import { redirect } from "next/navigation";

import { Kpi } from "@/components/ui/Kpi";
import { KpiAnillo } from "@/components/ui/KpiAnillo";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/servidor";

import {
  ExploradorDocumentos,
  type CarpetaExplorador,
  type DocumentoExplorador,
} from "./ExploradorDocumentos";
import type { UsuarioInvitable } from "../documentos/[id]/FormularioInvitacion";
import { PanelSubidas } from "./PanelSubidas";

const ESPACIO_TOTAL_MB = 500;
const HOY_INICIO_MS = (() => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
})();

export default async function PaginaMisDocumentos({
  searchParams,
}: {
  searchParams: Promise<{ carpeta?: string }>;
}) {
  const { carpeta: carpetaActualParam } = await searchParams;
  const carpetaActualId = carpetaActualParam || null;
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = crearClienteAdmin();
  const { data } = await admin
    .from("Documentos")
    .select("id, nombre, tipo_archivo, confidencialidad, tamano_bytes, fecha, carpeta_id, probabilidad")
    .eq("user_id", user.id)
    .order("fecha", { ascending: false })
    .limit(100);

  const documentos: DocumentoExplorador[] = data ?? [];

  const { data: carpetasData, error: carpetasConParentError } = await admin
    .from("carpetas")
    .select("id, nombre, parent_id")
    .eq("user_id", user.id)
    .is("org_id", null)
    .order("nombre");
  let carpetas: CarpetaExplorador[] = carpetasData ?? [];
  if (carpetasConParentError) {
    const { data: carpetasPlanas } = await admin
      .from("carpetas")
      .select("id, nombre")
      .eq("user_id", user.id)
      .is("org_id", null)
      .order("nombre");
    carpetas =
      carpetasPlanas?.map((carpeta) => ({
        ...carpeta,
        parent_id: null,
      })) ?? [];
  }
  const carpetaActualSegura =
    carpetaActualId && carpetas.some((carpeta) => carpeta.id === carpetaActualId)
      ? carpetaActualId
      : null;

  const { data: objetosStorage } = await admin.storage
    .from("almacen_documentos")
    .list(user.id, { limit: 1000 });
  const total = documentos.length;
  const privados = documentos.filter((d) => (d.confidencialidad ?? 1) === 1).length;
  const publicos = total - privados;
  const espacioBytesBd = documentos.reduce(
    (acc, d) => acc + Number(d.tamano_bytes ?? 0),
    0,
  );
  const espacioBytesStorage = (objetosStorage ?? []).reduce(
    (acc, objeto) => acc + obtenerTamanoStorage(objeto.metadata),
    0,
  );
  const espacioBytes = espacioBytesStorage > 0 ? espacioBytesStorage : espacioBytesBd;
  const espacioMB = espacioBytes / (1024 * 1024);
  const espacioPct = (espacioMB / ESPACIO_TOTAL_MB) * 100;
  const hoyN = documentos.filter(
    (d) => new Date(d.fecha).getTime() >= HOY_INICIO_MS,
  ).length;
  const ultima = documentos[0] ? new Date(documentos[0].fecha) : null;
  const ultimaTexto = ultima ? formatoTiempoRelativo(ultima) : null;
  const { data: perfilesDisponibles } = await admin
    .from("profiles")
    .select("id, nombre_usuario, nombre_completo, avatar_url")
    .neq("id", user.id)
    .order("nombre_usuario");
  const usuariosInvitables: UsuarioInvitable[] = perfilesDisponibles ?? [];

  const { data: membresiasOrg } = await admin
    .from("org_miembros")
    .select("org_id, organizaciones ( id, nombre )")
    .eq("user_id", user.id);
  const organizacionesDisponibles = (membresiasOrg ?? [])
    .flatMap((m) => {
      const org = Array.isArray(m.organizaciones) ? m.organizaciones[0] : m.organizaciones;
      return org ? [{ id: org.id, nombre: org.nombre }] : [];
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  const orgIds = organizacionesDisponibles.map((org) => org.id);
  const { data: carpetasOrgData, error: carpetasOrgParentError } =
    orgIds.length > 0
      ? await admin
          .from("carpetas")
          .select("id, nombre, parent_id, org_id")
          .in("org_id", orgIds)
          .order("nombre")
      : { data: [], error: null };
  let carpetasOrganizacion = carpetasOrgData ?? [];
  if (carpetasOrgParentError && orgIds.length > 0) {
    const { data: carpetasOrgPlanas } = await admin
      .from("carpetas")
      .select("id, nombre, org_id")
      .in("org_id", orgIds)
      .order("nombre");
    carpetasOrganizacion =
      carpetasOrgPlanas?.map((carpeta) => ({
        ...carpeta,
        parent_id: null,
      })) ?? [];
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:p-8 flex flex-col gap-6 sm:gap-7">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-display italic text-accent text-sm m-0">
            - tu unidad personal
          </p>
          <h1 className="font-display font-medium text-3xl sm:text-4xl tracking-[-0.02em] m-0 mt-1">
            Mis <em className="italic text-accent">documentos</em>
          </h1>
          <p className="text-mute text-sm font-display italic mt-2">
            {total} documento{total === 1 ? "" : "s"} -{" "}
            {carpetas.length} carpeta{carpetas.length === 1 ? "" : "s"} -{" "}
            {espacioMB.toFixed(1)} MB
            {ultimaTexto ? ` - ultima subida ${ultimaTexto}` : ""}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-4 gap-3.5">
        <Kpi
          label="Documentos"
          valor={total}
          pista="en tu archivo"
          delta={hoyN > 0 ? `+${hoyN} hoy` : undefined}
        />
        <Kpi
          label="Privados"
          valor={<em className="italic text-accent font-medium">{privados}</em>}
          pista={total > 0 ? `${Math.round((privados / total) * 100)}% del total` : "-"}
          visual={total > 0 ? <KpiAnillo porcentaje={(privados / total) * 100} /> : undefined}
        />
        <Kpi
          label="Publicos"
          valor={<em className="italic text-accent font-medium">{publicos}</em>}
          pista={total > 0 ? `${Math.round((publicos / total) * 100)}% del total` : "-"}
          visual={total > 0 ? <KpiAnillo porcentaje={(publicos / total) * 100} /> : undefined}
        />
        <Kpi
          label="Espacio"
          valor={
            <>
              {espacioMB.toFixed(1)}
              <span className="text-[16px] text-mute font-display italic"> MB</span>
            </>
          }
          pista={`de ${ESPACIO_TOTAL_MB} MB`}
          delta={`${espacioPct.toFixed(1)}%`}
        />
      </div>

      <PanelSubidas carpetaActualId={carpetaActualSegura} />

      {documentos.length === 0 && carpetas.length === 0 && (
        <div className="rounded-[14px] border border-dashed border-rule bg-paper p-8 text-center">
          <h4 className="font-display font-medium text-[22px] tracking-[-0.01em] m-0 mb-1.5">
            Aun no hay <em className="italic text-accent">documentos</em>
          </h4>
          <p className="text-mute text-[13px] max-w-sm mx-auto leading-[1.55]">
            Sube tu primer archivo o crea una carpeta desde el explorador para
            organizar tu unidad.
          </p>
        </div>
      )}

      <ExploradorDocumentos
        documentos={documentos}
        carpetas={carpetas}
        carpetaActualId={carpetaActualSegura}
        usuariosInvitables={usuariosInvitables}
        organizaciones={organizacionesDisponibles}
        carpetasOrganizacion={carpetasOrganizacion}
      />
    </div>
  );
}

function formatoTiempoRelativo(d: Date): string {
  const ahora = Date.now();
  const diff = ahora - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "ahora mismo";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const dias = Math.floor(h / 24);
  if (dias < 7) return `hace ${dias} dias`;
  return d.toLocaleDateString("es-ES");
}

function obtenerTamanoStorage(metadata: unknown): number {
  if (!metadata || typeof metadata !== "object") return 0;
  const size = (metadata as { size?: unknown }).size;
  if (typeof size === "number") return size;
  if (typeof size === "string") {
    const parsed = Number(size);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}
