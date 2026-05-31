"use server";

import { revalidatePath } from "next/cache";

import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export type Resultado =
  | { ok: string }
  | { error: string }
  | undefined;

/**
 * Cambia la confidencialidad de un documento del usuario.
 * 0 = público, 1 = privado.
 */
export async function actualizarConfidencialidad(
  _previo: Resultado,
  datos: FormData,
): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada." };

  const docId = String(datos.get("doc_id") ?? "");
  const nueva = Number(datos.get("nueva"));
  if (!docId || (nueva !== 0 && nueva !== 1)) {
    return { error: "Datos no válidos." };
  }

  const admin = crearClienteAdmin();
  const { data: doc, error: errSel } = await admin
    .from("Documentos")
    .select("user_id")
    .eq("id", docId)
    .single();
  if (errSel || !doc) return { error: "Documento no encontrado." };
  if (doc.user_id !== user.id) return { error: "No autorizado." };

  const { error } = await admin
    .from("Documentos")
    .update({ confidencialidad: nueva })
    .eq("id", docId);
  if (error) return { error: error.message };

  revalidatePath("/mis-documentos");
  return {
    ok: nueva === 0 ? "Documento marcado como público." : "Documento marcado como privado.",
  };
}

/** Renombra un documento del usuario. */
export async function renombrarDocumento(
  _previo: Resultado,
  datos: FormData,
): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada." };

  const docId = String(datos.get("doc_id") ?? "");
  const nombre = String(datos.get("nombre") ?? "").trim();
  if (!docId) return { error: "Documento no válido." };
  if (!nombre) return { error: "El nombre no puede estar vacío." };
  if (nombre.length > 200) return { error: "Máximo 200 caracteres." };

  const admin = crearClienteAdmin();
  const { data: doc, error: errSel } = await admin
    .from("Documentos")
    .select("user_id")
    .eq("id", docId)
    .single();
  if (errSel || !doc) return { error: "Documento no encontrado." };
  if (doc.user_id !== user.id) return { error: "No autorizado." };

  const { error } = await admin
    .from("Documentos")
    .update({ nombre })
    .eq("id", docId);
  if (error) return { error: error.message };

  revalidatePath("/mis-documentos");
  return { ok: "Nombre actualizado." };
}

/** Mueve un documento del usuario a una carpeta (o lo saca de todas). */
export async function moverDocumentoACarpeta(
  _previo: Resultado,
  datos: FormData,
): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada." };
  const docId = String(datos.get("doc_id") ?? "");
  const carpetaIdRaw = String(datos.get("carpeta_id") ?? "");
  const carpetaId = carpetaIdRaw || null;
  if (!docId) return { error: "Documento no válido." };
  const admin = crearClienteAdmin();
  const { data: doc, error: errSel } = await admin
    .from("Documentos")
    .select("user_id")
    .eq("id", docId)
    .single();
  if (errSel || !doc) return { error: "Documento no encontrado." };
  if (doc.user_id !== user.id) return { error: "No autorizado." };
  const { error } = await admin
    .from("Documentos")
    .update({ carpeta_id: carpetaId })
    .eq("id", docId);
  if (error) return { error: error.message };
  revalidatePath("/mis-documentos");
  if (carpetaId) revalidatePath(`/mis-documentos?carpeta=${carpetaId}`);
  return { ok: carpetaId ? "Documento movido a la carpeta." : "Documento sin carpeta." };
}

/** Elimina un documento del usuario (storage + BD). */
export async function eliminarDocumento(
  _previo: Resultado,
  datos: FormData,
): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada." };

  const docId = String(datos.get("doc_id") ?? "");
  if (!docId) return { error: "Documento no válido." };

  const admin = crearClienteAdmin();
  const { data: doc, error: errSel } = await admin
    .from("Documentos")
    .select("user_id, url")
    .eq("id", docId)
    .single();
  if (errSel || !doc) return { error: "Documento no encontrado." };
  if (doc.user_id !== user.id) return { error: "No autorizado." };

  // Borrar el fichero del bucket (best-effort: si falla, igualmente borramos el registro
  // para no dejar al usuario con un documento que no puede gestionar).
  await admin.storage.from("almacen_documentos").remove([doc.url]);

  const { error } = await admin.from("Documentos").delete().eq("id", docId);
  if (error) return { error: error.message };

  revalidatePath("/mis-documentos");
  return { ok: "Documento eliminado." };
}

export async function eliminarDocumentos(
  _previo: Resultado,
  datos: FormData,
): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "SesiÃ³n expirada." };

  const ids = obtenerIds(datos);
  if (ids.length === 0) return { error: "Selecciona algun documento." };

  const admin = crearClienteAdmin();
  const { data: docs, error: errSel } = await admin
    .from("Documentos")
    .select("id, user_id, url")
    .in("id", ids);

  if (errSel) return { error: errSel.message };
  const propios = (docs ?? []).filter((doc) => doc.user_id === user.id);
  if (propios.length !== ids.length) return { error: "No autorizado." };

  const rutas = propios
    .map((doc) => doc.url)
    .filter((url): url is string => typeof url === "string" && url.length > 0);
  if (rutas.length > 0) {
    await admin.storage.from("almacen_documentos").remove(rutas);
  }

  const { error } = await admin
    .from("Documentos")
    .delete()
    .in("id", ids);

  if (error) return { error: error.message };

  revalidatePath("/mis-documentos");
  return {
    ok: `${ids.length} documento${ids.length === 1 ? "" : "s"} eliminado${ids.length === 1 ? "" : "s"}.`,
  };
}

export async function moverDocumentosACarpeta(
  _previo: Resultado,
  datos: FormData,
): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "SesiÃ³n expirada." };

  const ids = obtenerIds(datos);
  const carpetaIdRaw = String(datos.get("carpeta_id") ?? "");
  const carpetaId = carpetaIdRaw || null;
  if (ids.length === 0) return { error: "Selecciona algun documento." };

  const admin = crearClienteAdmin();
  if (carpetaId) {
    const { data: carpeta } = await admin
      .from("carpetas")
      .select("id, user_id, org_id")
      .eq("id", carpetaId)
      .maybeSingle();
    if (!carpeta || carpeta.user_id !== user.id || carpeta.org_id !== null) {
      return { error: "Carpeta no valida." };
    }
  }

  const { data: docs, error: errSel } = await admin
    .from("Documentos")
    .select("id, user_id")
    .in("id", ids);
  if (errSel) return { error: errSel.message };
  if ((docs ?? []).length !== ids.length || (docs ?? []).some((doc) => doc.user_id !== user.id)) {
    return { error: "No autorizado." };
  }

  const { error } = await admin
    .from("Documentos")
    .update({ carpeta_id: carpetaId })
    .in("id", ids);
  if (error) return { error: error.message };

  revalidatePath("/mis-documentos");
  if (carpetaId) revalidatePath(`/mis-documentos?carpeta=${carpetaId}`);
  return {
    ok: `${ids.length} documento${ids.length === 1 ? "" : "s"} movido${ids.length === 1 ? "" : "s"}.`,
  };
}

function obtenerIds(datos: FormData) {
  const crudo = datos.getAll("doc_ids").flatMap((item) => {
    const valor = String(item ?? "").trim();
    if (!valor) return [];
    try {
      const parseado = JSON.parse(valor) as unknown;
      if (Array.isArray(parseado)) {
        return parseado.filter((id): id is string => typeof id === "string" && id.length > 0);
      }
    } catch {
      return [valor];
    }
    return [valor];
  });

  return [...new Set(crudo)];
}
