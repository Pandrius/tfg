"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export type ResultadoOrg = { error: string } | { id: string };

const LIMITE_ORG_BYTES = 500 * 1024 * 1024;

export async function crearOrganizacion(
  _previo: ResultadoOrg | undefined,
  datos: FormData,
): Promise<ResultadoOrg> {
  const nombre = String(datos.get("nombre") ?? "").trim();
  if (!nombre) return { error: "El nombre es obligatorio" };

  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Usamos el cliente admin para saltar RLS durante la creación inicial.
  // Esto es necesario porque el .select("id") fallaría ya que el usuario
  // aún no es miembro (la policy de SELECT requiere ser miembro).
  const admin = crearClienteAdmin();
  const yaAdmin = await usuarioEsAdminDeOtraOrganizacion(admin, user.id, null);
  if (yaAdmin) {
    return { error: "Ya administras una organizacion. Solo puedes ser admin de una a la vez." };
  }

  const { data: org, error: errorOrg } = await admin
    .from("organizaciones")
    .insert({ nombre })
    .select("id")
    .single();

  if (errorOrg || !org) {
    console.error("Error creating org:", errorOrg);
    return { error: "Error al crear la organización" };
  }

  const { error: errorMiembro } = await admin
    .from("org_miembros")
    .insert({ org_id: org.id, user_id: user.id, rol: "admin" });

  if (errorMiembro) {
    console.error("Error adding initial member:", errorMiembro);
    // Podríamos intentar borrar la org si falla esto, pero el admin bypass
    // asegura que no debería fallar por permisos.
    return { error: "Error al configurar la membresía inicial" };
  }

  revalidatePath("/organizaciones");
  return { id: org.id };
}

export async function agregarMiembro(
  orgId: string,
  _previo: { error: string } | { ok: true } | undefined,
  datos: FormData,
): Promise<{ error: string } | { ok: true } | undefined> {
  const userId = String(datos.get("user_id") ?? "").trim();
  const nombreUsuario = String(datos.get("nombre_usuario") ?? "").trim();
  if (!userId && !nombreUsuario) return { error: "Selecciona un usuario" };

  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = crearClienteAdmin();

  // Buscar el perfil por id seleccionado o, como fallback, por nombre exacto.
  let query = admin
    .from("profiles")
    .select("id, nombre_usuario");
  query = userId ? query.eq("id", userId) : query.eq("nombre_usuario", nombreUsuario);
  const { data: perfil } = await query.single();

  if (!perfil) return { error: "Usuario no encontrado" };
  if (perfil.id === user.id) return { error: "Ya eres miembro de esta organización" };

  // Insertar como admin para evitar fallos de RLS
  const { error } = await admin
    .from("org_miembros")
    .insert({ org_id: orgId, user_id: perfil.id, rol: "miembro" });

  if (error?.code === "23505") return { error: "Ese usuario ya es miembro" };
  if (error) {
    console.error("Error adding member:", error);
    return { error: "Error al añadir el miembro" };
  }

  revalidatePath("/organizaciones");
  revalidatePath(`/organizaciones/${orgId}`);
  return { ok: true };
}

export async function invitarMiembroOrg(
  orgId: string,
  _previo: { error: string } | { ok: true } | undefined,
  datos: FormData,
): Promise<{ error: string } | { ok: true } | undefined> {
  const userId = String(datos.get("user_id") ?? "").trim();
  const nombreUsuario = String(datos.get("nombre_usuario") ?? "").trim();
  if (!userId && !nombreUsuario) return { error: "Selecciona un usuario" };

  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = crearClienteAdmin();
  const { data: miMembresia } = await admin
    .from("org_miembros")
    .select("rol")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .single();
  if (miMembresia?.rol !== "admin") return { error: "No autorizado" };

  let query = admin.from("profiles").select("id, nombre_usuario");
  query = userId ? query.eq("id", userId) : query.eq("nombre_usuario", nombreUsuario);
  const { data: perfil } = await query.single();

  if (!perfil) return { error: "Usuario no encontrado" };
  if (perfil.id === user.id) return { error: "Ya eres miembro de esta organizacion" };

  const { data: miembroExistente } = await admin
    .from("org_miembros")
    .select("user_id")
    .eq("org_id", orgId)
    .eq("user_id", perfil.id)
    .maybeSingle();
  if (miembroExistente) return { error: "Ese usuario ya es miembro" };

  const { error } = await admin.from("org_invitaciones").insert({
    org_id: orgId,
    invitado_id: perfil.id,
    invitador_id: user.id,
    estado: "pendiente",
  });

  if (error?.code === "23505") return { error: "Ese usuario ya tiene una invitacion pendiente" };
  if (error) {
    console.error("Error creating org invitation:", error);
    if (esTablaInvitacionesNoDisponible(error)) {
      return { error: "Falta aplicar la migracion de invitaciones de organizacion en Supabase." };
    }
    return { error: "Error al enviar la invitacion" };
  }

  revalidatePath("/buzon");
  revalidatePath("/organizaciones");
  revalidatePath(`/organizaciones/${orgId}`);
  return { ok: true };
}

