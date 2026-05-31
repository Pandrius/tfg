"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { crearCarpeta } from "./acciones";

export function FormularioInlineCarpeta({
  orgId,
  parentId,
}: {
  orgId?: string;
  parentId?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [enviando, setEnviando] = useState(false);
  const { mostrar } = useToast();
  const router = useRouter();

  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    setEnviando(true);
    const fd = new FormData();
    fd.append("nombre", nombre.trim());
    if (orgId) fd.append("org_id", orgId);
    if (parentId) fd.append("parent_id", parentId);
    const res = await crearCarpeta(undefined, fd);
    setEnviando(false);
    if (res && "ok" in res) {
      mostrar({ variant: "ok", titulo: res.ok });
      setNombre("");
      setAbierto(false);
      if (orgId || parentId) {
        router.refresh();
      } else {
        router.replace("/carpetas");
        router.refresh();
      }
    } else if (res && "error" in res) {
      mostrar({ variant: "err", titulo: res.error });
    }
  };

  if (!abierto) {
    return (
      <Button variant="primary" size="md" onClick={() => setAbierto(true)}>
        + Nueva carpeta
      </Button>
    );
  }

  return (
    <form onSubmit={crear} className="flex gap-2">
      <Input
        placeholder="Nombre de la carpeta…"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        maxLength={100}
        disabled={enviando}
        className="flex-1"
        autoFocus
      />
      <Button type="submit" variant="primary" size="md" disabled={!nombre.trim() || enviando}>
        Crear
      </Button>
      <Button type="button" variant="ghost" size="md" onClick={() => setAbierto(false)} disabled={enviando}>
        Cancelar
      </Button>
    </form>
  );
}
