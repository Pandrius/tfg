import { NextRequest } from "next/server";

import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/servidor";

const FORMATOS_PERMITIDOS = new Set([
  "pdf",
  "docx",
  "txt",
  "xlsx",
  "csv",
  "pptx",
  "html",
  "json",
  "xml",
  "zip",
  "wav",
  "mp3",
  "mpeg",
  "m4a",
  "mp4",
  "aiff",
  "flac",
]);
const TAMANO_MAX = 10 * 1024 * 1024;
const FORMATOS_AUDIO = new Set(["wav", "mp3", "mpeg", "m4a", "mp4", "aiff", "flac"]);
const SERVICIO_IA_URL_DEFECTO = "https://pandrius-tfg-ia-servicio.hf.space";

/**
 * Convierte el nombre del archivo en un slug seguro para Supabase Storage
 * (sin tildes, espacios ni caracteres especiales). El nombre original se
 * conserva en la columna Documentos.nombre.
 */
const REGEX_DIACRITICOS = new RegExp("[\\u0300-\\u036f]", "g");
function slugificar(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(REGEX_DIACRITICOS, "") // quitar diacríticos
    .replace(/[^a-zA-Z0-9._-]+/g, "_") // sustituir lo no permitido por _
    .replace(/_+/g, "_") // colapsar guiones bajos repetidos
    .replace(/^_+|_+$/g, ""); // recortar _ al inicio/fin
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (datos: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(datos)}\n\n`));
      };

      let nombreActual = "<sin nombre>"; // para logs

      try {
        const supabase = await crearClienteServidor();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          emit({ fase: "error", error: "No autenticado" });
          return;
        }

        const formData = await request.formData();
        const archivo = formData.get("archivo") as File | null;
        const relativePath = String(formData.get("relative_path") ?? "").trim();
        const carpetaDestinoRaw = String(formData.get("carpeta_id") ?? "").trim();
        const carpetaDestinoId = carpetaDestinoRaw || null;

        if (!archivo) {
          emit({ fase: "error", error: "No se recibió archivo" });
          return;
        }
        nombreActual = archivo.name;
        if (archivo.size > TAMANO_MAX) {
          emit({ fase: "error", error: "El archivo supera los 10 MB" });
          return;
        }
        const extension = archivo.name.split(".").pop()?.toLowerCase() ?? "";
        if (!FORMATOS_PERMITIDOS.has(extension)) {
          emit({ fase: "error", error: `Formato no soportado: .${extension}` });
          return;
        }

        emit({ fase: "extrayendo" });

        const admin = crearClienteAdmin();
        const carpetaDestinoValida = carpetaDestinoId
          ? await obtenerCarpetaPersonalValida(admin, user.id, carpetaDestinoId)
          : null;
        if (carpetaDestinoId && !carpetaDestinoValida) {
          emit({ fase: "error", error: "Carpeta destino no valida." });
          return;
        }

        const { data: existente } = await admin
          .from("Documentos")
          .select("id")
          .eq("user_id", user.id)
          .eq("nombre", archivo.name)
          .maybeSingle();

        if (existente) {
          emit({ fase: "error", error: `Ya tienes un documento llamado "${archivo.name}".` });
          return;
        }

        let confidencialidad = 1;
        let probabilidad: number | null = null;
        let textoExtraido: string | null = null;
        let tipoArchivo: string = extension;
        const advertencias: string[] = [];

        const iaUrl = (process.env.SERVICIO_IA_URL ?? SERVICIO_IA_URL_DEFECTO).replace(/\/+$/, "");
        if (iaUrl) {
          emit({ fase: "clasificando" });
          try {
            const iaForm = new FormData();
            iaForm.append("archivo", archivo);
            const esAudio = FORMATOS_AUDIO.has(extension);
            const iaResp = await fetch(`${iaUrl}/procesar`, {
              method: "POST",
              body: iaForm,
              signal: AbortSignal.timeout(esAudio ? 300_000 : 180_000),
            });
            if (iaResp.ok) {
              const iaData = await iaResp.json();
              confidencialidad = iaData.confidencialidad ?? 1;
              probabilidad = iaData.probabilidad ?? null;
              textoExtraido = iaData.texto_extraido ?? null;
              tipoArchivo = iaData.tipo_archivo ?? extension;
              if (textoExtraido === null) {
                advertencias.push("El servicio IA no devolvio texto extraido.");
              }
              if (Array.isArray(iaData.advertencias)) {
                advertencias.push(
                  ...iaData.advertencias.filter((a: unknown): a is string => typeof a === "string"),
                );
              }
            } else {
              if (esAudio) {
                let detalle = "";
                try {
                  const errorData = await iaResp.json();
                  detalle =
                    typeof errorData?.detail === "string" ? ` ${errorData.detail}` : "";
                } catch {
                  // La respuesta de error no siempre es JSON.
                }
                emit({
                  fase: "error",
                  error:
                    `El servicio IA no puede transcribir este audio ahora mismo.${detalle}`.trim(),
                });
                return;
              }
              console.warn(
                `[/api/subir] servicio IA respondio ${iaResp.status} · archivo="${nombreActual}" · fail-safe a confidencial`,
              );
            }
          } catch (err) {
            if (FORMATOS_AUDIO.has(extension)) {
              const detalle = err instanceof Error ? ` (${err.message})` : "";
              emit({
                fase: "error",
                error:
                  `No se pudo conectar con el servicio IA para transcribir el audio${detalle}. Intentalo de nuevo cuando el servicio este disponible.`,
              });
              return;
            }
            console.warn(
              `[/api/subir] llamada al servicio IA fallo · archivo="${nombreActual}" · ${
                err instanceof Error ? err.message : String(err)
              } · fail-safe a confidencial`,
            );
          }
        }

        if (textoExtraido !== null && textoExtraido.trim().length === 0) {
          confidencialidad = 1;
          probabilidad = probabilidad ?? 1;
          if (advertencias.length === 0) {
            advertencias.push("No se pudo extraer texto. Clasificado como privado por seguridad.");
          }
        }

        emit({ fase: "guardando", advertencias });

        const carpetaId = relativePath
          ? await obtenerOCrearCarpetaPersonal(admin, user.id, relativePath, carpetaDestinoId)
          : carpetaDestinoId;
        const nombreSlug = slugificar(archivo.name) || `archivo.${extension}`;
        const rutaObjeto = `${user.id}/${Date.now()}_${nombreSlug}`;
        const buffer = await archivo.arrayBuffer();

        const { error: errorStorage } = await admin.storage
          .from("almacen_documentos")
          .upload(rutaObjeto, buffer, { contentType: archivo.type, upsert: false });

        if (errorStorage) {
          console.error(
            `[/api/subir] storage upload fallo · archivo="${nombreActual}" · ruta="${rutaObjeto}" · ${errorStorage.message}`,
          );
          emit({
            fase: "error",
            error: `Error al guardar en el almacén: ${errorStorage.message}`,
          });
          return;
        }

        const { data: doc, error: errorDb } = await admin
          .from("Documentos")
          .insert({
            nombre: archivo.name,
            url: rutaObjeto,
            user_id: user.id,
            confidencialidad,
            texto_extraido: textoExtraido,
            tipo_archivo: tipoArchivo,
            tamano_bytes: archivo.size,
            probabilidad,
            carpeta_id: carpetaId,
          })
          .select("id, nombre, confidencialidad")
          .single();

        if (errorDb) {
          console.error(
            `[/api/subir] insert BD fallo · archivo="${nombreActual}" · ${errorDb.message}`,
          );
          await admin.storage.from("almacen_documentos").remove([rutaObjeto]);
          emit({
            fase: "error",
            error: `Error al registrar el documento: ${errorDb.message}`,
          });
          return;
        }

        emit({ fase: "completado", doc, advertencias });
      } catch (err) {
        const mensaje = err instanceof Error ? err.message : String(err);
        console.error(
          `[/api/subir] excepcion interna · archivo="${nombreActual}" · ${mensaje}`,
        );
        emit({ fase: "error", error: `Error interno: ${mensaje}` });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}

async function obtenerOCrearCarpetaPersonal(
  admin: ReturnType<typeof crearClienteAdmin>,
  userId: string,
  relativePath: string,
  carpetaBaseId: string | null,
) {
  const partes = relativePath
    .split("/")
    .slice(0, -1)
    .map((parte) => parte.trim())
    .filter(Boolean);

  if (partes.length === 0) return null;

  let parentId: string | null = carpetaBaseId;
  for (const nombre of partes) {
    let query = admin
      .from("carpetas")
      .select("id")
      .eq("user_id", userId)
      .eq("nombre", nombre)
      .is("org_id", null);

    query = parentId ? query.eq("parent_id", parentId) : query.is("parent_id", null);
    const { data: existente } = await query.maybeSingle();
    if (existente?.id) {
      parentId = existente.id;
      continue;
    }

    const { data: nueva, error } = await admin
      .from("carpetas")
      .insert({
        nombre,
        user_id: userId,
        org_id: null,
        parent_id: parentId,
      })
      .select("id")
      .single();

    if (error || !nueva) {
      throw new Error(error?.message ?? "No se pudo crear la carpeta.");
    }
    parentId = nueva.id;
  }

  return parentId;
}

async function obtenerCarpetaPersonalValida(
  admin: ReturnType<typeof crearClienteAdmin>,
  userId: string,
  carpetaId: string,
) {
  const { data } = await admin
    .from("carpetas")
    .select("id")
    .eq("id", carpetaId)
    .eq("user_id", userId)
    .is("org_id", null)
    .maybeSingle();

  return data?.id ?? null;
}