export async function aceptarInvitacionOrg(invitacionId: string): Promise<void> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = crearClienteAdmin();
  const { data: invitacion } = await admin
    .from("org_invitaciones")
    .select("id, org_id, invitado_id, estado")
    .eq("id", invitacionId)
    .eq("invitado_id", user.id)
    .eq("estado", "pendiente")
    .single();
  if (!invitacion) return;

  const { error: errorMiembro } = await admin
    .from("org_miembros")
    .insert({ org_id: invitacion.org_id, user_id: user.id, rol: "miembro" });
  if (errorMiembro && errorMiembro.code !== "23505") {
    console.error("Error accepting org invitation:", errorMiembro);
    return;
  }

  await admin
    .from("org_invitaciones")
    .update({ estado: "aceptada", fecha_respuesta: new Date().toISOString() })
    .eq("id", invitacionId)
    .eq("invitado_id", user.id);

  revalidatePath("/buzon");
  revalidatePath("/organizaciones");
  revalidatePath(`/organizaciones/${invitacion.org_id}`);
}

export async function rechazarInvitacionOrg(invitacionId: string): Promise<void> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = crearClienteAdmin();
  await admin
    .from("org_invitaciones")
    .update({ estado: "rechazada", fecha_respuesta: new Date().toISOString() })
    .eq("id", invitacionId)
    .eq("invitado_id", user.id)
    .eq("estado", "pendiente");

  revalidatePath("/buzon");
}

export async function expulsarMiembro(orgId: string, userId: string): Promise<void> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  if (user.id === userId) return;

  const admin = crearClienteAdmin();
  const { data: membresia } = await admin
    .from("org_miembros")
    .select("rol")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .single();

  if (membresia?.rol !== "admin") return;

  const { data: org } = await admin
    .from("organizaciones")
    .select("nombre")
    .eq("id", orgId)
    .maybeSingle();

  const { error } = await admin
    .from("org_miembros")
    .delete()
    .eq("org_id", orgId)
    .eq("user_id", userId);

  if (error) {
    console.error("Error removing org member:", error);
    return;
  }

  await admin.from("org_notificaciones").insert({
    user_id: userId,
    org_id: orgId,
    tipo: "expulsion",
    mensaje: `Has sido expulsado de la organizacion ${org?.nombre ?? ""}.`.trim(),
  });

  revalidatePath("/organizaciones");
  revalidatePath("/buzon");
  revalidatePath(`/organizaciones/${orgId}`);
  redirect(`/organizaciones/${orgId}`);
}

export async function salirOrganizacion(orgId: string): Promise<void> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = crearClienteAdmin();
  const { data: membresia } = await admin
    .from("org_miembros")
    .select("rol")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .single();

  if (!membresia) redirect("/organizaciones");

  if (membresia.rol === "admin") {
    const { data: otrosMiembros } = await admin
      .from("org_miembros")
      .select("user_id")
      .eq("org_id", orgId)
      .neq("user_id", user.id);

    if (!otrosMiembros || otrosMiembros.length === 0) {
      const { error: errorOrg } = await admin
        .from("organizaciones")
        .delete()
        .eq("id", orgId);

      if (errorOrg) {
        console.error("Error deleting empty org while leaving:", errorOrg);
        redirect(`/organizaciones/${orgId}`);
      }

      revalidatePath("/organizaciones");
      redirect("/organizaciones");
    }

    let nuevoAdminId: string | null = null;
    for (const miembro of otrosMiembros) {
      const yaAdmin = await usuarioEsAdminDeOtraOrganizacion(admin, miembro.user_id, orgId);
      if (!yaAdmin) {
        nuevoAdminId = miembro.user_id;
        break;
      }
    }

    if (!nuevoAdminId) redirect(`/organizaciones/${orgId}`);

    const { error: errorNuevoAdmin } = await admin
      .from("org_miembros")
      .update({ rol: "admin" })
      .eq("org_id", orgId)
      .eq("user_id", nuevoAdminId);

    if (errorNuevoAdmin) {
      console.error("Error promoting new admin while leaving:", errorNuevoAdmin);
      redirect(`/organizaciones/${orgId}`);
    }
  }

  const { error } = await admin
    .from("org_miembros")
    .delete()
    .eq("org_id", orgId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error leaving org:", error);
    redirect(`/organizaciones/${orgId}`);
  }

  revalidatePath("/organizaciones");
  revalidatePath(`/organizaciones/${orgId}`);
  redirect("/organizaciones");
}

