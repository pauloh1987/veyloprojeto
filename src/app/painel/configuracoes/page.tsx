import type { Metadata } from "next";
import { headers } from "next/headers";
import { exigirDono } from "@/lib/auth";
import { ConfiguracoesClient } from "./ConfiguracoesClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Configurações" };

export default async function PaginaConfiguracoes() {
  const usuario = await exigirDono();
  const cabecalhos = await headers();
  const host = cabecalhos.get("host") ?? "localhost:3000";
  const protocolo = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
  const linkPublico = `${protocolo}://${host}/${usuario.estabelecimento.slug}`;

  return <ConfiguracoesClient estabelecimento={usuario.estabelecimento} linkPublico={linkPublico} />;
}
