"use server";

import { revalidatePath } from "next/cache";

import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export type Resultado = { ok: string } | { error: string } | undefined;

export async function crearCarpeta(
  _previo: unknown,
  datos: FormData,
): Promise<Resultado> {
  const nombre = String(datos.get("nombre") ?? "").trim();
  const orgId = datos.get("org_id") ? String(datos.get("org_id")) : null;
  const parentId = datos.get("parent_id") ? String(datos.get("parent_id")) : null;

  if (!nombre) return { error: "El nombre es obligatorio." };
  if (nombre.length > 100) return { error: "Máximo 100 caracteres." };

  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada." };

  const admin = crearClienteAdmin();

  if (orgId) {
    const { data: membresia } = await admin
      .from("org_miembros")
      .select("user_id")
      .eq("org_id", orgId)
      .eq("user_id", user.id)
      .single();

    if (!membresia) return { error: "No autorizado." };
  }

  if (parentId) {
    const { data: padre } = await admin
      .from("carpetas")
      .select("id, user_id, org_id")
      .eq("id", parentId)
      .single();

    if (
      !padre ||
      (padre.org_id ?? null) !== orgId ||
      (!orgId && padre.user_id !== user.id)
    ) {
      return { error: "Carpeta padre no valida." };
    }
  }

  const nuevaCarpeta: {
    nombre: string;
    user_id: string;
    org_id: string | null;
    parent_id?: string;
  } = { nombre, user_id: user.id, org_id: orgId };
  if (parentId) nuevaCarpeta.parent_id = parentId;

  const { error } = await admin.from("carpetas").insert(nuevaCarpeta);

  if (error) {
    console.error("Error creating folder:", error);
    return { error: "Error al crear la carpeta." };
  }

  revalidatePath("/carpetas");
  revalidatePath("/mis-documentos");
  if (orgId) revalidatePath(`/organizaciones/${orgId}`);
  if (parentId) revalidatePath(`/carpetas/${parentId}`);
  return { ok: "Carpeta creada." };
}

export async function renombrarCarpeta(
  _previo: unknown,
  datos: FormData,
): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada." };
  const carpetaId = String(datos.get("carpeta_id") ?? "");
  const nombre = String(datos.get("nombre") ?? "").trim();
  if (!carpetaId || !nombre || nombre.length > 100) return { error: "Datos no válidos." };
  const admin = crearClienteAdmin();
  const { data: c } = await admin.from("carpetas").select("user_id").eq("id", carpetaId).single();
  if (!c || c.user_id !== user.id) return { error: "No autorizado." };
  const { error } = await admin.from("carpetas").update({ nombre }).eq("id", carpetaId);
  if (error) return { error: error.message };
  revalidatePath("/carpetas");
  revalidatePath("/mis-documentos");
  return { ok: "Carpeta renombrada." };
}

export async function eliminarCarpeta(carpetaId: string): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada." };

  const admin = crearClienteAdmin();
  const { data: carpeta } = await admin
    .from("carpetas")
    .select("id, user_id, org_id")
    .eq("id", carpetaId)
    .maybeSingle();

  if (!carpeta || carpeta.user_id !== user.id || carpeta.org_id !== null) {
    return { error: "No autorizado." };
  }

  const { data: carpetasUsuario } = await admin
    .from("carpetas")
    .select("id, parent_id")
    .eq("user_id", user.id)
    .is("org_id", null);

  const carpetasAEliminar = obtenerSubarbolCarpetas(carpetasUsuario ?? [], carpetaId);
  const idsCarpetas = carpetasAEliminar.map((item) => item.id);

  const { data: docs } = await admin
    .from("Documentos")
    .select("id, url")
    .eq("user_id", user.id)
    .in("carpeta_id", idsCarpetas);

  const rutasStorage = (docs ?? [])
    .map((doc) => doc.url)
    .filter((url): url is string => typeof url === "string" && url.length > 0);

  if (rutasStorage.length > 0) {
    await admin.storage.from("almacen_documentos").remove(rutasStorage);
  }

  const idsDocs = (docs ?? []).map((doc) => doc.id);
  if (idsDocs.length > 0) {
    const { error: errorDocs } = await admin
      .from("Documentos")
      .delete()
      .in("id", idsDocs);

    if (errorDocs) return { error: errorDocs.message };
  }

  for (const carpetaBorrar of [...carpetasAEliminar].reverse()) {
    const { error } = await admin
      .from("carpetas")
      .delete()
      .eq("id", carpetaBorrar.id)
      .eq("user_id", user.id)
      .is("org_id", null);

    if (error) return { error: error.message };
  }

  revalidatePath("/carpetas");
  revalidatePath("/mis-documentos");
  return { ok: "Carpeta y archivos eliminados." };
}