export async function transferirCreador(
  orgId: string,
  nuevoAdminUserId: string,
): Promise<void> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (user.id === nuevoAdminUserId) return;

  const admin = crearClienteAdmin();
  const { data: miMembresia } = await admin
    .from("org_miembros")
    .select("rol")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .single();

  if (miMembresia?.rol !== "admin") return;

  const { data: nuevoAdmin } = await admin
    .from("org_miembros")
    .select("user_id")
    .eq("org_id", orgId)
    .eq("user_id", nuevoAdminUserId)
    .single();

  if (!nuevoAdmin) return;

  const yaAdmin = await usuarioEsAdminDeOtraOrganizacion(admin, nuevoAdminUserId, orgId);
  if (yaAdmin) return;

  const { error: errorNuevoAdmin } = await admin
    .from("org_miembros")
    .update({ rol: "admin" })
    .eq("org_id", orgId)
    .eq("user_id", nuevoAdminUserId);

  if (errorNuevoAdmin) {
    console.error("Error promoting org member:", errorNuevoAdmin);
    return;
  }

  const { error: errorActual } = await admin
    .from("org_miembros")
    .update({ rol: "miembro" })
    .eq("org_id", orgId)
    .eq("user_id", user.id);

  if (errorActual) {
    console.error("Error demoting previous org admin:", errorActual);
    return;
  }

  revalidatePath("/organizaciones");
  revalidatePath(`/organizaciones/${orgId}`);
  redirect(`/organizaciones/${orgId}`);
}

export async function vincularDocumento(
  orgId: string,
  documentoId: string,
): Promise<void> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const admin = crearClienteAdmin();
  const [{ data: membresia }, { data: doc }] = await Promise.all([
    admin
      .from("org_miembros")
      .select("rol")
      .eq("org_id", orgId)
      .eq("user_id", user.id)
      .single(),
    admin
      .from("Documentos")
      .select("id, tamano_bytes")
      .eq("id", documentoId)
      .single(),
  ]);

  if (membresia?.rol !== "admin") return;
  if (!doc) return;
  if (await documentoNombreExisteEnOrganizacion(admin, orgId, documentoId)) return;

  const cabe = await documentoCabeEnOrganizacion(
    admin,
    orgId,
    documentoId,
    Number(doc.tamano_bytes ?? 0),
  );
  if (!cabe) return;

  const { error } = await admin
    .from("org_documentos")
    .upsert(
      { org_id: orgId, documento_id: documentoId, carpeta_id: null },
      { onConflict: "org_id,documento_id" },
    );

  if (error) {
    console.error("Error linking document to org:", error);
    return;
  }

  revalidatePath("/organizaciones");
  revalidatePath(`/organizaciones/${orgId}`);
  redirect(`/organizaciones/${orgId}`);
}

