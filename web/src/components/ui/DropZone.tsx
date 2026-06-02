"use client";

import { useEffect, useRef, useState, type DragEvent, type ReactNode } from "react";

interface Props {
  /** Callback con los ficheros seleccionados (drop o picker). */
  onArchivos: (archivos: File[]) => void;
  /** Tipos MIME / extensiones aceptadas (separadas por coma). */
  accept?: string;
  /** Permite seleccionar varios ficheros a la vez. */
  multiple?: boolean;
  /** Permite seleccionar carpetas completas en navegadores compatibles. */
  directory?: boolean;
  /** Deshabilita interacción cuando true. */
  disabled?: boolean;
  /** Slot del contenido visual (icono + textos). */
  children: ReactNode;
}

/** Área draggable reutilizable. Captura drop y click → file picker. */
export function DropZone({
  onArchivos,
  accept,
  multiple = false,
  directory = false,
  disabled = false,
  children,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [hover, setHover] = useState(false);

  useEffect(() => {
    if (!inputRef.current) return;
    if (directory) {
      inputRef.current.setAttribute("webkitdirectory", "");
      inputRef.current.setAttribute("directory", "");
    } else {
      inputRef.current.removeAttribute("webkitdirectory");
      inputRef.current.removeAttribute("directory");
    }
  }, [directory]);

  const elegir = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const onDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setHover(false);
    if (disabled) return;
    const archivos = await obtenerArchivosDrop(e.dataTransfer);
    onArchivos(archivos);
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setHover(true);
      }}
      onDragLeave={() => setHover(false)}
      onDrop={onDrop}
      onClick={elegir}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !disabled) {
          e.preventDefault();
          elegir();
        }
      }}
      className={[
        "rounded-[14px] border-2 border-dashed p-8 text-center transition-colors",
        "select-none cursor-pointer outline-none",
        "focus-visible:ring-3 focus-visible:ring-accent-tint",
        disabled
          ? "border-rule opacity-50 cursor-not-allowed"
          : hover
          ? "border-accent bg-accent-tint"
          : "border-rule bg-paper hover:border-accent-soft-hover",
      ].join(" ")}
    >
      {children}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          const lista = Array.from(e.target.files ?? []);
          e.target.value = "";
          onArchivos(lista);
        }}
      />
    </div>
  );
}

type FileConRuta = File & { webkitRelativePath?: string };
type EntradaDrop = {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
  file?: (callback: (file: File) => void) => void;
  createReader?: () => {
    readEntries: (callback: (entries: EntradaDrop[]) => void) => void;
  };
};

type ItemDrop = DataTransferItem & {
  webkitGetAsEntry?: () => EntradaDrop | null;
};

async function obtenerArchivosDrop(dataTransfer: DataTransfer) {
  const items = Array.from(dataTransfer.items ?? []) as ItemDrop[];
  const entradas = items
    .map((item) => (item.webkitGetAsEntry?.() ?? null) as EntradaDrop | null)
    .filter((entry): entry is EntradaDrop => entry !== null);

  if (entradas.length === 0) return Array.from(dataTransfer.files);

  const archivos = await Promise.all(entradas.map((entry) => leerEntradaDrop(entry, "")));
  return archivos.flat();
}

async function leerEntradaDrop(entry: EntradaDrop, rutaPadre: string): Promise<File[]> {
  const ruta = rutaPadre ? `${rutaPadre}/${entry.name}` : entry.name;

  if (entry.isFile && entry.file) {
    const file = await new Promise<File>((resolve) => entry.file?.(resolve));
    Object.defineProperty(file, "webkitRelativePath", {
      value: ruta,
      configurable: true,
    });
    return [file as FileConRuta];
  }

  if (!entry.isDirectory || !entry.createReader) return [];

  const reader = entry.createReader();
  const hijos: EntradaDrop[] = [];
  while (true) {
    const lote = await new Promise<EntradaDrop[]>((resolve) => reader.readEntries(resolve));
    if (lote.length === 0) break;
    hijos.push(...lote);
  }

  const archivos = await Promise.all(hijos.map((hijo) => leerEntradaDrop(hijo, ruta)));
  return archivos.flat();
}
