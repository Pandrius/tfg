"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { FiabilidadModelo } from "@/components/ui/FiabilidadModelo";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Tag } from "@/components/ui/Tag";
import { useToast } from "@/components/ui/Toast";
import {
  crearCarpeta,
  eliminarCarpeta,
  eliminarCarpetas,
  moverCarpetas,
  renombrarCarpeta,
} from "../carpetas/acciones";
import {
  subirCarpetaAOrganizacion,
  subirDocumentoAOrganizacion,
} from "../organizaciones/acciones";
import {
  actualizarConfidencialidad,
  eliminarDocumentos,
  moverDocumentosACarpeta,
  renombrarDocumento,
} from "./acciones";
import { ModalEliminar } from "./ModalEliminar";
import { ModalHacerPublico } from "./ModalHacerPublico";
import { ModalMoverACarpeta } from "./ModalMoverACarpeta";
import FormularioInvitacion, {
  type UsuarioInvitable,
} from "../documentos/[id]/FormularioInvitacion";

export interface DocumentoExplorador {
  id: string;
  nombre: string;
  tipo_archivo: string | null;
  confidencialidad: number | null;
  tamano_bytes: number | null;
  fecha: string;
  carpeta_id: string | null;
  probabilidad: number | null;
}

export interface CarpetaExplorador {
  id: string;
  nombre: string;
  parent_id: string | null;
}

export interface OrganizacionDestino {
  id: string;
  nombre: string;
}

export interface CarpetaOrganizacionDestino {
  id: string;
  nombre: string;
  parent_id: string | null;
  org_id: string;
}

interface Props {
  documentos: DocumentoExplorador[];
  carpetas: CarpetaExplorador[];
  carpetaActualId: string | null;
  usuariosInvitables: UsuarioInvitable[];
  organizaciones: OrganizacionDestino[];
  carpetasOrganizacion: CarpetaOrganizacionDestino[];
}

type Filtro = "todos" | "privados" | "publicos";
type MenuDoc = { id: string; x: number; y: number } | null;
type MenuCarpeta = { id: string; x: number; y: number } | null;
type ElementoArrastre =
  | { tipo: "doc"; id: string; nombre: string }
  | { tipo: "carpeta"; id: string; nombre: string };

const ETIQUETAS_FILTRO: { id: Filtro; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "privados", label: "Privados" },
  { id: "publicos", label: "Publicos" },
];

