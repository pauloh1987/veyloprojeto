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

/** Link de conversa com o WhatsApp do próprio salão. As mensagens saem de um número único da
 * Veylo (que só envia avisos) — qualquer conversa de verdade precisa ir pro número do salão. */
export function linkWhatsAppEstabelecimento(telefone: string): string {
  const digitos = somenteDigitos(telefone);
  return `https://wa.me/${digitos.startsWith("55") && digitos.length > 11 ? digitos : `55${digitos}`}`;
}

/** Base pública do site pra links montados fora de uma requisição (fila, cron). A Netlify
 * define `URL` com o domínio principal do site. */
export function urlBaseSite(): string {
  return (process.env.URL ?? "http://localhost:3000").replace(/\/$/, "");
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
    linkWhatsAppEstabelecimento(dados.telefoneEstabelecimento),
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
    linkWhatsAppEstabelecimento(dados.telefoneEstabelecimento),
  ];
}

export function textoConviteRetorno(dados: Omit<DadosMensagem, "inicio" | "fuso">, linkAgendar: string): string {
  const [nome, servico, agendar, link] = variaveisConviteRetorno(dados, linkAgendar);
  return `Olá! Aqui é ${nome}. Já faz um tempo desde seu último ${servico} — que tal marcar um novo horário? Agende pelo link: ${agendar}\n\n${RODAPE} ${link} ${AVISO_NUMERO}`;
}
