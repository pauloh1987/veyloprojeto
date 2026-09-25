import type { Metadata } from "next";
import { exigirDono } from "@/lib/auth";
import { obterUrlBase } from "@/lib/url";
import { ConfiguracoesClient } from "./ConfiguracoesClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Configurações" };

export default async function PaginaConfiguracoes() {
  const usuario = await exigirDono();
  const urlBase = await obterUrlBase();
  const linkPublico = `${urlBase}/${usuario.estabelecimento.slug}`;

  return <ConfiguracoesClient estabelecimento={usuario.estabelecimento} linkPublico={linkPublico} />;
}
