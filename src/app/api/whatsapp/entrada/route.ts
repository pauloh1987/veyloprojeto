import { createHmac, timingSafeEqual } from "node:crypto";
import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { db } from "@/lib/db";
import { cancelarPelaCliente, confirmarPresencaPelaCliente } from "@/lib/agenda/respostaCliente";
import { linkWhatsAppEstabelecimento, urlBaseSite } from "@/lib/mensagens/textos";

/**
 * Webhook de mensagens recebidas no número de WhatsApp da Veylo (configurado na Twilio como
 * "Webhook URL for incoming messages"). O número é único pra todos os salões e só envia
 * avisos, então aqui só existem duas coisas a fazer:
 * - toque em "Confirmar"/"Cancelar" (botões do template): atualiza o agendamento sozinho e a
 *   dona vê o aviso no painel — ela nunca precisa ler nada neste número;
 * - qualquer outra mensagem: resposta automática mandando a cliente pro WhatsApp do salão.
 * A resposta vai como TwiML — dentro da janela de 24h aberta pela própria cliente, então é
 * texto livre, sem template.
 */

type Acao = "CONFIRMAR" | "CANCELAR";

function assinaturaValida(request: Request, params: URLSearchParams): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const assinatura = request.headers.get("x-twilio-signature");
  if (!authToken || !assinatura) return false;

  const chaves = [...new Set(params.keys())].sort();
  const sufixo = chaves.map((chave) => chave + params.getAll(chave).join("")).join("");
  // A Twilio assina a URL exata configurada no painel dela; atrás do proxy da Netlify a URL
  // vista aqui pode diferir, então aceita tanto a URL da requisição quanto a do domínio público.
  const urls = [request.url, `${urlBaseSite()}/api/whatsapp/entrada`];
  const recebida = Buffer.from(assinatura);
  return urls.some((url) => {
    const esperada = Buffer.from(createHmac("sha1", authToken).update(url + sufixo).digest("base64"));
    return esperada.length === recebida.length && timingSafeEqual(esperada, recebida);
  });
}

/** "whatsapp:+5581991234567" -> variações locais (com e sem o 9º dígito, que o WhatsApp às
 * vezes omite em números brasileiros antigos) como estão guardadas em `Cliente.telefone`. */
function variacoesTelefone(from: string): string[] {
  let digitos = from.replace(/\D/g, "");
  if (digitos.startsWith("55") && digitos.length >= 12) digitos = digitos.slice(2);
  const variacoes = new Set([digitos]);
  if (digitos.length === 10) variacoes.add(`${digitos.slice(0, 2)}9${digitos.slice(2)}`);
  if (digitos.length === 11 && digitos[2] === "9") variacoes.add(digitos.slice(0, 2) + digitos.slice(3));
  // Cadastros antigos (e o seed) guardam o telefone já mascarado — inclui essa forma também.
  const mascarados = [...variacoes].map((d) => `(${d.slice(0, 2)}) ${d.slice(2, -4)}-${d.slice(-4)}`);
  return [...variacoes, ...mascarados];
}

function identificarAcao(texto: string): Acao | null {
  const normalizado = texto.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toUpperCase();
  if (["CONFIRMAR", "CONFIRMO", "SIM", "1"].includes(normalizado)) return "CONFIRMAR";
  if (["CANCELAR", "CANCELO", "2"].includes(normalizado)) return "CANCELAR";
  return null;
}

async function encontrarMensagemOrigem(params: URLSearchParams) {
  const include = { agendamento: { include: { estabelecimento: true } }, cliente: { include: { estabelecimento: true } } };

  const sidRespondido = params.get("OriginalRepliedMessageSid");
  if (sidRespondido) {
    const mensagem = await db.mensagem.findFirst({ where: { sidProvedor: sidRespondido }, include });
    if (mensagem) return mensagem;
  }

  const telefones = variacoesTelefone(params.get("From") ?? "");
  return db.mensagem.findFirst({
    where: {
      status: "ENVIADA",
      OR: [{ cliente: { telefone: { in: telefones } } }, { agendamento: { cliente: { telefone: { in: telefones } } } }],
    },
    orderBy: { enviadaEm: "desc" },
    include,
  });
}

function escaparXml(texto: string): string {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function twiml(texto: string): Response {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escaparXml(texto)}</Message></Response>`, {
    headers: { "Content-Type": "text/xml" },
  });
}

export async function POST(request: Request) {
  const params = new URLSearchParams(await request.text());
  if (!assinaturaValida(request, params)) {
    return new Response("Assinatura inválida.", { status: 403 });
  }

  const mensagem = await encontrarMensagemOrigem(params);
  const estabelecimento = mensagem?.agendamento?.estabelecimento ?? mensagem?.cliente?.estabelecimento;
  if (!mensagem || !estabelecimento) {
    return twiml("Oi! Este número só envia avisos automáticos de agendamento e não recebe mensagens.");
  }

  const contatoSalao = linkWhatsAppEstabelecimento(estabelecimento.telefone);
  const linkAgendar = `${urlBaseSite()}/${estabelecimento.slug}`;
  const acao = identificarAcao(params.get("ButtonPayload") || params.get("ButtonText") || params.get("Body") || "");
  const agendamento = mensagem.agendamento;

  if (!acao || !agendamento) {
    return twiml(
      `Oi! Este número só envia avisos automáticos de ${estabelecimento.nome}. Para conversar, chame o salão aqui: ${contatoSalao}`,
    );
  }

  const resultado =
    acao === "CONFIRMAR" ? await confirmarPresencaPelaCliente(agendamento.id) : await cancelarPelaCliente(agendamento.id);

  if (resultado.tipo === "ja_cancelado") {
    return twiml(`Esse horário já estava cancelado. Para marcar outro, é só usar o link: ${linkAgendar}`);
  }
  if (resultado.tipo === "ja_concluido") {
    return twiml(`Esse atendimento já foi concluído. Para falar com ${estabelecimento.nome}: ${contatoSalao}`);
  }
  if (acao === "CANCELAR") {
    return twiml(`Horário cancelado — o salão já foi avisado. Se quiser marcar outro, é só usar o link: ${linkAgendar}`);
  }
  const quando = formatInTimeZone(agendamento.inicio, estabelecimento.fuso, "EEEE, d 'de' MMMM 'às' HH:mm", { locale: ptBR });
  return twiml(`Presença confirmada! ${estabelecimento.nome} te espera ${quando}.`);
}
