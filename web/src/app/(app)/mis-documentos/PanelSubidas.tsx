"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

import { DropZone } from "@/components/ui/DropZone";
import { PipelineRow, type EstadoArchivo } from "@/components/ui/PipelineRow";
import { useToast } from "@/components/ui/Toast";

const FORMATOS = [
  ".pdf",
  ".docx",
  ".txt",
  ".xlsx",
  ".csv",
  ".pptx",
  ".html",
  ".json",
  ".xml",
  ".zip",
  ".wav",
  ".mp3",
  ".mpeg",
  ".m4a",
  ".mp4",
  ".aiff",
  ".flac",
];
const FORMATOS_OK = new Set([
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
const TAMANO_MAX = 10 * 1024 * 1024; // 10 MB
const MAX_POR_TANDA = 10;
const CONCURRENCIA = 3;
const TIEMPO_FADE_LISTO = 5000;

interface Props {
  carpetaActualId?: string | null;
}

interface ArchivoEnCola {
  id: string;
  fichero: File;
  estado: EstadoArchivo;
  progreso: number;
  error?: string;
  saliendo?: boolean;
  /** Controller para abortar el fetch SSE si hace falta. */
  abort?: AbortController;
}

/**
 * Panel que orquesta una cola de subidas multi-archivo con concurrencia 3.
 * Cada archivo abre su propia conexión SSE a /api/subir.
 */
export function PanelSubidas({ carpetaActualId = null }: Props) {
  const router = useRouter();
  const { mostrar } = useToast();
  const [archivos, setArchivos] = useState<ArchivoEnCola[]>([]);
  /** IDs actualmente procesando (no en cola, no listos, no error). */
  const activos = useRef(new Set<string>());
  /** Cola imperativa para evitar dobles despachos por reejecuciones de React en dev. */
  const pendientes = useRef<string[]>([]);
  const ficheros = useRef(new Map<string, File>());
  const inputCarpetaRef = useRef<HTMLInputElement>(null);
  const subirArchivoRef = useRef<(id: string, fichero: File) => void>(() => {});

  /** Despacha tantos archivos de la cola como permita la concurrencia. */
  const despachar = useCallback(() => {
    const proximos: Array<{ id: string; fichero: File }> = [];

    while (activos.current.size < CONCURRENCIA && pendientes.current.length > 0) {
      const id = pendientes.current.shift();
      if (!id || activos.current.has(id)) continue;

      const fichero = ficheros.current.get(id);
      if (!fichero) continue;

      activos.current.add(id);
      proximos.push({ id, fichero });
    }

    if (proximos.length === 0) return;

    const ids = new Set(proximos.map((p) => p.id));
    setArchivos((actual) =>
      actual.map((a) =>
        ids.has(a.id) ? { ...a, estado: "subido", progreso: 0 } : a,
      ),
    );

    for (const p of proximos) {
      queueMicrotask(() => subirArchivoRef.current(p.id, p.fichero));
    }
  }, []);

  /** Actualiza un archivo por ID. */
  const actualizar = useCallback(
    (id: string, cambios: Partial<ArchivoEnCola>) => {
      setArchivos((actual) =>
        actual.map((a) => (a.id === id ? { ...a, ...cambios } : a)),
      );
    },
    [],
  );

  /** Mapea un evento SSE del server al estado del cliente. */
  const procesarEvento = useCallback(
    (id: string, fase: string, evento: Record<string, unknown>) => {
      if (fase === "extrayendo") {
        actualizar(id, { estado: "texto", progreso: 33 });
      } else if (fase === "clasificando") {
        actualizar(id, { estado: "analizando", progreso: 66 });
      } else if (fase === "guardando") {
        actualizar(id, { estado: "guardado", progreso: 99 });
      } else if (fase === "completado") {
        const advertencias = Array.isArray(evento.advertencias)
          ? evento.advertencias.filter((a): a is string => typeof a === "string")
          : [];
        const doc =
          evento.doc && typeof evento.doc === "object"
            ? (evento.doc as {
                nombre?: unknown;
                confidencialidad?: unknown;
              })
            : null;
        const nombreDoc =
          typeof doc?.nombre === "string" && doc.nombre.trim()
            ? doc.nombre
            : "Archivo";
        const confidencialidad =
          typeof doc?.confidencialidad === "number" ? doc.confidencialidad : 1;
        const etiqueta = confidencialidad === 0 ? "publico" : "privado";
        actualizar(id, {
          estado: "listo",
          progreso: 100,
          abort: undefined,
        });
        activos.current.delete(id);
        ficheros.current.delete(id);
        if (advertencias.length > 0) {
          mostrar({
            variant: "warn",
            titulo: "Documento guardado como privado.",
            detalle: advertencias[0],
          });
        } else {
          mostrar({
            variant: confidencialidad === 0 ? "ok" : "warn",
            titulo: "Clasificacion completada.",
            detalle: `${nombreDoc} se ha clasificado como ${etiqueta}.`,
          });
        }
        router.refresh();
        despachar();
        // Fade-out a los 5 s.
        setTimeout(() => {
          actualizar(id, { saliendo: true });
          setTimeout(() => {
            setArchivos((actual) => actual.filter((a) => a.id !== id));
          }, 500);
        }, TIEMPO_FADE_LISTO);
      } else if (fase === "error") {
        actualizar(id, {
          estado: "error",
          error: String(evento.error ?? "Error al subir el archivo."),
          abort: undefined,
        });
        activos.current.delete(id);
        despachar();
      }
    },
    [actualizar, despachar, mostrar, router],
  );

  /** Sube un archivo (abre SSE, parsea eventos, actualiza estado). */
  const subirArchivo = useCallback(
    async (id: string, fichero: File) => {
      const abort = new AbortController();
      actualizar(id, { abort });

      const body = new FormData();
      body.append("archivo", fichero);
      const rutaRelativa = obtenerRutaRelativa(fichero);
      if (rutaRelativa) body.append("relative_path", rutaRelativa);
      if (carpetaActualId) body.append("carpeta_id", carpetaActualId);

      let resp: Response;
      try {
        resp = await fetch("/api/subir", {
          method: "POST",
          body,
          signal: abort.signal,
        });
      } catch {
        activos.current.delete(id);
        actualizar(id, {
          estado: "error",
          error: "No se pudo conectar con el servidor.",
          abort: undefined,
        });
        despachar();
        return;
      }

      if (!resp.body) {
        activos.current.delete(id);
        actualizar(id, {
          estado: "error",
          error: "Respuesta inesperada del servidor.",
          abort: undefined,
        });
        despachar();
        return;
      }

      const reader = resp.body
        .pipeThrough(new TextDecoderStream())
        .getReader();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += value;
          const bloques = buffer.split("\n\n");
          buffer = bloques.pop() ?? "";

          for (const bloque of bloques) {
            const linea = bloque.trim();
            if (!linea.startsWith("data:")) continue;
            let evento: Record<string, unknown>;
            try {
              evento = JSON.parse(linea.slice(5).trim());
            } catch {
              continue;
            }
            const fase = String(evento.fase ?? "");
            procesarEvento(id, fase, evento);
          }
        }
      } catch {
        actualizar(id, {
          estado: "error",
          error: "Error al procesar la respuesta del servidor.",
          abort: undefined,
        });
        activos.current.delete(id);
        despachar();
      }
    },
    [actualizar, carpetaActualId, despachar, procesarEvento],
  );

  useEffect(() => {
    subirArchivoRef.current = subirArchivo;
  }, [subirArchivo]);

  useEffect(() => {
    inputCarpetaRef.current?.setAttribute("webkitdirectory", "");
    inputCarpetaRef.current?.setAttribute("directory", "");
  }, []);

  /** Acepta un drop o picker. Valida formato + tamaño + límite, encola. */
  const aceptarArchivos = (lista: File[]) => {
    const aceptados: ArchivoEnCola[] = [];
    let descartadosFormato = 0;
    let descartadosTamano = 0;
    let descartadosLimite = 0;

    for (const f of lista) {
      if (aceptados.length >= MAX_POR_TANDA) {
        descartadosLimite++;
        continue;
      }
      if (esEntradaNoSubible(f)) {
        continue;
      }
      const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
      if (!FORMATOS_OK.has(ext)) {
        descartadosFormato++;
        continue;
      }
      if (f.size > TAMANO_MAX) {
        descartadosTamano++;
        continue;
      }
      const id = crypto.randomUUID();
      aceptados.push({
        id,
        fichero: f,
        estado: "en_cola",
        progreso: 0,
      });
      ficheros.current.set(id, f);
      pendientes.current.push(id);
    }

    if (descartadosFormato > 0) {
      mostrar({
        variant: "err",
        titulo: `${descartadosFormato} archivo${descartadosFormato === 1 ? "" : "s"} con formato no soportado.`,
        detalle: "Formatos: PDF, DOCX, TXT, XLSX, CSV, PPTX, HTML, JSON, XML, ZIP, WAV, MP3, MPEG, M4A, MP4, AIFF o FLAC.",
      });
    }
    if (descartadosTamano > 0) {
      mostrar({
        variant: "err",
        titulo: `${descartadosTamano} archivo${descartadosTamano === 1 ? "" : "s"} más grande${descartadosTamano === 1 ? "" : "s"} que 10 MB.`,
      });
    }
    if (descartadosLimite > 0) {
      mostrar({
        variant: "warn",
        titulo: `Solo los primeros ${MAX_POR_TANDA} archivos se procesarán.`,
        detalle: `${descartadosLimite} descartado${descartadosLimite === 1 ? "" : "s"}.`,
      });
    }

    if (aceptados.length === 0) return;

    setArchivos((actual) => [...actual, ...aceptados]);
    despachar();
  };

  const cancelar = (id: string) => {
    pendientes.current = pendientes.current.filter((pendiente) => pendiente !== id);
    ficheros.current.delete(id);
    setArchivos((actual) => actual.filter((a) => a.id !== id));
  };

  const quitar = (id: string) => {
    pendientes.current = pendientes.current.filter((pendiente) => pendiente !== id);
    ficheros.current.delete(id);
    setArchivos((actual) => actual.filter((a) => a.id !== id));
  };

  const reintentar = (id: string) => {
    if (!pendientes.current.includes(id) && !activos.current.has(id)) {
      pendientes.current.push(id);
    }
    actualizar(id, {
      estado: "en_cola",
      progreso: 0,
      error: undefined,
    });
    despachar();
  };

  const enCurso = archivos.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <DropZone
        onArchivos={aceptarArchivos}
        accept={FORMATOS.join(",")}
        multiple
      >
        <div className="grid place-items-center w-12 h-12 mx-auto rounded-[14px] bg-accent-tint text-accent font-display italic font-semibold text-[22px] mb-3">
          ↓
        </div>
        <div className="font-display text-lg font-medium tracking-[-0.01em]">
          Arrastra archivos <em className="italic text-accent">aquí</em>
        </div>
        <div className="text-mute text-[13px]">
          o haz click para seleccionarlos. Puedes subir varios a la vez.
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            inputCarpetaRef.current?.click();
          }}
          className="mt-3 inline-flex items-center justify-center rounded-full border border-rule px-3 py-1.5 text-xs font-medium text-ink hover:bg-soft transition-colors"
        >
          Subir carpeta
        </button>
        <input
          ref={inputCarpetaRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            const lista = Array.from(e.target.files ?? []);
            e.target.value = "";
            aceptarArchivos(lista);
          }}
        />
        <div className="font-mono text-[10px] text-mute uppercase tracking-[0.08em] mt-3.5">
          PDF · DOCX · TXT · XLSX · CSV · PPTX · HTML · JSON · XML · ZIP · audio WAV/MP3/MPEG/M4A/MP4/AIFF/FLAC · hasta 10 MB · máx {MAX_POR_TANDA} a la vez
        </div>
      </DropZone>

      {enCurso && (
        <div className="rounded-[14px] border border-rule bg-paper p-5">
          <h3 className="font-display font-medium text-lg tracking-[-0.01em] m-0">
            Subidas <em className="italic text-accent">en curso</em>
          </h3>
          <div className="text-[12px] text-mute font-display italic mt-1 mb-3.5">
            {archivos.length} archivo{archivos.length === 1 ? "" : "s"} en este momento
          </div>
          <div className="flex flex-col">
            {archivos.map((a) => (
              <PipelineRow
                key={a.id}
                tipo={a.fichero.name.split(".").pop() ?? ""}
                nombre={a.fichero.name}
                estado={a.estado}
                progreso={a.progreso}
                error={a.error}
                saliendo={a.saliendo}
                onCancelar={a.estado === "en_cola" ? () => cancelar(a.id) : undefined}
                onReintentar={a.estado === "error" ? () => reintentar(a.id) : undefined}
                onQuitar={a.estado === "error" ? () => quitar(a.id) : undefined}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function obtenerRutaRelativa(fichero: File) {
  const ruta = (fichero as File & { webkitRelativePath?: string }).webkitRelativePath;
  return ruta && ruta !== fichero.name ? ruta : "";
}

function esEntradaNoSubible(fichero: File) {
  const nombre = fichero.name.trim();
  if (!nombre) return true;
  if (nombre === ".DS_Store" || nombre === "Thumbs.db") return true;
  return fichero.size === 0 && !nombre.includes(".");
}