export async function subirDocumentoAOrganizacion(
  _previo: { error: string } | { ok: string } | undefined,
  datos: FormData,
): Promise<{ error: string } | { ok: string } | undefined> {
  const orgId = String(datos.get("org_id") ?? "").trim();
  const documentoId = String(datos.get("documento_id") ?? "").trim();
  const carpetaIdRaw = String(datos.get("carpeta_id") ?? "").trim();
  const carpetaId = carpetaIdRaw || null;
  if (!orgId || !documentoId) return { error: "Datos incompletos." };

  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = crearClienteAdmin();
  const [{ data: membresia }, { data: doc }] = await Promise.all([
    admin
      .from("org_miembros")
      .select("user_id")
      .eq("org_id", orgId)
      .eq("user_id", user.id)
      .maybeSingle(),
    admin
      .from("Documentos")
      .select("id, user_id, tamano_bytes")
      .eq("id", documentoId)
      .single(),
  ]);

  if (!membresia) return { error: "No perteneces a esa organizacion." };
  if (!doc || doc.user_id !== user.id) return { error: "Documento no encontrado." };
  if (await documentoNombreExisteEnOrganizacion(admin, orgId, documentoId)) {
    return { error: "Ya hay un documento con ese nombre en la organizacion." };
  }

  const cabe = await documentoCabeEnOrganizacion(
    admin,
    orgId,
    documentoId,
    Number(doc.tamano_bytes ?? 0),
  );
  if (!cabe) {
    return { error: "La organizacion no tiene espacio suficiente para ese documento." };
  }

  if (carpetaId) {
    const { data: carpeta } = await admin
      .from("carpetas")
      .select("id, org_id")
      .eq("id", carpetaId)
      .eq("org_id", orgId)
      .single();
    if (!carpeta) return { error: "Carpeta de organizacion no valida." };
  }

  const { error: errorVinculo } = await admin.from("org_documentos").upsert(
    { org_id: orgId, documento_id: documentoId, carpeta_id: carpetaId },
    { onConflict: "org_id,documento_id" },
  );
  if (errorVinculo) {
    console.error("Error linking document to org:", errorVinculo);
    return { error: "Error al subir el documento a la organizacion." };
  }

  revalidatePath("/mis-documentos");
  revalidatePath("/organizaciones");
  revalidatePath(`/organizaciones/${orgId}`);
  if (carpetaId) revalidatePath(`/carpetas/${carpetaId}`);
  return { ok: "Documento subido a la organizacion." };
}

