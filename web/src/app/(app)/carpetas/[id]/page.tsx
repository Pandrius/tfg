import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { FiabilidadModelo } from "@/components/ui/FiabilidadModelo";
import { Tag } from "@/components/ui/Tag";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { FormularioInlineCarpeta } from "../FormularioInlineCarpeta";
import type { UsuarioInvitable } from "../../documentos/[id]/FormularioInvitacion";
import { BotonEnviarDocumentoPerfil } from "../../usuarios/[id]/BotonEnviarDocumentoPerfil";
import {
  ExploradorOrganizacionAdmin,
  type DocumentoOrgAdmin,
} from "../../organizaciones/[id]/ExploradorOrganizacionAdmin";

type Carpeta = {
  id: string;
  nombre: string;
  user_id: string;
  parent_id: string | null;
  org_id: string | null;
};

type Documento = {
  id: string;
  nombre: string;
  tipo_archivo: string | null;
  confidencialidad: number | null;
  tamano_bytes: number | null;
  fecha: string;
  carpeta_id: string | null;
  probabilidad: number | null;
};

export default async function PaginaCarpeta({
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
  const { data: carpetaConParent, error: carpetaParentError } = await admin
    .from("carpetas")
    .select("id, nombre, user_id, parent_id, org_id")
    .eq("id", id)
    .single();
  const { data: carpetaSinParent } = carpetaParentError
    ? await admin
        .from("carpetas")
        .select("id, nombre, user_id, org_id")
        .eq("id", id)
        .single()
    : { data: null };
  const carpeta = carpetaConParent ?? (carpetaSinParent ? { ...carpetaSinParent, parent_id: null } : null);
  if (!carpeta) notFound();

  if (carpeta.user_id === user.id && !carpeta.org_id) {
    redirect(`/mis-documentos?carpeta=${id}`);
  }

  let org: { id: string; nombre: string } | null = null;
  let esAdminOrg = false;
  if (carpeta.org_id) {
    const [{ data: membresia }, { data: orgData }] = await Promise.all([
      admin
        .from("org_miembros")
        .select("user_id, rol")
        .eq("org_id", carpeta.org_id)
        .eq("user_id", user.id)
        .maybeSingle(),
      admin
        .from("organizaciones")
        .select("id, nombre")
        .eq("id", carpeta.org_id)
        .single(),
    ]);

    if (!membresia) redirect("/organizaciones");
    esAdminOrg = membresia.rol === "admin";
    org = orgData ?? null;
  }

  const { data: perfil } = await admin
    .from("profiles")
    .select("nombre_usuario, nombre_completo")
    .eq("id", carpeta.user_id)
    .single();

  let carpetasQuery = admin
    .from("carpetas")
    .select("id, nombre, user_id, parent_id, org_id");
  carpetasQuery = carpeta.org_id
    ? carpetasQuery.eq("org_id", carpeta.org_id)
    : carpetasQuery.eq("user_id", carpeta.user_id).is("org_id", null);
  const { data: carpetasData, error: carpetasParentError } = await carpetasQuery;
  let carpetas = (carpetasData ?? []) as Carpeta[];
  if (carpetasParentError) {
    let carpetasPlanasQuery = admin
      .from("carpetas")
      .select("id, nombre, user_id, org_id");
    carpetasPlanasQuery = carpeta.org_id
      ? carpetasPlanasQuery.eq("org_id", carpeta.org_id)
      : carpetasPlanasQuery.eq("user_id", carpeta.user_id).is("org_id", null);
    const { data: carpetasPlanas } = await carpetasPlanasQuery;
    carpetas =
      carpetasPlanas?.map((item) => ({
        ...item,
        parent_id: null,
      })) ?? [];
  }
  const idsDescendientes = obtenerIdsDescendientes(carpetas, id);

  const { data: accesoPorFavorito } = await admin
    .from("favoritos")
    .select("propietario_id")
    .eq("propietario_id", carpeta.user_id)
    .eq("favorito_id", user.id)
    .maybeSingle();
  const puedeVerPrivados = !!carpeta.org_id || carpeta.user_id === user.id || !!accesoPorFavorito;

  let documentos: Documento[] = [];
  if (carpeta.org_id) {
    const { data: orgDocs } = await admin
      .from("org_documentos")
      .select("carpeta_id, Documentos ( id, nombre, tipo_archivo, confidencialidad, tamano_bytes, fecha, probabilidad )")
      .eq("org_id", carpeta.org_id)
      .in("carpeta_id", idsDescendientes);
    documentos = (orgDocs ?? [])
      .flatMap((item) => {
        const doc = Array.isArray(item.Documentos) ? item.Documentos[0] : item.Documentos;
        return doc ? [{ ...doc, carpeta_id: item.carpeta_id }] : [];
      }) as Documento[];
  } else {
    let documentosQuery = admin
      .from("Documentos")
      .select("id, nombre, tipo_archivo, confidencialidad, tamano_bytes, fecha, carpeta_id, probabilidad")
      .in("carpeta_id", idsDescendientes)
      .order("fecha", { ascending: false })
      .eq("user_id", carpeta.user_id);
    if (!puedeVerPrivados) documentosQuery = documentosQuery.eq("confidencialidad", 0);
    const { data: documentosData } = await documentosQuery;
    documentos = (documentosData ?? []) as Documento[];
  }

  const conteosPublicos = contarDocumentosPorCarpeta(carpetas, documentos);
  const subcarpetasVisibles = carpetas
    .filter(
      (item) =>
        item.parent_id === id &&
        (!!carpeta.org_id || (conteosPublicos.get(item.id) ?? 0) > 0),
    )
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  const documentosDirectos = documentos.filter((doc) => doc.carpeta_id === id);
  const documentosOrgAdmin: DocumentoOrgAdmin[] = documentos.map((doc) => ({
    id: doc.id,
    nombre: doc.nombre,
    tipo_archivo: doc.tipo_archivo,
    confidencialidad: doc.confidencialidad,
    probabilidad: doc.probabilidad,
    tamano_bytes: doc.tamano_bytes,
    carpeta_id: doc.carpeta_id,
  }));
  const totalVisibles = documentos.length;
  const propietario = perfil?.nombre_completo || perfil?.nombre_usuario || "usuario";
  const { data: perfilesDisponibles } = await admin
    .from("profiles")
    .select("id, nombre_usuario, nombre_completo, avatar_url")
    .neq("id", user.id)
    .neq("id", carpeta.user_id)
    .order("nombre_usuario");
  const usuariosInvitables: UsuarioInvitable[] = perfilesDisponibles ?? [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col gap-7">
      <Link
        href={carpeta.org_id ? `/organizaciones/${carpeta.org_id}` : `/usuarios/${carpeta.user_id}`}
        className="text-mute text-sm hover:text-ink transition-colors inline-flex items-center gap-1"
      >
        {carpeta.org_id
          ? `< ${org?.nombre ?? "Organizacion"}`
          : `< Perfil de @${perfil?.nombre_usuario ?? "usuario"}`}
      </Link>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-display italic text-accent text-sm mb-1">
            {carpeta.org_id
              ? `- carpeta de ${org?.nombre ?? "organizacion"}`
              : `- carpeta compartida de ${propietario}`}
          </p>
          <h1 className="font-display font-medium text-[28px] tracking-[-0.02em]">
            {carpeta.nombre}
          </h1>
          <p className="text-mute text-[12px] font-mono mt-1">
            {totalVisibles} documento{totalVisibles === 1 ? "" : "s"} visible
            {totalVisibles === 1 ? "" : "s"}
          </p>
        </div>

        {totalVisibles > 0 && (
          <div className="flex flex-col gap-2 sm:flex-row">
            {carpeta.org_id && (
              <FormularioInlineCarpeta orgId={carpeta.org_id} parentId={id} />
            )}
            <a href={`/api/carpetas/${id}/descargar`} className="w-full sm:w-auto">
              <Button variant="primary" size="md" className="w-full justify-center sm:w-auto">Descargar carpeta</Button>
            </a>
          </div>
        )}
        {totalVisibles === 0 && carpeta.org_id && (
          <FormularioInlineCarpeta orgId={carpeta.org_id} parentId={id} />
        )}
      </header>

      {carpeta.org_id ? (
        <ExploradorOrganizacionAdmin
          orgId={carpeta.org_id}
          esAdmin={esAdminOrg}
          carpetas={carpetas}
          documentos={documentosOrgAdmin}
          carpetaActualId={id}
        />
      ) : (
      <div className="rounded-[14px] border border-rule bg-paper overflow-hidden">
        <div className="hidden sm:grid grid-cols-[44px_1fr_120px_110px_110px_150px] items-center px-5 py-2.5 gap-3 bg-soft text-mute font-display italic text-xs border-b border-rule">
          <div></div>
          <div>Nombre</div>
          <div>Estado</div>
          <div>Tamano</div>
          <div>Fecha</div>
          <div></div>
        </div>

        {subcarpetasVisibles.map((subcarpeta) => (
          <Link
            key={subcarpeta.id}
            href={`/carpetas/${subcarpeta.id}`}
            className="flex flex-col items-stretch gap-2 px-4 py-4 sm:grid sm:grid-cols-[44px_1fr_120px_110px_110px_150px] sm:items-center sm:px-5 sm:py-3 sm:gap-3 border-b border-rule text-[13px] hover:bg-soft transition-colors"
          >
            <span className="w-9 h-9 rounded-[8px] border border-rule bg-card grid place-items-center text-accent font-semibold">
              /
            </span>
            <span className="font-medium truncate">{subcarpeta.nombre}</span>
            <span className="text-mute text-[12px]">Carpeta</span>
            <span className="text-mute font-mono text-[12px]">
              {conteosPublicos.get(subcarpeta.id) ?? 0} docs
            </span>
            <span className="text-mute font-mono text-[12px]">-</span>
            <span></span>
          </Link>
        ))}

        {documentosDirectos.map((doc) => {
          const tipo = (doc.tipo_archivo ?? "").toUpperCase();
          const esPublico = doc.confidencialidad === 0;
          const kb = doc.tamano_bytes ? Math.round(doc.tamano_bytes / 1024) : null;
          const fecha = new Date(doc.fecha).toLocaleDateString("es-ES");

          return (
            <div
              key={doc.id}
              className="flex flex-col items-stretch gap-3 px-4 py-4 sm:grid sm:grid-cols-[44px_1fr_120px_110px_110px_150px] sm:items-center sm:px-5 sm:py-3 sm:gap-3 border-b border-rule last:border-b-0 text-[13px]"
            >
              <span className="w-9 h-11 rounded-[6px] border border-rule bg-card grid place-items-center font-display italic text-accent text-[11px]">
                {tipo.slice(0, 3) || "?"}
              </span>
              <div className="flex items-center gap-2 min-w-0">
                <Link
                  href={`/documentos/${doc.id}`}
                  className="min-w-0 font-medium hover:text-accent transition-colors truncate"
                >
                  {doc.nombre}
                </Link>
                <FiabilidadModelo
                  probabilidad={doc.probabilidad}
                  tipoArchivo={doc.tipo_archivo}
                  confidencialidad={doc.confidencialidad}
                />
              </div>
              <Tag variant={esPublico ? "pub" : "priv"}>
                {esPublico ? "publico" : "privado accesible"}
              </Tag>
              <span className="text-mute font-mono text-[12px]">
                {kb !== null ? `${kb} KB` : "-"}
              </span>
              <span className="text-mute font-mono text-[12px]">{fecha}</span>
              <div className="flex items-center justify-stretch gap-2 sm:justify-end">
                {esPublico && (
                  <BotonEnviarDocumentoPerfil
                    documentoId={doc.id}
                    nombre={doc.nombre}
                    usuarios={usuariosInvitables}
                  />
                )}
              </div>
            </div>
          );
        })}

        {subcarpetasVisibles.length === 0 && documentosDirectos.length === 0 && (
          <div className="px-5 py-10 text-center text-mute text-sm">
            Esta carpeta no contiene documentos visibles para ti.
          </div>
        )}
      </div>
      )}
    </div>
  );
}

function obtenerIdsDescendientes(carpetas: Carpeta[], carpetaId: string) {
  const ids = new Set([carpetaId]);
  let cambio = true;

  while (cambio) {
    cambio = false;
    for (const carpeta of carpetas) {
      if (carpeta.parent_id && ids.has(carpeta.parent_id) && !ids.has(carpeta.id)) {
        ids.add(carpeta.id);
        cambio = true;
      }
    }
  }

  return [...ids];
}

function contarDocumentosPorCarpeta(carpetas: Carpeta[], documentos: Documento[]) {
  const directos = new Map<string, number>();
  for (const doc of documentos) {
    if (!doc.carpeta_id) continue;
    directos.set(doc.carpeta_id, (directos.get(doc.carpeta_id) ?? 0) + 1);
  }

  const carpetasPorId = new Map(carpetas.map((carpeta) => [carpeta.id, carpeta]));
  const conteos = new Map<string, number>();

  for (const carpeta of carpetas) {
    let total = directos.get(carpeta.id) ?? 0;
    for (const doc of documentos) {
      let actual = doc.carpeta_id ? carpetasPorId.get(doc.carpeta_id) ?? null : null;
      while (actual) {
        if (actual.parent_id === carpeta.id) {
          total += 1;
          break;
        }
        actual = actual.parent_id ? carpetasPorId.get(actual.parent_id) ?? null : null;
      }
    }
    conteos.set(carpeta.id, total);
  }

  return conteos;
}