export function ExploradorDocumentos({
  documentos,
  carpetas,
  carpetaActualId,
  usuariosInvitables,
  organizaciones,
  carpetasOrganizacion,
}: Props) {
  const router = useRouter();
  const { mostrar } = useToast();
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [modalPublico, setModalPublico] = useState<DocumentoExplorador | null>(null);
  const [modalBorrar, setModalBorrar] = useState<DocumentoExplorador | null>(null);
  const [modalMover, setModalMover] = useState<DocumentoExplorador | null>(null);
  const [modalEnviar, setModalEnviar] = useState<DocumentoExplorador | null>(null);
  const [modalOrganizacion, setModalOrganizacion] = useState<DocumentoExplorador | null>(null);
  const [modalCarpetaOrganizacion, setModalCarpetaOrganizacion] =
    useState<CarpetaExplorador | null>(null);
  const [modalMoverSeleccion, setModalMoverSeleccion] = useState(false);
  const [modalEliminarSeleccion, setModalEliminarSeleccion] = useState(false);
  const [orgDestino, setOrgDestino] = useState("");
  const [carpetaOrgDestino, setCarpetaOrgDestino] = useState("");
  const [subiendoOrg, setSubiendoOrg] = useState(false);
  const [menuDoc, setMenuDoc] = useState<MenuDoc>(null);
  const [menuCarpeta, setMenuCarpeta] = useState<MenuCarpeta>(null);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [carpetasSeleccionadas, setCarpetasSeleccionadas] = useState<Set<string>>(new Set());
  const [descargando, setDescargando] = useState(false);
  const [creando, setCreando] = useState(false);
  const [nombreNueva, setNombreNueva] = useState("");
  const [guardandoCarpeta, setGuardandoCarpeta] = useState(false);
  const [carpetaEditando, setCarpetaEditando] = useState<CarpetaExplorador | null>(null);
  const [carpetaMover, setCarpetaMover] = useState<CarpetaExplorador | null>(null);
  const [nombreEditado, setNombreEditado] = useState("");
  const [documentoEditando, setDocumentoEditando] = useState<DocumentoExplorador | null>(null);
  const [nombreDocumentoEditado, setNombreDocumentoEditado] = useState("");
  const [carpetaDestinoMultiple, setCarpetaDestinoMultiple] = useState("");
  const [procesandoSeleccion, setProcesandoSeleccion] = useState(false);
  const [arrastrando, setArrastrando] = useState<ElementoArrastre | null>(null);
  const [carpetaSobre, setCarpetaSobre] = useState<string | null>(null);
  const [arrastreTactilActivo, setArrastreTactilActivo] = useState(false);
  const inputNuevaRef = useRef<HTMLInputElement>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bloquearClickTrasArrastreRef = useRef(false);

  const carpetasPorId = useMemo(
    () => new Map(carpetas.map((carpeta) => [carpeta.id, carpeta])),
    [carpetas],
  );
  const carpetaActual = carpetaActualId ? carpetasPorId.get(carpetaActualId) ?? null : null;

  const carpetasActuales = carpetas
    .filter((carpeta) => carpeta.parent_id === carpetaActualId)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  const documentosActuales = documentos.filter((doc) => (doc.carpeta_id ?? null) === carpetaActualId);
  const documentosFiltrados = documentosActuales.filter((doc) => {
    if (filtro === "privados") return (doc.confidencialidad ?? 1) === 1;
    if (filtro === "publicos") return (doc.confidencialidad ?? 1) === 0;
    return true;
  });
  const totalSeleccionados = seleccionados.size + carpetasSeleccionadas.size;
  const resumenEliminacion = obtenerResumenEliminacion(
    carpetas,
    documentos,
    carpetasSeleccionadas,
    seleccionados,
  );

  const rutasCarpetas = useMemo(() => {
    const cache = new Map<string, string>();
    const resolver = (carpeta: CarpetaExplorador): string => {
      const previa = cache.get(carpeta.id);
      if (previa) return previa;
      const padre = carpeta.parent_id ? carpetasPorId.get(carpeta.parent_id) : null;
      const ruta = padre ? `${resolver(padre)} / ${carpeta.nombre}` : carpeta.nombre;
      cache.set(carpeta.id, ruta);
      return ruta;
    };

    return carpetas.map((carpeta) => ({
      id: carpeta.id,
      nombre: resolver(carpeta),
    }));
  }, [carpetas, carpetasPorId]);
  const rutasCarpetasDestinoMasivo = rutasCarpetas.filter((ruta) => {
    if (carpetasSeleccionadas.size === 0) return true;
    if (carpetasSeleccionadas.has(ruta.id)) return false;
    return ![...carpetasSeleccionadas].some((id) => esDescendienteCarpeta(carpetas, ruta.id, id));
  });
  const rutasCarpetasDestinoCarpeta = rutasCarpetas.filter((ruta) => {
    if (!carpetaMover) return true;
    if (ruta.id === carpetaMover.id) return false;
    if (ruta.id === carpetaMover.parent_id) return false;
    return !esDescendienteCarpeta(carpetas, ruta.id, carpetaMover.id);
  });

  const migas = useMemo(() => {
    const items: CarpetaExplorador[] = [];
    let actual = carpetaActual;
    while (actual) {
      items.unshift(actual);
      actual = actual.parent_id ? carpetasPorId.get(actual.parent_id) ?? null : null;
    }
    return items;
  }, [carpetaActual, carpetasPorId]);

  const cambiarAPrivado = async (doc: DocumentoExplorador) => {
    const fd = new FormData();
    fd.append("doc_id", doc.id);
    fd.append("nueva", "1");
    const res = await actualizarConfidencialidad(undefined, fd);
    if (res && "ok" in res) mostrar({ variant: "ok", titulo: res.ok });
    else if (res && "error" in res) mostrar({ variant: "err", titulo: res.error });
  };

  const crearNuevaCarpeta = async (e: React.FormEvent) => {
    e.preventDefault();
    const nombre = nombreNueva.trim();
    if (!nombre) return;

    setGuardandoCarpeta(true);
    const fd = new FormData();
    fd.append("nombre", nombre);
    if (carpetaActualId) fd.append("parent_id", carpetaActualId);

    const res = await crearCarpeta(undefined, fd);
    setGuardandoCarpeta(false);
    if (res && "ok" in res) {
      mostrar({ variant: "ok", titulo: res.ok });
      setNombreNueva("");
      setCreando(false);
      router.refresh();
    } else if (res && "error" in res) {
      mostrar({ variant: "err", titulo: res.error });
    }
  };

  const abrirRenombrarCarpeta = (carpeta: CarpetaExplorador) => {
    setCarpetaEditando(carpeta);
    setNombreEditado(carpeta.nombre);
    setMenuCarpeta(null);
  };

  const guardarRenombreCarpeta = async () => {
    if (!carpetaEditando) return;
    const nombre = nombreEditado.trim();
    if (!nombre) return;

    setGuardandoCarpeta(true);
    const fd = new FormData();
    fd.append("carpeta_id", carpetaEditando.id);
    fd.append("nombre", nombre);
    const res = await renombrarCarpeta(undefined, fd);
    setGuardandoCarpeta(false);
    if (res && "ok" in res) {
      mostrar({ variant: "ok", titulo: res.ok });
      setCarpetaEditando(null);
      router.refresh();
    } else if (res && "error" in res) {
      mostrar({ variant: "err", titulo: res.error });
    }
  };

  const abrirMoverCarpeta = (carpeta: CarpetaExplorador) => {
    setCarpetaMover(carpeta);
    setCarpetaDestinoMultiple(carpeta.parent_id ?? "");
    setMenuCarpeta(null);
  };

  const moverCarpetaDesdeMenu = async () => {
    if (!carpetaMover) return;
    setProcesandoSeleccion(true);
    const fd = new FormData();
    fd.append("carpeta_ids", JSON.stringify([carpetaMover.id]));
    fd.append("carpeta_id", carpetaDestinoMultiple);
    const res = await moverCarpetas(undefined, fd);
    setProcesandoSeleccion(false);
    if (res && "ok" in res) {
      mostrar({ variant: "ok", titulo: res.ok });
      setCarpetaMover(null);
      router.refresh();
    } else if (res && "error" in res) {
      mostrar({ variant: "err", titulo: res.error });
    }
  };

  const abrirRenombrarDocumento = (doc: DocumentoExplorador) => {
    setDocumentoEditando(doc);
    setNombreDocumentoEditado(doc.nombre);
    setMenuDoc(null);
  };

  const guardarRenombreDocumento = async () => {
    if (!documentoEditando) return;
    const nombre = nombreDocumentoEditado.trim();
    if (!nombre) return;

    setGuardandoCarpeta(true);
    const fd = new FormData();
    fd.append("doc_id", documentoEditando.id);
    fd.append("nombre", nombre);
    const res = await renombrarDocumento(undefined, fd);
    setGuardandoCarpeta(false);
    if (res && "ok" in res) {
      mostrar({ variant: "ok", titulo: res.ok });
      setDocumentoEditando(null);
      router.refresh();
    } else if (res && "error" in res) {
      mostrar({ variant: "err", titulo: res.error });
    }
  };

  const contarContenidoCarpeta = (carpetaId: string) => {
    const ids = obtenerIdsCarpetasDescendientes(carpetas, carpetaId);
    return {
      carpetas: ids.size - 1,
      documentos: documentos.filter((doc) => doc.carpeta_id && ids.has(doc.carpeta_id)).length,
    };
  };

  const borrarCarpeta = async (carpeta: CarpetaExplorador) => {
    setMenuCarpeta(null);
    const contenido = contarContenidoCarpeta(carpeta.id);
    const detalle = [
      `${contenido.documentos} archivo${contenido.documentos === 1 ? "" : "s"}`,
      `${contenido.carpetas} subcarpeta${contenido.carpetas === 1 ? "" : "s"}`,
    ].join(" y ");
    if (
      !window.confirm(
        `¿Eliminar la carpeta "${carpeta.nombre}"?\n\nTodos los archivos que estan dentro se van a borrar para siempre (${detalle}).\n\n¿Seguro que quieres continuar?`,
      )
    ) {
      return;
    }
    const res = await eliminarCarpeta(carpeta.id);
    if (res && "error" in res) {
      mostrar({ variant: "err", titulo: res.error });
      return;
    }
    mostrar({ variant: "ok", titulo: "Carpeta eliminada." });
    if (carpetaActualId === carpeta.id) router.push("/mis-documentos");
    else router.refresh();
  };

  const moverElementoDentroDeCarpeta = async (
    elemento: ElementoArrastre,
    carpetaDestinoId: string,
  ) => {
    if (elemento.tipo === "carpeta" && elemento.id === carpetaDestinoId) {
      mostrar({ variant: "err", titulo: "No puedes mover una carpeta dentro de si misma." });
      return;
    }

    const fd = new FormData();
    if (elemento.tipo === "doc") {
      fd.append("doc_ids", JSON.stringify([elemento.id]));
      fd.append("carpeta_id", carpetaDestinoId);
      const res = await moverDocumentosACarpeta(undefined, fd);
      if (res && "ok" in res) {
        mostrar({ variant: "ok", titulo: res.ok });
        router.refresh();
      } else if (res && "error" in res) {
        mostrar({ variant: "err", titulo: res.error });
      }
      return;
    }

    fd.append("carpeta_ids", JSON.stringify([elemento.id]));
    fd.append("carpeta_id", carpetaDestinoId);
    const res = await moverCarpetas(undefined, fd);
    if (res && "ok" in res) {
      mostrar({ variant: "ok", titulo: res.ok });
      router.refresh();
    } else if (res && "error" in res) {
      mostrar({ variant: "err", titulo: res.error });
    }
  };

  const iniciarArrastre = (elemento: ElementoArrastre, e: React.DragEvent) => {
    setArrastrando(elemento);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/json", JSON.stringify(elemento));
    e.dataTransfer.setData("text/plain", elemento.nombre);
  };

  const soltarEnCarpeta = async (carpetaId: string, e?: React.DragEvent) => {
    e?.preventDefault();
    const elemento = arrastrando;
    setArrastrando(null);
    setCarpetaSobre(null);
    setArrastreTactilActivo(false);
    if (!elemento) return;
    await moverElementoDentroDeCarpeta(elemento, carpetaId);
  };

  const limpiarLongPress = () => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  };

  const prepararArrastreTactil = (
    elemento: ElementoArrastre,
    e: React.PointerEvent<HTMLElement>,
  ) => {
    if (e.pointerType !== "touch") return;
    const objetivo = e.target as HTMLElement;
    if (objetivo.closest("button, input, select, textarea")) return;
    limpiarLongPress();
    longPressRef.current = setTimeout(() => {
      setArrastrando(elemento);
      setArrastreTactilActivo(true);
    }, 420);
  };

  const actualizarArrastreTactil = (e: React.PointerEvent<HTMLElement>) => {
    if (!arrastreTactilActivo) return;
    e.preventDefault();
    const destino = document
      .elementFromPoint(e.clientX, e.clientY)
      ?.closest<HTMLElement>("[data-drop-folder-id]");
    setCarpetaSobre(destino?.dataset.dropFolderId ?? null);
  };

  const finalizarArrastreTactil = async (e: React.PointerEvent<HTMLElement>) => {
    limpiarLongPress();
    if (!arrastreTactilActivo) return;
    e.preventDefault();
    bloquearClickTrasArrastreRef.current = true;
    window.setTimeout(() => {
      bloquearClickTrasArrastreRef.current = false;
    }, 0);
    const destino = document
      .elementFromPoint(e.clientX, e.clientY)
      ?.closest<HTMLElement>("[data-drop-folder-id]");
    const destinoId = destino?.dataset.dropFolderId;
    setArrastreTactilActivo(false);
    setCarpetaSobre(null);
    const elemento = arrastrando;
    setArrastrando(null);
    if (elemento && destinoId) {
      await moverElementoDentroDeCarpeta(elemento, destinoId);
    }
  };

  const abrirMenu = (
    id: string,
    boton: HTMLButtonElement,
    tipo: "doc" | "carpeta",
  ) => {
    const rect = boton.getBoundingClientRect();
    const anchoMenu = 176;
    const menu = {
      id,
      x: Math.max(12, Math.min(rect.right - anchoMenu, window.innerWidth - anchoMenu - 12)),
      y: Math.min(rect.bottom + 6, window.innerHeight - 190),
    };
    if (tipo === "doc") {
      setMenuDoc(menuDoc?.id === id ? null : menu);
      setMenuCarpeta(null);
    } else {
      setMenuCarpeta(menuCarpeta?.id === id ? null : menu);
      setMenuDoc(null);
    }
  };

  const toggleSeleccion = (id: string) => {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSeleccionCarpeta = (id: string) => {
    setCarpetasSeleccionadas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleTodos = () => {
    const todosMarcados =
      documentosFiltrados.length + carpetasActuales.length > 0 &&
      seleccionados.size === documentosFiltrados.length &&
      carpetasSeleccionadas.size === carpetasActuales.length;
    if (todosMarcados) {
      setSeleccionados(new Set());
      setCarpetasSeleccionadas(new Set());
    } else {
      setSeleccionados(new Set(documentosFiltrados.map((doc) => doc.id)));
      setCarpetasSeleccionadas(new Set(carpetasActuales.map((carpeta) => carpeta.id)));
    }
  };

  const descargarSeleccionados = async () => {
    if (seleccionados.size === 0 || descargando) return;
    setDescargando(true);
    try {
      const res = await fetch("/api/descargar-zip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...seleccionados] }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        mostrar({ variant: "err", titulo: data.error ?? "Error al descargar." });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "documentos.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSeleccionados(new Set());
    } catch {
      mostrar({ variant: "err", titulo: "Error de red al descargar." });
    } finally {
      setDescargando(false);
    }
  };

  const moverSeleccionados = async () => {
    if (totalSeleccionados === 0) return;
    setProcesandoSeleccion(true);
    const resultados: Array<{ ok: string } | { error: string } | undefined> = [];
    if (seleccionados.size > 0) {
      const fd = new FormData();
      fd.append("doc_ids", JSON.stringify([...seleccionados]));
      fd.append("carpeta_id", carpetaDestinoMultiple);
      resultados.push(await moverDocumentosACarpeta(undefined, fd));
    }
    if (carpetasSeleccionadas.size > 0) {
      const fd = new FormData();
      fd.append("carpeta_ids", JSON.stringify([...carpetasSeleccionadas]));
      fd.append("carpeta_id", carpetaDestinoMultiple);
      resultados.push(await moverCarpetas(undefined, fd));
    }
    setProcesandoSeleccion(false);
    const error = resultados.find((res): res is { error: string } => Boolean(res && "error" in res));
    if (error) {
      mostrar({ variant: "err", titulo: error.error });
    } else {
      mostrar({ variant: "ok", titulo: `${totalSeleccionados} elemento${totalSeleccionados === 1 ? "" : "s"} movido${totalSeleccionados === 1 ? "" : "s"}.` });
      setSeleccionados(new Set());
      setCarpetasSeleccionadas(new Set());
      setModalMoverSeleccion(false);
      router.refresh();
    }
  };

  const eliminarSeleccionados = async () => {
    if (totalSeleccionados === 0) return;
    setProcesandoSeleccion(true);
    const resultados: Array<{ ok: string } | { error: string } | undefined> = [];
    if (seleccionados.size > 0) {
      const fd = new FormData();
      fd.append("doc_ids", JSON.stringify([...seleccionados]));
      resultados.push(await eliminarDocumentos(undefined, fd));
    }
    if (carpetasSeleccionadas.size > 0) {
      const fd = new FormData();
      fd.append("carpeta_ids", JSON.stringify([...carpetasSeleccionadas]));
      resultados.push(await eliminarCarpetas(undefined, fd));
    }
    setProcesandoSeleccion(false);
    const error = resultados.find((res): res is { error: string } => Boolean(res && "error" in res));
    if (error) {
      mostrar({ variant: "err", titulo: error.error });
    } else {
      mostrar({ variant: "ok", titulo: `${totalSeleccionados} elemento${totalSeleccionados === 1 ? "" : "s"} eliminado${totalSeleccionados === 1 ? "" : "s"}.` });
      setSeleccionados(new Set());
      setCarpetasSeleccionadas(new Set());
      setModalEliminarSeleccion(false);
      router.refresh();
    }
  };

  const abrirSubirOrganizacion = (doc: DocumentoExplorador) => {
    const primeraOrg = organizaciones[0]?.id ?? "";
    setOrgDestino(primeraOrg);
    setCarpetaOrgDestino("");
    setModalOrganizacion(doc);
    setMenuDoc(null);
  };

  const abrirSubirCarpetaOrganizacion = (carpeta: CarpetaExplorador) => {
    const primeraOrg = organizaciones[0]?.id ?? "";
    setOrgDestino(primeraOrg);
    setCarpetaOrgDestino("");
    setModalCarpetaOrganizacion(carpeta);
    setMenuCarpeta(null);
  };

  const subirAOrganizacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalOrganizacion || !orgDestino) return;
    setSubiendoOrg(true);
    const fd = new FormData();
    fd.append("documento_id", modalOrganizacion.id);
    fd.append("org_id", orgDestino);
    fd.append("carpeta_id", carpetaOrgDestino);
    const res = await subirDocumentoAOrganizacion(undefined, fd);
    setSubiendoOrg(false);
    if (res && "ok" in res) {
      mostrar({ variant: "ok", titulo: res.ok });
      setModalOrganizacion(null);
      router.refresh();
    } else if (res && "error" in res) {
      mostrar({ variant: "err", titulo: res.error });
    }
  };

  const subirCarpetaAOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalCarpetaOrganizacion || !orgDestino) return;
    setSubiendoOrg(true);
    const fd = new FormData();
    fd.append("carpeta_id", modalCarpetaOrganizacion.id);
    fd.append("org_id", orgDestino);
    fd.append("carpeta_destino_id", carpetaOrgDestino);
    const res = await subirCarpetaAOrganizacion(undefined, fd);
    setSubiendoOrg(false);
    if (res && "ok" in res) {
      mostrar({ variant: "ok", titulo: res.ok });
      setModalCarpetaOrganizacion(null);
      router.refresh();
    } else if (res && "error" in res) {
      mostrar({ variant: "err", titulo: res.error });
    }
  };

  const carpetasDestinoOrg = carpetasOrganizacion.filter(
    (carpeta) => carpeta.org_id === orgDestino,
  );
  const carpetasDestinoPorId = new Map(carpetasDestinoOrg.map((carpeta) => [carpeta.id, carpeta]));
  const nombreRutaCarpetaOrg = (carpeta: CarpetaOrganizacionDestino): string => {
    const padre = carpeta.parent_id ? carpetasDestinoPorId.get(carpeta.parent_id) : null;
    return padre ? `${nombreRutaCarpetaOrg(padre)} / ${carpeta.nombre}` : carpeta.nombre;
  };

  return (
    <div className="rounded-[14px] border border-rule bg-paper overflow-hidden">
      <div className="flex flex-col gap-4 px-5 py-4 border-b border-rule">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 text-[13px] text-mute">
              <button
                type="button"
                onClick={() => router.push("/mis-documentos")}
                className="hover:text-accent"
              >
                Mi unidad
              </button>
              {migas.map((carpeta) => (
                <span key={carpeta.id} className="inline-flex items-center gap-1.5">
                  <span>/</span>
                  <button
                    type="button"
                    onClick={() => router.push(`/mis-documentos?carpeta=${carpeta.id}`)}
                    className="max-w-[180px] truncate hover:text-accent"
                  >
                    {carpeta.nombre}
                  </button>
                </span>
              ))}
            </div>
            <h3 className="font-display font-medium text-lg tracking-[-0.01em] m-0 mt-1">
              {carpetaActual?.nombre ?? "Todos tus archivos"}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex bg-soft rounded-full p-[3px] gap-[2px]">
              {ETIQUETAS_FILTRO.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setFiltro(item.id);
                    setSeleccionados(new Set());
                    setCarpetasSeleccionadas(new Set());
                  }}
                  className={[
                    "px-3 py-[5px] rounded-full text-xs font-medium transition-colors",
                    filtro === item.id ? "bg-card text-ink" : "text-mute hover:text-ink",
                  ].join(" ")}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => {
                setCreando(true);
                window.setTimeout(() => inputNuevaRef.current?.focus(), 0);
              }}
            >
              + Carpeta
            </Button>
            {totalSeleccionados > 1 && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCarpetaDestinoMultiple(carpetaActualId ?? "");
                    setModalMoverSeleccion(true);
                  }}
                >
                  Mover todos
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => setModalEliminarSeleccion(true)}
                >
                  Eliminar ({totalSeleccionados})
                </Button>
              </>
            )}
          </div>
        </div>

        {creando && (
          <form onSubmit={crearNuevaCarpeta} className="flex flex-col gap-2 sm:flex-row">
            <Input
              ref={inputNuevaRef}
              value={nombreNueva}
              onChange={(e) => setNombreNueva(e.target.value)}
              placeholder={carpetaActualId ? "Nombre de la subcarpeta" : "Nombre de la carpeta"}
              maxLength={100}
              disabled={guardandoCarpeta}
              className="flex-1"
            />
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={guardandoCarpeta}
              disabled={!nombreNueva.trim()}
            >
              Crear
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => {
                setCreando(false);
                setNombreNueva("");
              }}
              disabled={guardandoCarpeta}
            >
              Cancelar
            </Button>
          </form>
        )}
      </div>

      <div className="divide-y divide-rule md:hidden">
        {carpetasActuales.map((carpeta) => (
          <div
            key={carpeta.id}
            data-drop-folder-id={carpeta.id}
            draggable
            onDragStart={(e) =>
              iniciarArrastre({ tipo: "carpeta", id: carpeta.id, nombre: carpeta.nombre }, e)
            }
            onDragEnd={() => {
              setArrastrando(null);
              setCarpetaSobre(null);
            }}
            onDragOver={(e) => {
              if (!arrastrando || arrastrando.id === carpeta.id) return;
              e.preventDefault();
              setCarpetaSobre(carpeta.id);
            }}
            onDragLeave={() => setCarpetaSobre(null)}
            onDrop={(e) => void soltarEnCarpeta(carpeta.id, e)}
            onPointerDown={(e) =>
              prepararArrastreTactil({ tipo: "carpeta", id: carpeta.id, nombre: carpeta.nombre }, e)
            }
            onPointerMove={actualizarArrastreTactil}
            onPointerUp={(e) => void finalizarArrastreTactil(e)}
            onPointerCancel={() => {
              limpiarLongPress();
              setArrastreTactilActivo(false);
              setArrastrando(null);
              setCarpetaSobre(null);
            }}
            className={[
              "px-4 py-3 transition-colors",
              carpetaSobre === carpeta.id ? "bg-accent-tint" : "",
              arrastrando?.id === carpeta.id ? "opacity-60" : "",
            ].join(" ")}
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={carpetasSeleccionadas.has(carpeta.id)}
                onChange={() => toggleSeleccionCarpeta(carpeta.id)}
                className="mt-3 w-4 h-4 cursor-pointer accent-[var(--accent)] shrink-0"
                aria-label={`Seleccionar carpeta ${carpeta.nombre}`}
              />
              <span className="w-9 h-9 rounded-[8px] border border-rule bg-card grid place-items-center text-accent font-semibold shrink-0">
                /
              </span>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/mis-documentos?carpeta=${carpeta.id}`}
                  onClick={(e) => {
                    if (bloquearClickTrasArrastreRef.current) e.preventDefault();
                  }}
                  className="font-medium hover:text-accent transition-colors break-words"
                >
                  {carpeta.nombre}
                </Link>
                <p className="text-mute font-mono text-[11px] mt-1">
                  {documentos.filter((doc) => doc.carpeta_id === carpeta.id).length} docs -{" "}
                  {carpetas.filter((item) => item.parent_id === carpeta.id).length} subcarp.
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => abrirMenu(carpeta.id, e.currentTarget, "carpeta")}
                className="text-mute hover:text-ink px-2 py-1 rounded-[6px] hover:bg-soft shrink-0"
                aria-label="Mas acciones"
              >
                ...
              </button>
              {menuCarpeta?.id === carpeta.id && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuCarpeta(null)} />
                  <div
                    className="fixed z-50 bg-card border border-rule rounded-[10px] shadow-[var(--shadow-2)] py-1 w-44"
                    style={{ left: menuCarpeta.x, top: menuCarpeta.y }}
                  >
                    <Link
                      href={`/mis-documentos?carpeta=${carpeta.id}`}
                      className="block px-3 py-1.5 text-[13px] hover:bg-soft"
                    >
                      Abrir
                    </Link>
                    <button
                      type="button"
                      onClick={() => abrirRenombrarCarpeta(carpeta)}
                      className="block w-full text-left px-3 py-1.5 text-[13px] hover:bg-soft"
                    >
                      Renombrar
                    </button>
                    <button
                      type="button"
                      onClick={() => abrirMoverCarpeta(carpeta)}
                      className="block w-full text-left px-3 py-1.5 text-[13px] hover:bg-soft"
                    >
                      Mover a carpeta
                    </button>
                    <button
                      type="button"
                      onClick={() => abrirSubirCarpetaOrganizacion(carpeta)}
                      className="block w-full text-left px-3 py-1.5 text-[13px] hover:bg-soft disabled:text-mute disabled:cursor-not-allowed"
                      disabled={organizaciones.length === 0}
                    >
                      Subir a organizacion
                    </button>
                    <button
                      type="button"
                      onClick={() => void borrarCarpeta(carpeta)}
                      className="block w-full text-left px-3 py-1.5 text-[13px] text-danger hover:bg-danger-tint"
                    >
                      Eliminar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}

        {documentosFiltrados.map((doc) => {
          const tipo = (doc.tipo_archivo ?? "").toUpperCase();
          const esPublico = (doc.confidencialidad ?? 1) === 0;
          const fecha = new Date(doc.fecha).toLocaleDateString("es-ES");
          const kb = doc.tamano_bytes ? Math.round(doc.tamano_bytes / 1024) : null;

          return (
            <div
              key={doc.id}
              draggable
              onDragStart={(e) => iniciarArrastre({ tipo: "doc", id: doc.id, nombre: doc.nombre }, e)}
              onDragEnd={() => {
                setArrastrando(null);
                setCarpetaSobre(null);
              }}
              onPointerDown={(e) =>
                prepararArrastreTactil({ tipo: "doc", id: doc.id, nombre: doc.nombre }, e)
              }
              onPointerMove={actualizarArrastreTactil}
              onPointerUp={(e) => void finalizarArrastreTactil(e)}
              onPointerCancel={() => {
                limpiarLongPress();
                setArrastreTactilActivo(false);
                setArrastrando(null);
                setCarpetaSobre(null);
              }}
              className={[
                "px-4 py-3 transition-opacity",
                arrastrando?.id === doc.id ? "opacity-60" : "",
              ].join(" ")}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={seleccionados.has(doc.id)}
                  onChange={() => toggleSeleccion(doc.id)}
                  className="mt-3 w-4 h-4 cursor-pointer accent-[var(--accent)] shrink-0"
                  aria-label={`Seleccionar ${doc.nombre}`}
                />
                <span className="w-9 h-11 rounded-[6px] border border-rule bg-card grid place-items-center font-display italic text-accent shrink-0">
                  {tipo.slice(0, 3) || "?"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2 min-w-0">
                    <Link
                      href={`/documentos/${doc.id}`}
                      onClick={(e) => {
                        if (bloquearClickTrasArrastreRef.current) e.preventDefault();
                      }}
                      className="min-w-0 flex-1 font-medium hover:text-accent transition-colors break-words"
                    >
                      {doc.nombre}
                    </Link>
                    <FiabilidadModelo
                      probabilidad={doc.probabilidad}
                      tipoArchivo={doc.tipo_archivo}
                      confidencialidad={doc.confidencialidad}
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {esPublico ? (
                      <button type="button" onClick={() => void cambiarAPrivado(doc)}>
                        <Tag variant="pub">publico</Tag>
                      </button>
                    ) : (
                      <button type="button" onClick={() => setModalPublico(doc)}>
                        <Tag variant="priv">privado</Tag>
                      </button>
                    )}
                    <span className="text-mute text-[11px] font-mono">
                      {kb !== null ? `${kb} KB` : "-"} - {fecha}
                    </span>
                  </div>
                  <p className="text-mute text-[11px] font-mono mt-1">
                    {carpetaActual ? carpetaActual.nombre : "Mi unidad"} - {tipo.toLowerCase() || "-"}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setModalEnviar(doc)}
                    className="text-mute hover:text-ink px-2 py-1 rounded-[6px] hover:bg-soft"
                    aria-label={`Enviar ${doc.nombre}`}
                    title="Enviar"
                  >
                    <IconoEnviar />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => abrirMenu(doc.id, e.currentTarget, "doc")}
                    className="text-mute hover:text-ink px-2 py-1 rounded-[6px] hover:bg-soft"
                    aria-label="Mas acciones"
                  >
                    ...
                  </button>
                  {menuDoc?.id === doc.id && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setMenuDoc(null)} />
                      <div
                        className="fixed z-50 bg-card border border-rule rounded-[10px] shadow-[var(--shadow-2)] py-1 w-44"
                        style={{ left: menuDoc.x, top: menuDoc.y }}
                      >
                        <Link
                          href={`/documentos/${doc.id}`}
                          className="block px-3 py-1.5 text-[13px] hover:bg-soft"
                          onClick={() => setMenuDoc(null)}
                        >
                          Ver detalle
                        </Link>
                        <button
                          type="button"
                          onClick={() => abrirRenombrarDocumento(doc)}
                          className="block w-full text-left px-3 py-1.5 text-[13px] hover:bg-soft"
                        >
                          Renombrar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setModalMover(doc);
                            setMenuDoc(null);
                          }}
                          className="block w-full text-left px-3 py-1.5 text-[13px] hover:bg-soft"
                        >
                          Mover a carpeta
                        </button>
                        <button
                          type="button"
                          onClick={() => abrirSubirOrganizacion(doc)}
                          className="block w-full text-left px-3 py-1.5 text-[13px] hover:bg-soft disabled:text-mute disabled:cursor-not-allowed"
                          disabled={organizaciones.length === 0}
                        >
                          Subir a organizacion
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setModalBorrar(doc);
                            setMenuDoc(null);
                          }}
                          className="block w-full text-left px-3 py-1.5 text-[13px] text-danger hover:bg-danger-tint"
                        >
                          Eliminar
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {carpetasActuales.length === 0 && documentosFiltrados.length === 0 && (
          <div className="px-5 py-10 text-center text-mute text-sm">
            Esta ubicacion esta vacia.
          </div>
        )}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <div className="min-w-[860px]">
          <div className="grid grid-cols-[28px_44px_1fr_120px_100px_120px_68px] items-center px-5 py-2.5 gap-3.5 bg-soft text-mute font-display italic text-xs border-b border-rule">
            <div className="flex items-center justify-center">
              <input
                type="checkbox"
                checked={
                  documentosFiltrados.length + carpetasActuales.length > 0 &&
                  seleccionados.size === documentosFiltrados.length &&
                  carpetasSeleccionadas.size === carpetasActuales.length
                }
                onChange={toggleTodos}
                className="w-4 h-4 cursor-pointer accent-[var(--accent)]"
                aria-label="Seleccionar todos"
              />
            </div>
            <div></div>
            <div>Nombre</div>
            <div>Estado</div>
            <div>Tamano</div>
            <div>Modificado</div>
            <div></div>
          </div>

          {carpetasActuales.map((carpeta) => (
            <div
              key={carpeta.id}
              data-drop-folder-id={carpeta.id}
              draggable
              onDragStart={(e) =>
                iniciarArrastre({ tipo: "carpeta", id: carpeta.id, nombre: carpeta.nombre }, e)
              }
              onDragEnd={() => {
                setArrastrando(null);
                setCarpetaSobre(null);
              }}
              onDragOver={(e) => {
                if (!arrastrando || arrastrando.id === carpeta.id) return;
                e.preventDefault();
                setCarpetaSobre(carpeta.id);
              }}
              onDragLeave={() => setCarpetaSobre(null)}
              onDrop={(e) => void soltarEnCarpeta(carpeta.id, e)}
              className={[
                "grid grid-cols-[28px_44px_1fr_120px_100px_120px_68px] items-center px-5 py-3 gap-3.5 border-b border-rule text-[13px] transition-colors",
                carpetaSobre === carpeta.id ? "bg-accent-tint" : "",
                arrastrando?.id === carpeta.id ? "opacity-60" : "",
              ].join(" ")}
            >
              <div className="flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={carpetasSeleccionadas.has(carpeta.id)}
                  onChange={() => toggleSeleccionCarpeta(carpeta.id)}
                  className="w-4 h-4 cursor-pointer accent-[var(--accent)]"
                  aria-label={`Seleccionar carpeta ${carpeta.nombre}`}
                />
              </div>
              <span className="w-9 h-9 rounded-[8px] border border-rule bg-card grid place-items-center text-accent font-semibold">
                /
              </span>
              <Link
                href={`/mis-documentos?carpeta=${carpeta.id}`}
                onClick={(e) => {
                  if (bloquearClickTrasArrastreRef.current) e.preventDefault();
                }}
                className="font-medium hover:text-accent transition-colors truncate"
              >
                {carpeta.nombre}
              </Link>
              <span className="text-mute text-[12px]">Carpeta</span>
              <span className="text-mute font-mono text-[12px]">
                {documentos.filter((doc) => doc.carpeta_id === carpeta.id).length} docs
              </span>
              <span className="text-mute font-mono text-[12px]">
                {carpetas.filter((item) => item.parent_id === carpeta.id).length} subcarp.
              </span>
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => abrirMenu(carpeta.id, e.currentTarget, "carpeta")}
                  className="text-mute hover:text-ink px-1.5 py-1 rounded-[6px] hover:bg-soft"
                  aria-label="Mas acciones"
                >
                  ...
                </button>
                {menuCarpeta?.id === carpeta.id && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenuCarpeta(null)} />
                    <div
                      className="fixed z-50 bg-card border border-rule rounded-[10px] shadow-[var(--shadow-2)] py-1 w-44"
                      style={{ left: menuCarpeta.x, top: menuCarpeta.y }}
                    >
                      <Link
                        href={`/mis-documentos?carpeta=${carpeta.id}`}
                        className="block px-3 py-1.5 text-[13px] hover:bg-soft"
                      >
                        Abrir
                      </Link>
                      <button
                        type="button"
                        onClick={() => abrirRenombrarCarpeta(carpeta)}
                        className="block w-full text-left px-3 py-1.5 text-[13px] hover:bg-soft"
                      >
                        Renombrar
                      </button>
                      <button
                        type="button"
                        onClick={() => abrirMoverCarpeta(carpeta)}
                        className="block w-full text-left px-3 py-1.5 text-[13px] hover:bg-soft"
                      >
                        Mover a carpeta
                      </button>
                      <button
                        type="button"
                        onClick={() => abrirSubirCarpetaOrganizacion(carpeta)}
                        className="block w-full text-left px-3 py-1.5 text-[13px] hover:bg-soft disabled:text-mute disabled:cursor-not-allowed"
                        disabled={organizaciones.length === 0}
                      >
                        Subir a organizacion
                      </button>
                      <button
                        type="button"
                        onClick={() => void borrarCarpeta(carpeta)}
                        className="block w-full text-left px-3 py-1.5 text-[13px] text-danger hover:bg-danger-tint"
                      >
                        Eliminar
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}

          {documentosFiltrados.map((doc) => {
            const tipo = (doc.tipo_archivo ?? "").toUpperCase();
            const esPublico = (doc.confidencialidad ?? 1) === 0;
            const fecha = new Date(doc.fecha).toLocaleDateString("es-ES");
            const kb = doc.tamano_bytes ? Math.round(doc.tamano_bytes / 1024) : null;

            return (
              <div
                key={doc.id}
                draggable
                onDragStart={(e) => iniciarArrastre({ tipo: "doc", id: doc.id, nombre: doc.nombre }, e)}
                onDragEnd={() => {
                  setArrastrando(null);
                  setCarpetaSobre(null);
                }}
                className={[
                  "grid grid-cols-[28px_44px_1fr_120px_100px_120px_68px] items-center px-5 py-3 gap-3.5 border-b border-rule last:border-b-0 text-[13px] transition-opacity",
                  arrastrando?.id === doc.id ? "opacity-60" : "",
                ].join(" ")}
              >
                <div className="flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={seleccionados.has(doc.id)}
                    onChange={() => toggleSeleccion(doc.id)}
                    className="w-4 h-4 cursor-pointer accent-[var(--accent)]"
                    aria-label={`Seleccionar ${doc.nombre}`}
                  />
                </div>
                <span className="w-9 h-11 rounded-[6px] border border-rule bg-card grid place-items-center font-display italic text-accent">
                  {tipo.slice(0, 3) || "?"}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <Link
                      href={`/documentos/${doc.id}`}
                      onClick={(e) => {
                        if (bloquearClickTrasArrastreRef.current) e.preventDefault();
                      }}
                      className="min-w-0 flex-1 font-medium hover:text-accent transition-colors truncate"
                    >
                      {doc.nombre}
                    </Link>
                    <FiabilidadModelo
                      probabilidad={doc.probabilidad}
                      tipoArchivo={doc.tipo_archivo}
                      confidencialidad={doc.confidencialidad}
                    />
                  </div>
                  <div className="text-mute text-[11px] font-mono mt-0.5">
                    {carpetaActual ? carpetaActual.nombre : "Mi unidad"} - {tipo.toLowerCase() || "-"}
                  </div>
                </div>
                <div>
                  {esPublico ? (
                    <button type="button" onClick={() => void cambiarAPrivado(doc)}>
                      <Tag variant="pub">publico</Tag>
                    </button>
                  ) : (
                    <button type="button" onClick={() => setModalPublico(doc)}>
                      <Tag variant="priv">privado</Tag>
                    </button>
                  )}
                </div>
                <div className="text-mute font-mono text-[12px]">
                  {kb !== null ? `${kb} KB` : "-"}
                </div>
                <div className="text-mute font-mono text-[12px]">{fecha}</div>
                <div className="relative flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => setModalEnviar(doc)}
                    className="text-mute hover:text-ink px-1.5 py-1 rounded-[6px] hover:bg-soft"
                    aria-label={`Enviar ${doc.nombre}`}
                    title="Enviar"
                  >
                    <IconoEnviar />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => abrirMenu(doc.id, e.currentTarget, "doc")}
                    className="text-mute hover:text-ink px-1.5 py-1 rounded-[6px] hover:bg-soft"
                    aria-label="Mas acciones"
                  >
                    ...
                  </button>
                  {menuDoc?.id === doc.id && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setMenuDoc(null)} />
                      <div
                        className="fixed z-50 bg-card border border-rule rounded-[10px] shadow-[var(--shadow-2)] py-1 w-44"
                        style={{ left: menuDoc.x, top: menuDoc.y }}
                      >
                        <Link
                          href={`/documentos/${doc.id}`}
                          className="block px-3 py-1.5 text-[13px] hover:bg-soft"
                          onClick={() => setMenuDoc(null)}
                        >
                          Ver detalle
                        </Link>
                        <button
                          type="button"
                          onClick={() => abrirRenombrarDocumento(doc)}
                          className="block w-full text-left px-3 py-1.5 text-[13px] hover:bg-soft"
                        >
                          Renombrar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setModalMover(doc);
                            setMenuDoc(null);
                          }}
                          className="block w-full text-left px-3 py-1.5 text-[13px] hover:bg-soft"
                        >
                          Mover a carpeta
                        </button>
                        <button
                          type="button"
                          onClick={() => abrirSubirOrganizacion(doc)}
                          className="block w-full text-left px-3 py-1.5 text-[13px] hover:bg-soft disabled:text-mute disabled:cursor-not-allowed"
                          disabled={organizaciones.length === 0}
                        >
                          Subir a organizacion
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setModalBorrar(doc);
                            setMenuDoc(null);
                          }}
                          className="block w-full text-left px-3 py-1.5 text-[13px] text-danger hover:bg-danger-tint"
                        >
                          Eliminar
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {carpetasActuales.length === 0 && documentosFiltrados.length === 0 && (
            <div className="px-5 py-10 text-center text-mute text-sm">
              Esta ubicacion esta vacia.
            </div>
          )}
        </div>
      </div>

      {carpetaEditando && (
        <Modal
          abierto={carpetaEditando !== null}
          onClose={() => setCarpetaEditando(null)}
          titulo="Renombrar carpeta"
          acciones={
            <>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCarpetaEditando(null)}
                disabled={guardandoCarpeta}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={guardarRenombreCarpeta}
                loading={guardandoCarpeta}
                disabled={!nombreEditado.trim()}
              >
                Guardar
              </Button>
            </>
          }
        >
          <Input
            value={nombreEditado}
            onChange={(e) => setNombreEditado(e.target.value)}
            maxLength={100}
            autoFocus
          />
        </Modal>
      )}

      {carpetaMover && (
        <Modal
          abierto={carpetaMover !== null}
          onClose={() => setCarpetaMover(null)}
          titulo="Mover carpeta"
          acciones={
            <>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCarpetaMover(null)}
                disabled={procesandoSeleccion}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={moverCarpetaDesdeMenu}
                loading={procesandoSeleccion}
              >
                Mover
              </Button>
            </>
          }
        >
          <p className="text-mute text-[13px] mb-4">
            Mover <span className="font-medium text-ink">{carpetaMover.nombre}</span> a:
          </p>
          <select
            value={carpetaDestinoMultiple}
            onChange={(e) => setCarpetaDestinoMultiple(e.target.value)}
            className="w-full rounded-[8px] border border-rule bg-card px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-accent-tint"
          >
            <option value="">Sin carpeta</option>
            {rutasCarpetasDestinoCarpeta.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </Modal>
      )}

      {documentoEditando && (
        <Modal
          abierto={documentoEditando !== null}
          onClose={() => setDocumentoEditando(null)}
          titulo="Renombrar documento"
          acciones={
            <>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDocumentoEditando(null)}
                disabled={guardandoCarpeta}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={guardarRenombreDocumento}
                loading={guardandoCarpeta}
                disabled={!nombreDocumentoEditado.trim()}
              >
                Guardar
              </Button>
            </>
          }
        >
          <Input
            value={nombreDocumentoEditado}
            onChange={(e) => setNombreDocumentoEditado(e.target.value)}
            maxLength={200}
            autoFocus
          />
        </Modal>
      )}

      {modalPublico && (
        <ModalHacerPublico
          abierto={modalPublico !== null}
          onClose={() => setModalPublico(null)}
          docId={modalPublico.id}
          nombre={modalPublico.nombre}
          tipo={modalPublico.tipo_archivo ?? ""}
        />
      )}
      {modalBorrar && (
        <ModalEliminar
          abierto={modalBorrar !== null}
          onClose={() => setModalBorrar(null)}
          docId={modalBorrar.id}
          nombre={modalBorrar.nombre}
        />
      )}
      {modalMover && (
        <ModalMoverACarpeta
          abierto={modalMover !== null}
          onClose={() => setModalMover(null)}
          docId={modalMover.id}
          nombre={modalMover.nombre}
          carpetas={rutasCarpetas}
        />
      )}
      {modalMoverSeleccion && (
        <Modal
          abierto={modalMoverSeleccion}
          onClose={() => setModalMoverSeleccion(false)}
          titulo="Mover todos"
          acciones={
            <>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setModalMoverSeleccion(false)}
                disabled={procesandoSeleccion}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={moverSeleccionados}
                loading={procesandoSeleccion}
              >
                Mover
              </Button>
            </>
          }
        >
          <p className="text-mute text-[13px] mb-4">
            Mover {totalSeleccionados} elemento{totalSeleccionados === 1 ? "" : "s"} a:
          </p>
          <select
            value={carpetaDestinoMultiple}
            onChange={(e) => setCarpetaDestinoMultiple(e.target.value)}
            className="w-full rounded-[8px] border border-rule bg-card px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-accent-tint"
          >
            <option value="">Sin carpeta</option>
            {rutasCarpetasDestinoMasivo.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </Modal>
      )}
      {modalEliminarSeleccion && (
        <Modal
          abierto={modalEliminarSeleccion}
          onClose={() => setModalEliminarSeleccion(false)}
          titulo="Eliminar seleccion"
          tono="danger"
          acciones={
            <>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setModalEliminarSeleccion(false)}
                disabled={procesandoSeleccion}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={eliminarSeleccionados}
                loading={procesandoSeleccion}
              >
                Si, eliminar
              </Button>
            </>
          }
        >
          <p className="text-mute text-[13px] leading-[1.55] m-0">
            Se eliminaran {totalSeleccionados} elemento{totalSeleccionados === 1 ? "" : "s"} seleccionado{totalSeleccionados === 1 ? "" : "s"}.
            Incluye {resumenEliminacion.carpetas} carpeta{resumenEliminacion.carpetas === 1 ? "" : "s"},
            {" "}{resumenEliminacion.subcarpetas} subcarpeta{resumenEliminacion.subcarpetas === 1 ? "" : "s"} y
            {" "}{resumenEliminacion.documentos} documento{resumenEliminacion.documentos === 1 ? "" : "s"}.
            Esta accion no se puede deshacer.
          </p>
        </Modal>
      )}
      {modalEnviar && (
        <Modal
          abierto={modalEnviar !== null}
          onClose={() => setModalEnviar(null)}
          titulo="Enviar documento"
          acciones={
            <Button type="button" variant="ghost" onClick={() => setModalEnviar(null)}>
              Cerrar
            </Button>
          }
        >
          <div className="flex flex-col gap-3">
            <p className="text-mute text-[13px]">
              Enviar <span className="font-medium text-ink">{modalEnviar.nombre}</span> a:
            </p>
            <FormularioInvitacion
              documentoId={modalEnviar.id}
              usuarios={usuariosInvitables}
              onEnviado={() => setModalEnviar(null)}
            />
          </div>
        </Modal>
      )}
      {modalOrganizacion && (
        <Modal
          abierto={modalOrganizacion !== null}
          onClose={() => setModalOrganizacion(null)}
          titulo="Subir a organizacion"
          acciones={
            <>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setModalOrganizacion(null)}
                disabled={subiendoOrg}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                form="form-subir-organizacion"
                variant="primary"
                loading={subiendoOrg}
                disabled={!orgDestino || subiendoOrg}
              >
                Subir
              </Button>
            </>
          }
        >
          <form id="form-subir-organizacion" onSubmit={subirAOrganizacion} className="flex flex-col gap-4">
            <p className="text-mute text-[13px]">
              Subir <span className="font-medium text-ink">{modalOrganizacion.nombre}</span> a:
            </p>
            <label className="flex flex-col gap-1.5 text-[13px]">
              <span className="text-mute">Organizacion</span>
              <select
                value={orgDestino}
                onChange={(e) => {
                  setOrgDestino(e.target.value);
                  setCarpetaOrgDestino("");
                }}
                className="rounded-[10px] border border-rule bg-card px-3 py-2 outline-none focus:ring-3 focus:ring-accent-tint"
              >
                {organizaciones.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-[13px]">
              <span className="text-mute">Carpeta destino</span>
              <select
                value={carpetaOrgDestino}
                onChange={(e) => setCarpetaOrgDestino(e.target.value)}
                className="rounded-[10px] border border-rule bg-card px-3 py-2 outline-none focus:ring-3 focus:ring-accent-tint"
              >
                <option value="">Sin carpeta</option>
                {carpetasDestinoOrg.map((carpeta) => (
                  <option key={carpeta.id} value={carpeta.id}>
                    {nombreRutaCarpetaOrg(carpeta)}
                  </option>
                ))}
              </select>
            </label>
          </form>
        </Modal>
      )}
      {modalCarpetaOrganizacion && (
        <Modal
          abierto={modalCarpetaOrganizacion !== null}
          onClose={() => setModalCarpetaOrganizacion(null)}
          titulo="Subir carpeta"
          acciones={
            <>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setModalCarpetaOrganizacion(null)}
                disabled={subiendoOrg}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                form="form-subir-carpeta-organizacion"
                variant="primary"
                loading={subiendoOrg}
                disabled={!orgDestino || subiendoOrg}
              >
                Subir
              </Button>
            </>
          }
        >
          <form
            id="form-subir-carpeta-organizacion"
            onSubmit={subirCarpetaAOrg}
            className="flex flex-col gap-4"
          >
            <p className="text-mute text-[13px]">
              Subir <span className="font-medium text-ink">{modalCarpetaOrganizacion.nombre}</span> a:
            </p>
            <label className="flex flex-col gap-1.5 text-[13px]">
              <span className="text-mute">Organizacion</span>
              <select
                value={orgDestino}
                onChange={(e) => {
                  setOrgDestino(e.target.value);
                  setCarpetaOrgDestino("");
                }}
                className="rounded-[10px] border border-rule bg-card px-3 py-2 outline-none focus:ring-3 focus:ring-accent-tint"
              >
                {organizaciones.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-[13px]">
              <span className="text-mute">Carpeta destino</span>
              <select
                value={carpetaOrgDestino}
                onChange={(e) => setCarpetaOrgDestino(e.target.value)}
                className="rounded-[10px] border border-rule bg-card px-3 py-2 outline-none focus:ring-3 focus:ring-accent-tint"
              >
                <option value="">Sin carpeta</option>
                {carpetasDestinoOrg.map((carpeta) => (
                  <option key={carpeta.id} value={carpeta.id}>
                    {nombreRutaCarpetaOrg(carpeta)}
                  </option>
                ))}
              </select>
            </label>
          </form>
        </Modal>
      )}

      {totalSeleccionados > 0 && (
        <div className="fixed bottom-4 left-4 right-4 sm:bottom-6 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-30 bg-card border border-rule rounded-[14px] sm:rounded-full shadow-[var(--shadow-2)] px-4 sm:px-5 py-3 flex items-center justify-between sm:justify-start gap-3 sm:gap-4">
          <span className="text-[13px] font-medium">
            {totalSeleccionados} seleccionado{totalSeleccionados !== 1 ? "s" : ""}
          </span>
          {seleccionados.size > 0 && (
            <button
              type="button"
              onClick={descargarSeleccionados}
              disabled={descargando}
              className="flex items-center gap-1.5 text-[13px] font-medium text-accent hover:text-accent-hover transition-colors disabled:opacity-50"
            >
              {descargando ? "Descargando..." : `Descargar (${seleccionados.size})`}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setSeleccionados(new Set());
              setCarpetasSeleccionadas(new Set());
            }}
            className="text-mute hover:text-ink text-[13px] font-mono transition-colors"
            aria-label="Deseleccionar todo"
          >
            x
          </button>
        </div>
      )}
    </div>
  );
}

function IconoEnviar() {
  return (
    <svg
      aria-hidden
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 2L11 13" />
      <path d="M22 2L15 22L11 13L2 9L22 2Z" />
    </svg>
  );
}

function obtenerIdsCarpetasDescendientes(
  carpetas: CarpetaExplorador[],
  raizId: string,
) {
  const ids = new Set<string>();
  const porPadre = new Map<string | null, CarpetaExplorador[]>();
  for (const carpeta of carpetas) {
    const hijas = porPadre.get(carpeta.parent_id) ?? [];
    hijas.push(carpeta);
    porPadre.set(carpeta.parent_id, hijas);
  }

  const visitar = (id: string) => {
    ids.add(id);
    for (const hija of porPadre.get(id) ?? []) visitar(hija.id);
  };

  visitar(raizId);
  return ids;
}

function obtenerResumenEliminacion(
  carpetas: CarpetaExplorador[],
  documentos: DocumentoExplorador[],
  carpetasSeleccionadas: Set<string>,
  documentosSeleccionados: Set<string>,
) {
  const idsCarpetasIncluidas = new Set<string>();
  for (const carpetaId of carpetasSeleccionadas) {
    for (const id of obtenerIdsCarpetasDescendientes(carpetas, carpetaId)) {
      idsCarpetasIncluidas.add(id);
    }
  }

  const documentosIncluidos = new Set(documentosSeleccionados);
  for (const doc of documentos) {
    if (doc.carpeta_id && idsCarpetasIncluidas.has(doc.carpeta_id)) {
      documentosIncluidos.add(doc.id);
    }
  }

  return {
    carpetas: carpetasSeleccionadas.size,
    subcarpetas: Math.max(0, idsCarpetasIncluidas.size - carpetasSeleccionadas.size),
    documentos: documentosIncluidos.size,
  };
}

function esDescendienteCarpeta(
  carpetas: CarpetaExplorador[],
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