export async function subirCarpetaAOrganizacion(
  _previo: { error: string } | { ok: string } | undefined,
  datos: FormData,
): Promise<{ error: string } | { ok: string } | undefined> {
  const orgId = String(datos.get("org_id") ?? "").trim();
  const carpetaId = String(datos.get("carpeta_id") ?? "").trim();
  const carpetaDestinoRaw = String(datos.get("carpeta_destino_id") ?? "").trim();
  const carpetaDestinoId = carpetaDestinoRaw || null;
  if (!orgId || !carpetaId) return { error: "Datos incompletos." };

  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = crearClienteAdmin();
  const [{ data: membresia }, { data: carpetaRaiz }] = await Promise.all([
    admin
      .from("org_miembros")
      .select("user_id")
      .eq("org_id", orgId)
      .eq("user_id", user.id)
      .maybeSingle(),
    admin
      .from("carpetas")
      .select("id, nombre, parent_id, org_id, user_id")
      .eq("id", carpetaId)
      .maybeSingle(),
  ]);

  if (!membresia) return { error: "No perteneces a esa organizacion." };
  if (!carpetaRaiz || carpetaRaiz.user_id !== user.id || carpetaRaiz.org_id !== null) {
    return { error: "Carpeta no encontrada." };
  }

  if (carpetaDestinoId) {
    const { data: carpetaDestino } = await admin
      .from("carpetas")
      .select("id")
      .eq("id", carpetaDestinoId)
      .eq("org_id", orgId)
      .maybeSingle();
    if (!carpetaDestino) return { error: "Carpeta de organizacion no valida." };
  }

  const { data: carpetasUsuario } = await admin
    .from("carpetas")
    .select("id, nombre, parent_id")
    .eq("user_id", user.id)
    .is("org_id", null);

  const carpetasIncluidas = obtenerSubarbolCarpetas(carpetasUsuario ?? [], carpetaId);
  if (carpetasIncluidas.length === 0) return { error: "Carpeta no encontrada." };

  const idsCarpetas = carpetasIncluidas.map((carpeta) => carpeta.id);
  const { data: docs } = await admin
    .from("Documentos")
    .select("id, nombre, tamano_bytes, carpeta_id")
    .eq("user_id", user.id)
    .in("carpeta_id", idsCarpetas);

  const documentos = docs ?? [];
  if (documentos.length === 0) return { error: "La carpeta no contiene documentos." };

  const { data: orgDocs } = await admin
    .from("org_documentos")
    .select("documento_id, Documentos ( id, nombre, tamano_bytes )")
    .eq("org_id", orgId);

  const nombresExistentes = new Map<string, string>();
  const idsYaVinculados = new Set<string>();
  let usadoBytes = 0;
  for (const item of orgDocs ?? []) {
    const doc = Array.isArray(item.Documentos) ? item.Documentos[0] : item.Documentos;
    if (!doc?.id) continue;
    idsYaVinculados.add(doc.id);
    nombresExistentes.set(String(doc.nombre).toLowerCase(), doc.id);
    usadoBytes += Number(doc.tamano_bytes ?? 0);
  }

  for (const doc of documentos) {
    const idExistente = nombresExistentes.get(String(doc.nombre).toLowerCase());
    if (idExistente && idExistente !== doc.id) {
      return { error: `Ya hay un documento llamado "${doc.nombre}" en la organizacion.` };
    }
  }

  const bytesNuevos = documentos.reduce((acc, doc) => {
    if (idsYaVinculados.has(doc.id)) return acc;
    return acc + Number(doc.tamano_bytes ?? 0);
  }, 0);
  if (usadoBytes + bytesNuevos > LIMITE_ORG_BYTES) {
    return { error: "La organizacion no tiene espacio suficiente para esa carpeta." };
  }

  const mapaCarpetasOrg = new Map<string, string>();
  const carpetasOrdenadas = ordenarCarpetasPorJerarquia(carpetasIncluidas, carpetaId);

  for (const carpeta of carpetasOrdenadas) {
    const parentId =
      carpeta.id === carpetaId
        ? carpetaDestinoId
        : mapaCarpetasOrg.get(carpeta.parent_id ?? "") ?? carpetaDestinoId;
    const { data: creada, error } = await admin
      .from("carpetas")
      .insert({
        nombre: carpeta.nombre,
        user_id: user.id,
        org_id: orgId,
        parent_id: parentId,
      })
      .select("id")
      .single();

    if (error || !creada) {
      console.error("Error creating org folder copy:", error);
      return { error: "Error al crear la carpeta en la organizacion." };
    }
    mapaCarpetasOrg.set(carpeta.id, creada.id);
  }

  const vinculos = documentos.map((doc) => ({
    org_id: orgId,
    documento_id: doc.id,
    carpeta_id: mapaCarpetasOrg.get(doc.carpeta_id ?? "") ?? null,
  }));

  const { error: errorVinculos } = await admin
    .from("org_documentos")
    .upsert(vinculos, { onConflict: "org_id,documento_id" });

  if (errorVinculos) {
    console.error("Error linking folder documents to org:", errorVinculos);
    return { error: "Error al subir la carpeta a la organizacion." };
  }

  revalidatePath("/mis-documentos");
  revalidatePath("/organizaciones");
  revalidatePath(`/organizaciones/${orgId}`);
  return { ok: "Carpeta subida a la organizacion." };
}

export async function desvincularDocumento(
  orgId: string,
  documentoId: string,
): Promise<void> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const admin = crearClienteAdmin();
  const { data: membresia } = await admin
    .from("org_miembros")
    .select("rol")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .single();

  if (membresia?.rol !== "admin") return;

  const { error } = await admin
    .from("org_documentos")
    .delete()
    .eq("org_id", orgId)
    .eq("documento_id", documentoId);

  if (error) {
    console.error("Error unlinking document from org:", error);
    return;
  }

  revalidatePath("/organizaciones");
  revalidatePath(`/organizaciones/${orgId}`);
  redirect(`/organizaciones/${orgId}`);
}

export async function eliminarDocumentoOrganizacion(
  orgId: string,
  documentoId: string,
): Promise<void> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const admin = crearClienteAdmin();
  const [{ data: membresia }, { data: doc }] = await Promise.all([
    admin
      .from("org_miembros")
      .select("rol")
      .eq("org_id", orgId)
      .eq("user_id", user.id)
      .single(),
    admin
      .from("Documentos")
      .select("id, url")
      .eq("id", documentoId)
      .single(),
  ]);

  if (membresia?.rol !== "admin" || !doc) return;

  const { error: errorDb } = await admin
    .from("Documentos")
    .delete()
    .eq("id", documentoId);

  if (errorDb) {
    console.error("Error deleting org document:", errorDb);
    return;
  }

  if (doc.url) {
    await admin.storage.from("almacen_documentos").remove([doc.url]);
  }

  revalidatePath("/organizaciones");
  revalidatePath(`/organizaciones/${orgId}`);
  redirect(`/organizaciones/${orgId}`);
}

