"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

export function Modal({
  aberto,
  aoFechar,
  titulo,
  children,
}: {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (aberto && !dialog.open) dialog.showModal();
    if (!aberto && dialog.open) dialog.close();
  }, [aberto]);

  return (
    <dialog
      ref={ref}
      onClose={aoFechar}
      onCancel={aoFechar}
      className="m-auto max-h-[85vh] w-[calc(100vw-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-border bg-surface p-0 text-text backdrop:bg-black/50"
    >
      <div className="sticky top-0 flex items-center justify-between border-b border-border bg-surface p-4">
        <h2 className="font-heading text-lg font-bold text-text">{titulo}</h2>
        <button
          type="button"
          onClick={aoFechar}
          aria-label="Fechar"
          className="rounded-full p-1.5 text-text-muted hover:bg-surface-2"
        >
          <X size={18} />
        </button>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </dialog>
  );
}
