import "server-only";
import { headers } from "next/headers";

/** Base (protocolo + host) da requisição atual — usada pra montar links absolutos em
 * e-mails (link público, confirmação de conta, redefinição de senha). */
export async function obterUrlBase(): Promise<string> {
  const cabecalhos = await headers();
  const host = cabecalhos.get("host") ?? "localhost:3000";
  const protocolo = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
  return `${protocolo}://${host}`;
}