export async function moverElementosOrganizacion(
  _previo: { error: string } | { ok: string } | undefined,
  datos: FormData,
): Promise<{ error: string } | { ok: string } | undefined> {
  const orgId = String(datos.get("org_id") ?? "").trim();
  const destinoRaw = String(datos.get("carpeta_id") ?? "").trim();
  const destinoId = destinoRaw || null;
  const docIds = obtenerIdsFormData(datos, "doc_ids");
  const carpetaIds = obtenerIdsFormData(datos, "carpeta_ids");
  if (!orgId || docIds.length + carpetaIds.length === 0) return { error: "Seleccion incompleta." };

  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = crearClienteAdmin();
  const esMiembro = await usuarioEsMiembroOrganizacion(admin, orgId, user.id);
  if (!esMiembro) return { error: "No autorizado." };

  const { data: carpetasOrg } = await admin
    .from("carpetas")
    .select("id, parent_id")
    .eq("org_id", orgId);
  const carpetas = carpetasOrg ?? [];
  const idsCarpetasOrg = new Set(carpetas.map((carpeta) => carpeta.id));

  if (destinoId && !idsCarpetasOrg.has(destinoId)) return { error: "Carpeta destino no valida." };
  if (carpetaIds.some((id) => !idsCarpetasOrg.has(id))) return { error: "Carpeta no valida." };
  for (const carpetaId of carpetaIds) {
    if (destinoId && (destinoId === carpetaId || esDescendienteCarpeta(carpetas, destinoId, carpetaId))) {
      return { error: "No puedes mover una carpeta dentro de si misma." };
    }
  }

  if (docIds.length > 0) {
    const { data: vinculos } = await admin
      .from("org_documentos")
      .select("documento_id")
      .eq("org_id", orgId)
      .in("documento_id", docIds);
    if ((vinculos ?? []).length !== docIds.length) return { error: "Documento no valido." };

    const { error } = await admin
      .from("org_documentos")
      .update({ carpeta_id: destinoId })
      .eq("org_id", orgId)
      .in("documento_id", docIds);
    if (error) return { error: error.message };
  }

  if (carpetaIds.length > 0) {
    const { error } = await admin
      .from("carpetas")
      .update({ parent_id: destinoId })
      .eq("org_id", orgId)
      .in("id", carpetaIds);
    if (error) return { error: error.message };
  }

  revalidatePath("/organizaciones");
  revalidatePath(`/organizaciones/${orgId}`);
  return { ok: "Elementos movidos." };
}

export async function renombrarElementoOrganizacion(
  _previo: { error: string } | { ok: string } | undefined,
  datos: FormData,
): Promise<{ error: string } | { ok: string } | undefined> {
  const orgId = String(datos.get("org_id") ?? "").trim();
  const tipo = String(datos.get("tipo") ?? "").trim();
  const id = String(datos.get("id") ?? "").trim();
  const nombre = String(datos.get("nombre") ?? "").trim();
  if (!orgId || !id || !nombre) return { error: "Datos incompletos." };
  if (nombre.length > 200) return { error: "Nombre demasiado largo." };
  if (tipo !== "doc" && tipo !== "carpeta") return { error: "Tipo no valido." };

  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = crearClienteAdmin();
  const esMiembro = await usuarioEsMiembroOrganizacion(admin, orgId, user.id);
  if (!esMiembro) return { error: "No autorizado." };

  if (tipo === "carpeta") {
    const { data: carpeta } = await admin
      .from("carpetas")
      .select("id")
      .eq("id", id)
      .eq("org_id", orgId)
      .maybeSingle();
    if (!carpeta) return { error: "Carpeta no valida." };

    const { error } = await admin
      .from("carpetas")
      .update({ nombre })
      .eq("id", id)
      .eq("org_id", orgId);
    if (error) return { error: error.message };
  } else {
    const { data: vinculo } = await admin
      .from("org_documentos")
      .select("documento_id")
      .eq("org_id", orgId)
      .eq("documento_id", id)
      .maybeSingle();
    if (!vinculo) return { error: "Documento no valido." };

    const { error } = await admin
      .from("Documentos")
      .update({ nombre })
      .eq("id", id);
    if (error) return { error: error.message };
  }

  revalidatePath("/organizaciones");
  revalidatePath(`/organizaciones/${orgId}`);
  return { ok: "Nombre actualizado." };
}

