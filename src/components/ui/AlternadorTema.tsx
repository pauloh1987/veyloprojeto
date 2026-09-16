"use client";

import { useEffect, useState } from "react";

export function AlternadorTema({ className }: { className?: string }) {
  const [escuro, setEscuro] = useState<boolean | null>(null);

  useEffect(() => {
    setEscuro(document.documentElement.classList.contains("dark"));
  }, []);

  function alternar() {
    const novoEscuro = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", novoEscuro);
    try {
      localStorage.setItem("veylo-tema", novoEscuro ? "dark" : "light");
    } catch {
      // localStorage indisponível (ex. navegação privada) — a preferência só não persiste.
    }
    setEscuro(novoEscuro);
  }

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={escuro ? "Mudar para tema claro" : "Mudar para tema escuro"}
      title={escuro ? "Tema claro" : "Tema escuro"}
      className={className ?? "flex h-10 w-10 items-center justify-center rounded-full text-text-muted hover:bg-surface-2 hover:text-text"}
    >
      {escuro === null ? null : escuro ? (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden>
          <path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="2" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden>
          <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}
