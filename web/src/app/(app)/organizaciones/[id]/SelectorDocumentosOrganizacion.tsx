"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { FiabilidadModelo } from "@/components/ui/FiabilidadModelo";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { subirDocumentoAOrganizacion } from "../acciones";

type DocumentoDisponible = {
  id: string;
  nombre: string;
  tipo_archivo: string | null;
  confidencialidad: number | null;
  probabilidad: number | null;
};

interface Props {
  orgId: string;
  documentos: DocumentoDisponible[];
}

export function SelectorDocumentosOrganizacion({ orgId, documentos }: Props) {
  const router = useRouter();
  const { mostrar } = useToast();
  const [abierto, setAbierto] = useState(false);
  const [subiendoId, setSubiendoId] = useState<string | null>(null);

  const subirDocumento = async (docId: string) => {
    setSubiendoId(docId);
    const fd = new FormData();
    fd.append("org_id", orgId);
    fd.append("documento_id", docId);
    fd.append("carpeta_id", "");
    const res = await subirDocumentoAOrganizacion(undefined, fd);
    setSubiendoId(null);
    if (res && "ok" in res) {
      mostrar({ variant: "ok", titulo: res.ok });
      setAbierto(false);
      router.refresh();
    } else if (res && "error" in res) {
      mostrar({ variant: "err", titulo: res.error });
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setAbierto(true)}
      >
        Subir archivos
      </Button>

      <Modal
        abierto={abierto}
        onClose={() => setAbierto(false)}
        titulo="Subir archivos"
        acciones={
          <Button type="button" variant="ghost" onClick={() => setAbierto(false)}>
            Cerrar
          </Button>
        }
      >
        {documentos.length === 0 ? (
          <p className="text-mute text-[13px]">
            No tienes documentos disponibles para subir a esta organizacion.
          </p>
        ) : (
          <div className="flex max-h-[52vh] flex-col overflow-y-auto rounded-[12px] border border-rule bg-paper">
            {documentos.map((doc) => {
              const tipo = (doc.tipo_archivo ?? "").toUpperCase();
              return (
                <div
                  key={doc.id}
                  className="flex flex-col gap-3 border-b border-rule px-3 py-3 text-[13px] last:border-b-0 sm:flex-row sm:items-center"
                >
                  <span className="grid h-10 w-8 shrink-0 place-items-center rounded-[6px] border border-rule bg-card font-display text-[10px] italic text-accent">
                    {tipo.slice(0, 3) || "?"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <p className="min-w-0 truncate font-medium">{doc.nombre}</p>
                      <FiabilidadModelo
                        probabilidad={doc.probabilidad}
                        tipoArchivo={doc.tipo_archivo}
                        confidencialidad={doc.confidencialidad}
                      />
                    </div>
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void subirDocumento(doc.id);
                    }}
                  >
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      loading={subiendoId === doc.id}
                      disabled={subiendoId !== null}
                      className="w-full justify-center sm:w-auto"
                    >
                      Subir
                    </Button>
                  </form>
                </div>
              );
            })}
          </div>
        )}
      </Modal>
    </>
  );
}
