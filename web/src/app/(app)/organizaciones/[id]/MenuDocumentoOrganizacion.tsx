"use client";

import { useState } from "react";

import {
  desvincularDocumento,
  eliminarDocumentoOrganizacion,
} from "../acciones";

interface Props {
  orgId: string;
  documentoId: string;
  nombre: string;
}

export function MenuDocumentoOrganizacion({ orgId, documentoId, nombre }: Props) {
  const [abierto, setAbierto] = useState(false);

  const borrar = () => {
    const ok = window.confirm(
      `Vas a borrar "${nombre}" para siempre. Si nadie tiene una copia, no se podra recuperar. Quieres continuar?`,
    );
    if (!ok) return;
    eliminarDocumentoOrganizacion(orgId, documentoId);
  };

  return (
    <div className="relative flex justify-end">
      <button
        type="button"
        onClick={() => setAbierto((valor) => !valor)}
        className="text-mute hover:text-ink px-2 py-1 rounded-[6px] hover:bg-soft"
        aria-label="Mas acciones"
      >
        ...
      </button>
      {abierto && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAbierto(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-[10px] border border-rule bg-card py-1 shadow-[var(--shadow-2)]">
            <form action={desvincularDocumento.bind(null, orgId, documentoId)}>
              <button
                type="submit"
                className="block w-full px-3 py-1.5 text-left text-[13px] hover:bg-soft"
              >
                Quitar de la organizacion
              </button>
            </form>
            <button
              type="button"
              onClick={borrar}
              className="block w-full px-3 py-1.5 text-left text-[13px] text-danger hover:bg-danger-tint"
            >
              Borrar para siempre
            </button>
          </div>
        </>
      )}
    </div>
  );
}
