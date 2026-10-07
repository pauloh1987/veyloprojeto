import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { somenteDigitos } from "@/lib/formatadores";

interface DadosMensagem {
  nomeEstabelecimento: string;
  telefoneEstabelecimento: string;
  nomeServico: string;
  inicio: Date;
  fuso: string;
}

function dataHoraFormatada(inicio: Date, fuso: string): string {
  return formatInTimeZone(inicio, fuso, "EEEE, d 'de' MMMM 'às' HH:mm", {
    locale: ptBR,
  });
}

/** Link de conversa no WhatsApp com um telefone brasileiro, opcionalmente com o texto já escrito.
 * Serve para o número do salão (as mensagens saem de um número único da Veylo, que só envia
 * avisos, então qualquer conversa de verdade vai pro número do salão) e para a dona chamar uma
 * cliente pelo WhatsApp dela. */
export function linkWhatsApp(telefone: string, texto?: string): string {
  const digitos = somenteDigitos(telefone);
  const numero = digitos.startsWith("55") && digitos.length > 11 ? digitos : `55${digitos}`;
  return `https://wa.me/${numero}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;
}

/** Base pública do site pra links montados fora de uma requisição (fila, cron). A Netlify
 * define `URL` com o domínio principal do site. */
export function urlBaseSite(): string {
  // No site de teste, URL é o domínio de produção: os links têm de apontar para o próprio teste.
  const base = process.env.VEYLO_URL_TESTE || process.env.URL || "http://localhost:3000";
  return base.replace(/\/$/, "");
}

const RODAPE = "Dúvidas? Fale direto com o salão:";
const AVISO_NUMERO = "— este número só envia avisos.";

/** Mesmos dados usados para montar o texto em português, na ordem em que preenchem os
 * placeholders {{1}}..{{4}} dos templates aprovados na Meta para WhatsApp — extraído à parte
 * pra garantir que o texto (SMS/console/painel) e as variáveis (WhatsApp) nunca fiquem
 * dessincronizados. Ver os templates de referência em DECISOES.md. */
export function variaveisMensagem(dados: DadosMensagem): string[] {
  return [
    dados.nomeEstabelecimento,
    dados.nomeServico,
    dataHoraFormatada(dados.inicio, dados.fuso),
    linkWhatsApp(dados.telefoneEstabelecimento),
  ];
}

export function textoConfirmacao(dados: DadosMensagem): string {
  const [nome, servico, quando, link] = variaveisMensagem(dados);
  return `Olá! Aqui é ${nome}. Seu horário de ${servico} está marcado para ${quando}.\n\nToque em Confirmar ou Cancelar logo abaixo.\n\n${RODAPE} ${link} ${AVISO_NUMERO}`;
}

export function textoLembrete(dados: DadosMensagem): string {
  const [nome, servico, quando, link] = variaveisMensagem(dados);
  return `Olá! Aqui é ${nome}. Lembrete: seu horário de ${servico} é ${quando}.\n\nToque em Confirmar ou Cancelar logo abaixo.\n\n${RODAPE} ${link} ${AVISO_NUMERO}`;
}

/** Variáveis do convite de retorno: {{3}} é o link público de agendamento do salão. */
export function variaveisConviteRetorno(dados: Omit<DadosMensagem, "inicio" | "fuso">, linkAgendar: string): string[] {
  return [
    dados.nomeEstabelecimento,
    dados.nomeServico,
    linkAgendar,
    linkWhatsApp(dados.telefoneEstabelecimento),
  ];
}

export function textoConviteRetorno(dados: Omit<DadosMensagem, "inicio" | "fuso">, linkAgendar: string): string {
  const [nome, servico, agendar, link] = variaveisConviteRetorno(dados, linkAgendar);
  return `Olá! Aqui é ${nome}. Já faz um tempo desde seu último ${servico} — que tal marcar um novo horário? Agende pelo link: ${agendar}\n\n${RODAPE} ${link} ${AVISO_NUMERO}`;
}