export async function eliminarElementosOrganizacion(
  _previo: { error: string } | { ok: string } | undefined,
  datos: FormData,
): Promise<{ error: string } | { ok: string } | undefined> {
  const orgId = String(datos.get("org_id") ?? "").trim();
  const docIds = obtenerIdsFormData(datos, "doc_ids");
  const carpetaIds = obtenerIdsFormData(datos, "carpeta_ids");
  if (!orgId || docIds.length + carpetaIds.length === 0) return { error: "Seleccion incompleta." };

  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = crearClienteAdmin();
  const esAdmin = await usuarioEsAdminOrganizacion(admin, orgId, user.id);
  if (!esAdmin) return { error: "No autorizado." };

  const { data: carpetasOrg } = await admin
    .from("carpetas")
    .select("id, parent_id")
    .eq("org_id", orgId);
  const carpetas = carpetasOrg ?? [];
  const idsCarpetasOrg = new Set(carpetas.map((carpeta) => carpeta.id));
  if (carpetaIds.some((id) => !idsCarpetasOrg.has(id))) return { error: "Carpeta no valida." };

  const carpetasRaiz = filtrarRaicesSeleccionadas(carpetas, carpetaIds);
  const carpetasAEliminar = carpetasRaiz.flatMap((id) => obtenerSubarbolCarpetas(carpetas, id));
  const idsCarpetasAEliminar = [...new Set(carpetasAEliminar.map((carpeta) => carpeta.id))];

  const idsDocsAEliminar = new Set(docIds);
  if (idsCarpetasAEliminar.length > 0) {
    const { data: docsEnCarpetas } = await admin
      .from("org_documentos")
      .select("documento_id")
      .eq("org_id", orgId)
      .in("carpeta_id", idsCarpetasAEliminar);
    for (const item of docsEnCarpetas ?? []) idsDocsAEliminar.add(item.documento_id);
  }

  if (idsDocsAEliminar.size > 0) {
    const ids = [...idsDocsAEliminar];
    const { data: vinculos } = await admin
      .from("org_documentos")
      .select("documento_id")
      .eq("org_id", orgId)
      .in("documento_id", ids);
    if ((vinculos ?? []).length !== ids.length) return { error: "Documento no valido." };

    const { data: docs } = await admin
      .from("Documentos")
      .select("id, url")
      .in("id", ids);
    const rutas = (docs ?? [])
      .map((doc) => doc.url)
      .filter((url): url is string => typeof url === "string" && url.length > 0);
    if (rutas.length > 0) await admin.storage.from("almacen_documentos").remove(rutas);

    const { error } = await admin
      .from("Documentos")
      .delete()
      .in("id", ids);
    if (error) return { error: error.message };
  }

  const carpetasOrdenadas = carpetasAEliminar.sort(
    (a, b) => profundidadCarpeta(carpetas, b.id) - profundidadCarpeta(carpetas, a.id),
  );
  for (const carpeta of carpetasOrdenadas) {
    const { error } = await admin
      .from("carpetas")
      .delete()
      .eq("org_id", orgId)
      .eq("id", carpeta.id);
    if (error) return { error: error.message };
  }

  revalidatePath("/organizaciones");
  revalidatePath(`/organizaciones/${orgId}`);
  return { ok: "Elementos eliminados." };
}

export async function marcarNotificacionOrgLeida(notificacionId: string): Promise<void> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = crearClienteAdmin();
  await admin
    .from("org_notificaciones")
    .update({ leida: true })
    .eq("id", notificacionId)
    .eq("user_id", user.id);

  revalidatePath("/buzon");
}

async function usuarioEsAdminDeOtraOrganizacion(
  admin: ReturnType<typeof crearClienteAdmin>,
  userId: string,
  orgIdActual: string | null,
) {
  let query = admin
    .from("org_miembros")
    .select("org_id")
    .eq("user_id", userId)
    .eq("rol", "admin")
    .limit(1);

  if (orgIdActual) query = query.neq("org_id", orgIdActual);

  const { data } = await query;
  return (data?.length ?? 0) > 0;
}

