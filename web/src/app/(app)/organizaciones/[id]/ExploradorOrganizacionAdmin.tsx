"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { FiabilidadModelo } from "@/components/ui/FiabilidadModelo";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import {
  eliminarElementosOrganizacion,
  moverElementosOrganizacion,
  renombrarElementoOrganizacion,
} from "../acciones";

export type CarpetaOrgAdmin = {
  id: string;
  nombre: string;
  parent_id: string | null;
};

export type DocumentoOrgAdmin = {
  id: string;
  nombre: string;
  tipo_archivo: string | null;
  confidencialidad: number | null;
  probabilidad: number | null;
  tamano_bytes: number | null;
  carpeta_id: string | null;
};

type ElementoArrastre =
  | { tipo: "doc"; id: string; nombre: string }
  | { tipo: "carpeta"; id: string; nombre: string };
type MenuElemento = { tipo: "doc" | "carpeta"; id: string; x: number; y: number } | null;

interface Props {
  orgId: string;
  esAdmin: boolean;
  carpetas: CarpetaOrgAdmin[];
  documentos: DocumentoOrgAdmin[];
  carpetaActualId?: string | null;
}

export function ExploradorOrganizacionAdmin({
  orgId,
  esAdmin,
  carpetas,
  documentos,
  carpetaActualId = null,
}: Props) {
  const router = useRouter();
  const { mostrar } = useToast();
  const [docsSeleccionados, setDocsSeleccionados] = useState<Set<string>>(new Set());
  const [carpetasSeleccionadas, setCarpetasSeleccionadas] = useState<Set<string>>(new Set());
  const [modalMover, setModalMover] = useState(false);
  const [modalEliminar, setModalEliminar] = useState(false);
  const [modalMoverElemento, setModalMoverElemento] = useState<ElementoArrastre | null>(null);
  const [modalRenombrarElemento, setModalRenombrarElemento] = useState<ElementoArrastre | null>(null);
  const [destinoId, setDestinoId] = useState("");
  const [nombreEditado, setNombreEditado] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [menuElemento, setMenuElemento] = useState<MenuElemento>(null);
  const [arrastrando, setArrastrando] = useState<ElementoArrastre | null>(null);
  const [carpetaSobre, setCarpetaSobre] = useState<string | null>(null);
  const [arrastreTactilActivo, setArrastreTactilActivo] = useState(false);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const arrastrandoRef = useRef<ElementoArrastre | null>(null);
  const bloquearClickTrasArrastreRef = useRef(false);

  const carpetasActuales = carpetas
    .filter((carpeta) => carpeta.parent_id === carpetaActualId)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  const docsActuales = documentos
    .filter((doc) => doc.carpeta_id === carpetaActualId)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  const totalSeleccionados = docsSeleccionados.size + carpetasSeleccionadas.size;
  const resumen = obtenerResumenEliminacion(
    carpetas,
    documentos,
    carpetasSeleccionadas,
    docsSeleccionados,
  );
  const rutasCarpetas = useMemo(() => obtenerRutasCarpetas(carpetas), [carpetas]);
  const destinos = rutasCarpetas.filter((ruta) => {
    if (carpetasSeleccionadas.size === 0) return true;
    if (carpetasSeleccionadas.has(ruta.id)) return false;
    return ![...carpetasSeleccionadas].some((id) => esDescendienteCarpeta(carpetas, ruta.id, id));
  });
  const destinosElemento = rutasCarpetas.filter((ruta) => {
    if (modalMoverElemento?.tipo !== "carpeta") return true;
    if (ruta.id === modalMoverElemento.id) return false;
    return !esDescendienteCarpeta(carpetas, ruta.id, modalMoverElemento.id);
  }).filter((ruta) => {
    if (!modalMoverElemento) return true;
    const parentId =
      modalMoverElemento.tipo === "carpeta"
        ? carpetas.find((carpeta) => carpeta.id === modalMoverElemento.id)?.parent_id ?? null
        : documentos.find((doc) => doc.id === modalMoverElemento.id)?.carpeta_id ?? null;
    return ruta.id !== parentId;
  });

  const toggleDoc = (id: string) => {
    setDocsSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleCarpeta = (id: string) => {
    setCarpetasSeleccionadas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const limpiarSeleccion = () => {
    setDocsSeleccionados(new Set());
    setCarpetasSeleccionadas(new Set());
  };

  const abrirMenu = (
    elemento: ElementoArrastre,
    boton: HTMLButtonElement,
  ) => {
    const rect = boton.getBoundingClientRect();
    const anchoMenu = 190;
    setMenuElemento({
      tipo: elemento.tipo,
      id: elemento.id,
      x: Math.max(12, Math.min(rect.right - anchoMenu, window.innerWidth - anchoMenu - 12)),
      y: Math.min(rect.bottom + 6, window.innerHeight - 210),
    });
  };

  const moverSeleccion = async () => {
    setProcesando(true);
    const fd = new FormData();
    fd.append("org_id", orgId);
    fd.append("doc_ids", JSON.stringify([...docsSeleccionados]));
    fd.append("carpeta_ids", JSON.stringify([...carpetasSeleccionadas]));
    fd.append("carpeta_id", destinoId);
    const res = await moverElementosOrganizacion(undefined, fd);
    setProcesando(false);
    if (res && "ok" in res) {
      mostrar({ variant: "ok", titulo: res.ok });
      limpiarSeleccion();
      setModalMover(false);
      router.refresh();
    } else if (res && "error" in res) {
      mostrar({ variant: "err", titulo: res.error });
    }
  };

  const eliminarSeleccion = async () => {
    if (!esAdmin) return;
    setProcesando(true);
    const fd = new FormData();
    fd.append("org_id", orgId);
    fd.append("doc_ids", JSON.stringify([...docsSeleccionados]));
    fd.append("carpeta_ids", JSON.stringify([...carpetasSeleccionadas]));
    const res = await eliminarElementosOrganizacion(undefined, fd);
    setProcesando(false);
    if (res && "ok" in res) {
      mostrar({ variant: "ok", titulo: res.ok });
      limpiarSeleccion();
      setModalEliminar(false);
      router.refresh();
    } else if (res && "error" in res) {
      mostrar({ variant: "err", titulo: res.error });
    }
  };

  const moverElementoDesdeMenu = async () => {
    if (!modalMoverElemento) return;
    setProcesando(true);
    const fd = new FormData();
    fd.append("org_id", orgId);
    fd.append("doc_ids", JSON.stringify(modalMoverElemento.tipo === "doc" ? [modalMoverElemento.id] : []));
    fd.append("carpeta_ids", JSON.stringify(modalMoverElemento.tipo === "carpeta" ? [modalMoverElemento.id] : []));
    fd.append("carpeta_id", destinoId);
    const res = await moverElementosOrganizacion(undefined, fd);
    setProcesando(false);
    if (res && "ok" in res) {
      mostrar({ variant: "ok", titulo: res.ok });
      setModalMoverElemento(null);
      router.refresh();
    } else if (res && "error" in res) {
      mostrar({ variant: "err", titulo: res.error });
    }
  };

  const guardarRenombreElemento = async () => {
    if (!modalRenombrarElemento) return;
    const nombre = nombreEditado.trim();
    if (!nombre) return;
    setProcesando(true);
    const fd = new FormData();
    fd.append("org_id", orgId);
    fd.append("tipo", modalRenombrarElemento.tipo);
    fd.append("id", modalRenombrarElemento.id);
    fd.append("nombre", nombre);
    const res = await renombrarElementoOrganizacion(undefined, fd);
    setProcesando(false);
    if (res && "ok" in res) {
      mostrar({ variant: "ok", titulo: res.ok });
      setModalRenombrarElemento(null);
      router.refresh();
    } else if (res && "error" in res) {
      mostrar({ variant: "err", titulo: res.error });
    }
  };

  const eliminarElementoDesdeMenu = async (elemento: ElementoArrastre) => {
    if (!esAdmin) return;
    const ok = window.confirm(`Eliminar "${elemento.nombre}"? Esta accion no se puede deshacer.`);
    if (!ok) return;
    setMenuElemento(null);
    setProcesando(true);
    const fd = new FormData();
    fd.append("org_id", orgId);
    fd.append("doc_ids", JSON.stringify(elemento.tipo === "doc" ? [elemento.id] : []));
    fd.append("carpeta_ids", JSON.stringify(elemento.tipo === "carpeta" ? [elemento.id] : []));
    const res = await eliminarElementosOrganizacion(undefined, fd);
    setProcesando(false);
    if (res && "ok" in res) {
      mostrar({ variant: "ok", titulo: res.ok });
      router.refresh();
    } else if (res && "error" in res) {
      mostrar({ variant: "err", titulo: res.error });
    }
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
    fd.append("org_id", orgId);
    fd.append("doc_ids", JSON.stringify(elemento.tipo === "doc" ? [elemento.id] : []));
    fd.append("carpeta_ids", JSON.stringify(elemento.tipo === "carpeta" ? [elemento.id] : []));
    fd.append("carpeta_id", carpetaDestinoId);
    const res = await moverElementosOrganizacion(undefined, fd);
    if (res && "ok" in res) {
      mostrar({ variant: "ok", titulo: res.ok });
      router.refresh();
    } else if (res && "error" in res) {
      mostrar({ variant: "err", titulo: res.error });
    }
  };

  const iniciarArrastre = (elemento: ElementoArrastre, e: React.DragEvent) => {
    arrastrandoRef.current = elemento;
    setArrastrando(elemento);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/json", JSON.stringify(elemento));
    e.dataTransfer.setData("text/plain", elemento.nombre);
  };

  const soltarEnCarpeta = async (carpetaId: string, e: React.DragEvent) => {
    e.preventDefault();
    const elemento =
      arrastrandoRef.current ??
      arrastrando ??
      obtenerElementoArrastrado(e.dataTransfer.getData("application/json"));
    arrastrandoRef.current = null;
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
      arrastrandoRef.current = elemento;
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
    const elemento = arrastrandoRef.current ?? arrastrando;
    arrastrandoRef.current = null;
    setArrastrando(null);
    if (elemento && destinoId) {
      await moverElementoDentroDeCarpeta(elemento, destinoId);
    }
  };

  return (
    <section className="flex flex-col gap-4">
      {totalSeleccionados > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setDestinoId("");
              setModalMover(true);
            }}
          >
            Mover todos
          </Button>
          {esAdmin && (
            <Button type="button" variant="danger" size="sm" onClick={() => setModalEliminar(true)}>
              Eliminar ({totalSeleccionados})
            </Button>
          )}
        </div>
      )}

      <div className="rounded-[14px] border border-rule bg-paper overflow-hidden">
        <div className="hidden md:grid grid-cols-[28px_44px_1fr_120px_100px_68px] items-center px-5 py-2.5 gap-3.5 bg-soft text-mute font-display italic text-xs border-b border-rule">
          <div></div>
          <div></div>
          <div>Nombre</div>
          <div>Tipo</div>
          <div>Tamano</div>
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
              arrastrandoRef.current = null;
              setArrastrando(null);
              setCarpetaSobre(null);
            }}
            onDragOver={(e) => {
              const elemento = arrastrandoRef.current ?? arrastrando;
              if (elemento?.id === carpeta.id) return;
              if (!elemento && !e.dataTransfer.types.includes("application/json")) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
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
              arrastrandoRef.current = null;
              setArrastrando(null);
              setCarpetaSobre(null);
            }}
            className={[
              "flex flex-col items-stretch gap-3 px-4 py-4 md:grid md:grid-cols-[28px_44px_1fr_120px_100px_68px] md:items-center md:px-5 md:py-3 md:gap-3.5 border-b border-rule text-[13px] transition-colors",
              carpetaSobre === carpeta.id ? "bg-accent-tint" : "",
              arrastrando?.id === carpeta.id ? "opacity-60" : "",
            ].join(" ")}
          >
            <input
              type="checkbox"
              checked={carpetasSeleccionadas.has(carpeta.id)}
              onChange={() => toggleCarpeta(carpeta.id)}
              className="w-4 h-4 cursor-pointer accent-[var(--accent)] shrink-0"
              aria-label={`Seleccionar carpeta ${carpeta.nombre}`}
            />
            <span className="w-9 h-9 rounded-[8px] border border-rule bg-card grid place-items-center text-accent font-semibold">
              /
            </span>
            <Link
              href={`/carpetas/${carpeta.id}`}
              onClick={(e) => {
                if (bloquearClickTrasArrastreRef.current) e.preventDefault();
              }}
              className="min-w-0 font-medium hover:text-accent transition-colors truncate"
            >
              {carpeta.nombre}
            </Link>
            <span className="text-mute text-[12px]">Carpeta</span>
            <span className="text-mute font-mono text-[12px]">-</span>
            <div className="relative flex items-center justify-end">
              <button
                type="button"
                onClick={(e) =>
                  abrirMenu({ tipo: "carpeta", id: carpeta.id, nombre: carpeta.nombre }, e.currentTarget)
                }
                className="text-mute hover:text-ink px-1.5 py-1 rounded-[6px] hover:bg-soft"
                aria-label="Mas acciones"
              >
                ...
              </button>
              {menuElemento?.tipo === "carpeta" && menuElemento.id === carpeta.id && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuElemento(null)} />
                  <div
                    className="fixed z-50 bg-card border border-rule rounded-[10px] shadow-[var(--shadow-2)] py-1 w-48"
                    style={{ left: menuElemento.x, top: menuElemento.y }}
                  >
                    <Link
                      href={`/carpetas/${carpeta.id}`}
                      className="block px-3 py-1.5 text-[13px] hover:bg-soft"
                      onClick={() => setMenuElemento(null)}
                    >
                      Abrir
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setModalRenombrarElemento({ tipo: "carpeta", id: carpeta.id, nombre: carpeta.nombre });
                        setNombreEditado(carpeta.nombre);
                        setMenuElemento(null);
                      }}
                      className="block w-full text-left px-3 py-1.5 text-[13px] hover:bg-soft"
                    >
                      Renombrar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setModalMoverElemento({ tipo: "carpeta", id: carpeta.id, nombre: carpeta.nombre });
                        setDestinoId(carpeta.parent_id ?? "");
                        setMenuElemento(null);
                      }}
                      className="block w-full text-left px-3 py-1.5 text-[13px] hover:bg-soft"
                    >
                      Mover a carpeta
                    </button>
                    {esAdmin && (
                      <button
                        type="button"
                        onClick={() => void eliminarElementoDesdeMenu({ tipo: "carpeta", id: carpeta.id, nombre: carpeta.nombre })}
                        className="block w-full text-left px-3 py-1.5 text-[13px] text-danger hover:bg-danger-tint"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        ))}

        {docsActuales.map((doc) => {
          const tipo = (doc.tipo_archivo ?? "").toUpperCase();
          const kb = doc.tamano_bytes ? Math.round(doc.tamano_bytes / 1024) : null;

          return (
            <div
              key={doc.id}
              draggable
              onDragStart={(e) => iniciarArrastre({ tipo: "doc", id: doc.id, nombre: doc.nombre }, e)}
              onDragEnd={() => {
                arrastrandoRef.current = null;
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
                arrastrandoRef.current = null;
                setArrastrando(null);
                setCarpetaSobre(null);
              }}
              className={[
                "flex flex-col items-stretch gap-3 px-4 py-4 md:grid md:grid-cols-[28px_44px_1fr_120px_100px_68px] md:items-center md:px-5 md:py-3 md:gap-3.5 border-b border-rule last:border-b-0 text-[13px] transition-opacity",
                arrastrando?.id === doc.id ? "opacity-60" : "",
              ].join(" ")}
            >
              <input
                type="checkbox"
                checked={docsSeleccionados.has(doc.id)}
                onChange={() => toggleDoc(doc.id)}
                className="w-4 h-4 cursor-pointer accent-[var(--accent)] shrink-0"
                aria-label={`Seleccionar ${doc.nombre}`}
              />
              <span className="w-9 h-11 rounded-[6px] border border-rule bg-card grid place-items-center font-display italic text-accent text-[11px] shrink-0">
                {tipo.slice(0, 3) || "?"}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <Link
                    href={`/documentos/${doc.id}`}
                    onClick={(e) => {
                      if (bloquearClickTrasArrastreRef.current) e.preventDefault();
                    }}
                    className="min-w-0 truncate font-medium hover:text-accent transition-colors"
                  >
                    {doc.nombre}
                  </Link>
                  <FiabilidadModelo
                    probabilidad={doc.probabilidad}
                    tipoArchivo={doc.tipo_archivo}
                    confidencialidad={doc.confidencialidad}
                  />
                </div>
              </div>
              <span className="text-mute text-[12px]">{tipo.toLowerCase() || "Documento"}</span>
              <span className="text-mute font-mono text-[12px]">
                {kb !== null ? `${kb} KB` : "-"}
              </span>
              <div className="relative flex items-center justify-end">
                <button
                  type="button"
                  onClick={(e) =>
                    abrirMenu({ tipo: "doc", id: doc.id, nombre: doc.nombre }, e.currentTarget)
                  }
                  className="text-mute hover:text-ink px-1.5 py-1 rounded-[6px] hover:bg-soft"
                  aria-label="Mas acciones"
                >
                  ...
                </button>
                {menuElemento?.tipo === "doc" && menuElemento.id === doc.id && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenuElemento(null)} />
                    <div
                      className="fixed z-50 bg-card border border-rule rounded-[10px] shadow-[var(--shadow-2)] py-1 w-48"
                      style={{ left: menuElemento.x, top: menuElemento.y }}
                    >
                      <Link
                        href={`/documentos/${doc.id}`}
                        className="block px-3 py-1.5 text-[13px] hover:bg-soft"
                        onClick={() => setMenuElemento(null)}
                      >
                        Ver detalle
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setModalRenombrarElemento({ tipo: "doc", id: doc.id, nombre: doc.nombre });
                          setNombreEditado(doc.nombre);
                          setMenuElemento(null);
                        }}
                        className="block w-full text-left px-3 py-1.5 text-[13px] hover:bg-soft"
                      >
                        Renombrar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setModalMoverElemento({ tipo: "doc", id: doc.id, nombre: doc.nombre });
                          setDestinoId(doc.carpeta_id ?? "");
                          setMenuElemento(null);
                        }}
                        className="block w-full text-left px-3 py-1.5 text-[13px] hover:bg-soft"
                      >
                        Mover a carpeta
                      </button>
                      {esAdmin && (
                        <button
                          type="button"
                          onClick={() => void eliminarElementoDesdeMenu({ tipo: "doc", id: doc.id, nombre: doc.nombre })}
                          className="block w-full text-left px-3 py-1.5 text-[13px] text-danger hover:bg-danger-tint"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {carpetasActuales.length === 0 && docsActuales.length === 0 && (
          <div className="px-5 py-10 text-center text-mute text-sm">
            Esta ubicacion esta vacia.
          </div>
        )}
      </div>

      {modalMoverElemento && (
        <Modal
          abierto={modalMoverElemento !== null}
          onClose={() => setModalMoverElemento(null)}
          titulo="Mover elemento"
          acciones={
            <>
              <Button type="button" variant="ghost" onClick={() => setModalMoverElemento(null)} disabled={procesando}>
                Cancelar
              </Button>
              <Button type="button" variant="primary" onClick={moverElementoDesdeMenu} loading={procesando}>
                Mover
              </Button>
            </>
          }
        >
          <p className="text-mute text-[13px] mb-4">
            Mover <span className="font-medium text-ink">{modalMoverElemento.nombre}</span> a:
          </p>
          <select
            value={destinoId}
            onChange={(e) => setDestinoId(e.target.value)}
            className="w-full rounded-[8px] border border-rule bg-card px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-accent-tint"
          >
            <option value="">Sin carpeta</option>
            {destinosElemento.map((carpeta) => (
              <option key={carpeta.id} value={carpeta.id}>
                {carpeta.nombre}
              </option>
            ))}
          </select>
        </Modal>
      )}

      {modalRenombrarElemento && (
        <Modal
          abierto={modalRenombrarElemento !== null}
          onClose={() => setModalRenombrarElemento(null)}
          titulo={modalRenombrarElemento.tipo === "carpeta" ? "Renombrar carpeta" : "Renombrar documento"}
          acciones={
            <>
              <Button type="button" variant="ghost" onClick={() => setModalRenombrarElemento(null)} disabled={procesando}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={guardarRenombreElemento}
                loading={procesando}
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
            maxLength={modalRenombrarElemento.tipo === "carpeta" ? 100 : 200}
            autoFocus
          />
        </Modal>
      )}

      {modalMover && (
        <Modal
          abierto={modalMover}
          onClose={() => setModalMover(false)}
          titulo="Mover todos"
          acciones={
            <>
              <Button type="button" variant="ghost" onClick={() => setModalMover(false)} disabled={procesando}>
                Cancelar
              </Button>
              <Button type="button" variant="primary" onClick={moverSeleccion} loading={procesando}>
                Mover
              </Button>
            </>
          }
        >
          <p className="text-mute text-[13px] mb-4">
            Mover {totalSeleccionados} elemento{totalSeleccionados === 1 ? "" : "s"} a:
          </p>
          <select
            value={destinoId}
            onChange={(e) => setDestinoId(e.target.value)}
            className="w-full rounded-[8px] border border-rule bg-card px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-accent-tint"
          >
            <option value="">Sin carpeta</option>
            {destinos.map((carpeta) => (
              <option key={carpeta.id} value={carpeta.id}>
                {carpeta.nombre}
              </option>
            ))}
          </select>
        </Modal>
      )}

      {modalEliminar && (
        <Modal
          abierto={modalEliminar}
          onClose={() => setModalEliminar(false)}
          titulo="Eliminar seleccion"
          tono="danger"
          acciones={
            <>
              <Button type="button" variant="ghost" onClick={() => setModalEliminar(false)} disabled={procesando}>
                Cancelar
              </Button>
              <Button type="button" variant="danger" onClick={eliminarSeleccion} loading={procesando}>
                Si, eliminar
              </Button>
            </>
          }
        >
          <p className="text-mute text-[13px] leading-[1.55] m-0">
            Se eliminaran {totalSeleccionados} elemento{totalSeleccionados === 1 ? "" : "s"} seleccionado
            {totalSeleccionados === 1 ? "" : "s"}. Incluye {resumen.carpetas} carpeta
            {resumen.carpetas === 1 ? "" : "s"}, {resumen.subcarpetas} subcarpeta
            {resumen.subcarpetas === 1 ? "" : "s"} y {resumen.documentos} documento
            {resumen.documentos === 1 ? "" : "s"}. Esta accion no se puede deshacer.
          </p>
        </Modal>
      )}
    </section>
  );
}

function obtenerRutasCarpetas(carpetas: CarpetaOrgAdmin[]) {
  const porId = new Map(carpetas.map((carpeta) => [carpeta.id, carpeta]));
  const resolver = (carpeta: CarpetaOrgAdmin): string => {
    const padre = carpeta.parent_id ? porId.get(carpeta.parent_id) : null;
    return padre ? `${resolver(padre)} / ${carpeta.nombre}` : carpeta.nombre;
  };
  return carpetas.map((carpeta) => ({ id: carpeta.id, nombre: resolver(carpeta) }));
}

function obtenerIdsCarpetasDescendientes(carpetas: CarpetaOrgAdmin[], raizId: string) {
  const ids = new Set<string>();
  const porPadre = new Map<string | null, CarpetaOrgAdmin[]>();
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
  carpetas: CarpetaOrgAdmin[],
  documentos: DocumentoOrgAdmin[],
  carpetasSeleccionadas: Set<string>,
  documentosSeleccionados: Set<string>,
) {
  const idsCarpetasIncluidas = new Set<string>();
  for (const id of carpetasSeleccionadas) {
    for (const incluido of obtenerIdsCarpetasDescendientes(carpetas, id)) {
      idsCarpetasIncluidas.add(incluido);
    }
  }
  const docs = new Set(documentosSeleccionados);
  for (const doc of documentos) {
    if (doc.carpeta_id && idsCarpetasIncluidas.has(doc.carpeta_id)) docs.add(doc.id);
  }
  return {
    carpetas: carpetasSeleccionadas.size,
    subcarpetas: Math.max(0, idsCarpetasIncluidas.size - carpetasSeleccionadas.size),
    documentos: docs.size,
  };
}

function esDescendienteCarpeta(
  carpetas: CarpetaOrgAdmin[],
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

function obtenerElementoArrastrado(valor: string): ElementoArrastre | null {
  if (!valor) return null;
  try {
    const parseado = JSON.parse(valor) as Partial<ElementoArrastre>;
    if (
      (parseado.tipo === "doc" || parseado.tipo === "carpeta") &&
      typeof parseado.id === "string" &&
      typeof parseado.nombre === "string"
    ) {
      return {
        tipo: parseado.tipo,
        id: parseado.id,
        nombre: parseado.nombre,
      };
    }
  } catch {
    return null;
  }
  return null;
}