export async function eliminarCarpetas(
  _previo: Resultado,
  datos: FormData,
): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesion expirada." };

  const ids = obtenerIds(datos, "carpeta_ids");
  if (ids.length === 0) return { error: "Selecciona alguna carpeta." };

  const admin = crearClienteAdmin();
  const { data: carpetasUsuario } = await admin
    .from("carpetas")
    .select("id, parent_id, user_id, org_id")
    .eq("user_id", user.id)
    .is("org_id", null);

  const carpetasPropias = carpetasUsuario ?? [];
  const idsPropios = new Set(carpetasPropias.map((carpeta) => carpeta.id));
  if (ids.some((id) => !idsPropios.has(id))) return { error: "No autorizado." };

  const raices = filtrarRaicesSeleccionadas(carpetasPropias, ids);
  const carpetasAEliminar = raices.flatMap((id) => obtenerSubarbolCarpetas(carpetasPropias, id));
  const idsEliminar = [...new Set(carpetasAEliminar.map((carpeta) => carpeta.id))];

  const { data: docs } = await admin
    .from("Documentos")
    .select("id, url")
    .eq("user_id", user.id)
    .in("carpeta_id", idsEliminar);

  const rutasStorage = (docs ?? [])
    .map((doc) => doc.url)
    .filter((url): url is string => typeof url === "string" && url.length > 0);

  if (rutasStorage.length > 0) {
    await admin.storage.from("almacen_documentos").remove(rutasStorage);
  }

  const idsDocs = (docs ?? []).map((doc) => doc.id);
  if (idsDocs.length > 0) {
    const { error: errorDocs } = await admin
      .from("Documentos")
      .delete()
      .in("id", idsDocs);
    if (errorDocs) return { error: errorDocs.message };
  }

  const ordenadas = carpetasAEliminar.sort(
    (a, b) => profundidadCarpeta(carpetasPropias, b.id) - profundidadCarpeta(carpetasPropias, a.id),
  );
  for (const carpeta of ordenadas) {
    const { error } = await admin
      .from("carpetas")
      .delete()
      .eq("id", carpeta.id)
      .eq("user_id", user.id)
      .is("org_id", null);
    if (error) return { error: error.message };
  }

  revalidatePath("/carpetas");
  revalidatePath("/mis-documentos");
  return { ok: "Carpetas y archivos eliminados." };
}

export async function moverCarpetas(
  _previo: Resultado,
  datos: FormData,
): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesion expirada." };

  const ids = obtenerIds(datos, "carpeta_ids");
  const destinoRaw = String(datos.get("carpeta_id") ?? "").trim();
  const destinoId = destinoRaw || null;
  if (ids.length === 0) return { error: "Selecciona alguna carpeta." };

  const admin = crearClienteAdmin();
  const { data: carpetasUsuario } = await admin
    .from("carpetas")
    .select("id, parent_id, user_id, org_id")
    .eq("user_id", user.id)
    .is("org_id", null);

  const carpetasPropias = carpetasUsuario ?? [];
  const idsPropios = new Set(carpetasPropias.map((carpeta) => carpeta.id));
  if (ids.some((id) => !idsPropios.has(id))) return { error: "No autorizado." };
  if (destinoId && !idsPropios.has(destinoId)) return { error: "Carpeta destino no valida." };

  for (const id of ids) {
    if (destinoId && (id === destinoId || esDescendienteDe(carpetasPropias, destinoId, id))) {
      return { error: "No puedes mover una carpeta dentro de si misma." };
    }
  }

  const { error } = await admin
    .from("carpetas")
    .update({ parent_id: destinoId })
    .in("id", ids)
    .eq("user_id", user.id)
    .is("org_id", null);

  if (error) return { error: error.message };

  revalidatePath("/carpetas");
  revalidatePath("/mis-documentos");
  return {
    ok: `${ids.length} carpeta${ids.length === 1 ? "" : "s"} movida${ids.length === 1 ? "" : "s"}.`,
  };
}

