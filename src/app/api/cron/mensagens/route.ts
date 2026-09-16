import { processarFilaMensagens } from "@/lib/mensagens/fila";

/**
 * Processa a fila de mensagens pendentes (confirmações/lembretes cujo horário chegou).
 * Sem autenticação de propósito: é o endpoint que um cron job real chamaria periodicamente
 * neste protótipo local. Em produção, adicionar um segredo compartilhado (header ou query
 * string) antes de expor publicamente.
 */
async function processar() {
  const resultado = await processarFilaMensagens();
  return Response.json({
    processadas: resultado.processadas,
    agoraEfetivo: resultado.agoraEfetivo.toISOString(),
  });
}

export async function GET() {
  return processar();
}

export async function POST() {
  return processar();
}
