import { processarFilaMensagens } from "@/lib/mensagens/fila";

/**
 * Disparo manual/depuração da fila de mensagens (o disparo automático de verdade é a função
 * agendada `netlify/functions/cron-mensagens.mts`, que chama `processarFilaMensagens`
 * diretamente, sem passar por HTTP). Protegido por segredo compartilhado porque processa fila
 * de verdade (envia SMS/WhatsApp reais, com custo) — sem `CRON_SECRET` configurado, a rota
 * fica sempre bloqueada, nunca aberta por padrão.
 */
function autorizado(request: Request): boolean {
  const segredo = process.env.CRON_SECRET;
  return Boolean(segredo) && request.headers.get("authorization") === `Bearer ${segredo}`;
}

async function processar(request: Request) {
  if (!autorizado(request)) {
    return new Response("Não autorizado.", { status: 401 });
  }
  const resultado = await processarFilaMensagens();
  return Response.json({
    processadas: resultado.processadas,
    agoraEfetivo: resultado.agoraEfetivo.toISOString(),
  });
}

export async function GET(request: Request) {
  return processar(request);
}

export async function POST(request: Request) {
  return processar(request);
}