type CarpetaBasica = {
  id: string;
  parent_id: string | null;
};

function obtenerSubarbolCarpetas(carpetas: CarpetaBasica[], raizId: string) {
  const porId = new Map(carpetas.map((carpeta) => [carpeta.id, carpeta]));
  const porPadre = new Map<string | null, CarpetaBasica[]>();
  for (const carpeta of carpetas) {
    const hermanas = porPadre.get(carpeta.parent_id) ?? [];
    hermanas.push(carpeta);
    porPadre.set(carpeta.parent_id, hermanas);
  }

  const resultado: CarpetaBasica[] = [];
  const visitar = (id: string) => {
    const carpeta = porId.get(id);
    if (!carpeta) return;
    resultado.push(carpeta);
    for (const hija of porPadre.get(id) ?? []) visitar(hija.id);
  };

  visitar(raizId);
  return resultado;
}

function obtenerIds(datos: FormData, campo: string) {
  const crudo = datos.getAll(campo).flatMap((item) => {
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

function filtrarRaicesSeleccionadas(carpetas: CarpetaBasica[], ids: string[]) {
  const seleccion = new Set(ids);
  return ids.filter((id) => {
    let actual = carpetas.find((carpeta) => carpeta.id === id);
    while (actual?.parent_id) {
      if (seleccion.has(actual.parent_id)) return false;
      actual = carpetas.find((carpeta) => carpeta.id === actual?.parent_id);
    }
    return true;
  });
}

function profundidadCarpeta(carpetas: CarpetaBasica[], id: string) {
  let profundidad = 0;
  let actual = carpetas.find((carpeta) => carpeta.id === id);
  while (actual?.parent_id) {
    profundidad++;
    actual = carpetas.find((carpeta) => carpeta.id === actual?.parent_id);
  }
  return profundidad;
}

function esDescendienteDe(carpetas: CarpetaBasica[], posibleDescendienteId: string, posiblePadreId: string) {
  let actual = carpetas.find((carpeta) => carpeta.id === posibleDescendienteId);
  while (actual?.parent_id) {
    if (actual.parent_id === posiblePadreId) return true;
    actual = carpetas.find((carpeta) => carpeta.id === actual?.parent_id);
  }
  return false;
}

export async function quitarDocumentoDeCarpeta(docId: string): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada." };
  const admin = crearClienteAdmin();
  const { data: doc } = await admin.from("Documentos").select("user_id").eq("id", docId).single();
  if (!doc || doc.user_id !== user.id) return { error: "No autorizado." };
  const { error } = await admin.from("Documentos").update({ carpeta_id: null }).eq("id", docId);
  if (error) return { error: error.message };
  revalidatePath("/carpetas");
  return { ok: "Documento quitado de la carpeta." };
}

export async function agregarDocumentoACarpeta(
  carpetaId: string,
  documentoId: string,
): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "SesiÃ³n expirada." };

  const admin = crearClienteAdmin();
  const { data: carpeta } = await admin
    .from("carpetas")
    .select("id, user_id")
    .eq("id", carpetaId)
    .single();
  if (!carpeta || carpeta.user_id !== user.id) return { error: "No autorizado." };

  const { data: doc } = await admin
    .from("Documentos")
    .select("id, user_id")
    .eq("id", documentoId)
    .single();
  if (!doc || doc.user_id !== user.id) return { error: "Documento no encontrado." };

  const { error } = await admin
    .from("Documentos")
    .update({ carpeta_id: carpetaId })
    .eq("id", documentoId);
  if (error) return { error: error.message };

  revalidatePath("/carpetas");
  revalidatePath(`/carpetas/${carpetaId}`);
  revalidatePath("/mis-documentos");
  return { ok: "Documento agregado a la carpeta." };
}

export async function moverDocumento(
  documentoId: string,
  carpetaId: string | null,
): Promise<void> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("Documentos")
    .update({ carpeta_id: carpetaId })
    .eq("id", documentoId)
    .eq("user_id", user.id);

  revalidatePath("/mis-documentos");
  revalidatePath("/carpetas");
}