async function usuarioEsAdminOrganizacion(
  admin: ReturnType<typeof crearClienteAdmin>,
  orgId: string,
  userId: string,
) {
  const { data } = await admin
    .from("org_miembros")
    .select("rol")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  return data?.rol === "admin";
}

async function usuarioEsMiembroOrganizacion(
  admin: ReturnType<typeof crearClienteAdmin>,
  orgId: string,
  userId: string,
) {
  const { data } = await admin
    .from("org_miembros")
    .select("user_id")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

function esTablaInvitacionesNoDisponible(error: { code?: string; message?: string }) {
  const mensaje = error.message?.toLowerCase() ?? "";
  return (
    error.code === "42P01" ||
    error.code === "PGRST106" ||
    error.code === "PGRST205" ||
    mensaje.includes("org_invitaciones") && (
      mensaje.includes("does not exist") ||
      mensaje.includes("not found") ||
      mensaje.includes("schema cache")
    )
  );
}

async function documentoCabeEnOrganizacion(
  admin: ReturnType<typeof crearClienteAdmin>,
  orgId: string,
  documentoId: string,
  tamanoDocumentoBytes: number,
) {
  const [{ data: vinculoExistente }, { data: orgDocs }] = await Promise.all([
    admin
      .from("org_documentos")
      .select("documento_id")
      .eq("org_id", orgId)
      .eq("documento_id", documentoId)
      .maybeSingle(),
    admin
      .from("org_documentos")
      .select("Documentos ( id, tamano_bytes )")
      .eq("org_id", orgId),
  ]);

  if (vinculoExistente) return true;

  const usado = (orgDocs ?? []).reduce((acc, item) => {
    const doc = Array.isArray(item.Documentos) ? item.Documentos[0] : item.Documentos;
    return acc + Number(doc?.tamano_bytes ?? 0);
  }, 0);

  return usado + tamanoDocumentoBytes <= LIMITE_ORG_BYTES;
}

async function documentoNombreExisteEnOrganizacion(
  admin: ReturnType<typeof crearClienteAdmin>,
  orgId: string,
  documentoId: string,
) {
  const { data: doc } = await admin
    .from("Documentos")
    .select("id, nombre")
    .eq("id", documentoId)
    .maybeSingle();
  if (!doc) return true;

  const { data: orgDocs } = await admin
    .from("org_documentos")
    .select("documento_id, Documentos ( id, nombre )")
    .eq("org_id", orgId);

  const nombre = String(doc.nombre).toLowerCase();
  return (orgDocs ?? []).some((item) => {
    if (item.documento_id === documentoId) return false;
    const existente = Array.isArray(item.Documentos) ? item.Documentos[0] : item.Documentos;
    return String(existente?.nombre ?? "").toLowerCase() === nombre;
  });
}

type CarpetaBasica = {
  id: string;
  nombre?: string;
  parent_id: string | null;
};

function obtenerSubarbolCarpetas(carpetas: CarpetaBasica[], raizId: string) {
  const resultado: CarpetaBasica[] = [];
  const pendientes = [raizId];
  const porPadre = new Map<string | null, CarpetaBasica[]>();
  for (const carpeta of carpetas) {
    const hermanas = porPadre.get(carpeta.parent_id) ?? [];
    hermanas.push(carpeta);
    porPadre.set(carpeta.parent_id, hermanas);
  }

  while (pendientes.length > 0) {
    const id = pendientes.shift()!;
    const carpeta = carpetas.find((item) => item.id === id);
    if (!carpeta) continue;
    resultado.push(carpeta);
    pendientes.push(...(porPadre.get(id) ?? []).map((item) => item.id));
  }

  return resultado;
}

function obtenerIdsFormData(datos: FormData, campo: string) {
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

function esDescendienteCarpeta(
  carpetas: CarpetaBasica[],
  posibleDescendienteId: string,
  posiblePadreId: string,
) {
  let actual = carpetas.find((carpeta) => carpeta.id === posibleDescendienteId);
  while (actual?.parent_id) {
    if (actual.parent_id === posiblePadreId) return true;
    actual = carpetas.find((carpeta) => carpeta.id === actual?.parent_id);
  }
  return false;
}

function ordenarCarpetasPorJerarquia(carpetas: CarpetaBasica[], raizId: string) {
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
