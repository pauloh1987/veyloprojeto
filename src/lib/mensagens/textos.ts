import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";

interface DadosMensagem {
  nomeEstabelecimento: string;
  nomeServico: string;
  inicio: Date;
  fuso: string;
}

function dataHoraFormatada(inicio: Date, fuso: string): string {
  return formatInTimeZone(inicio, fuso, "EEEE, d 'de' MMMM 'às' HH:mm", {
    locale: ptBR,
  });
}

/** Mesmos dados usados para montar o texto em português, na ordem em que preenchem os
 * placeholders {{1}}, {{2}}, {{3}} dos templates aprovados na Meta para WhatsApp — extraído
 * à parte pra garantir que o texto (SMS/console) e as variáveis (WhatsApp) nunca fiquem
 * dessincronizados. Ver os templates de referência em DECISOES.md. */
export function variaveisMensagem(dados: DadosMensagem): string[] {
  return [dados.nomeEstabelecimento, dados.nomeServico, dataHoraFormatada(dados.inicio, dados.fuso)];
}

export function textoConfirmacao(dados: DadosMensagem): string {
  const quando = dataHoraFormatada(dados.inicio, dados.fuso);
  return `${dados.nomeEstabelecimento}: seu horário de ${dados.nomeServico} foi agendado para ${quando}. Responda esta mensagem para confirmar ou cancelar.`;
}

export function textoPedidoRecebido(dados: DadosMensagem): string {
  const quando = dataHoraFormatada(dados.inicio, dados.fuso);
  return `${dados.nomeEstabelecimento}: recebemos seu pedido de horário para ${dados.nomeServico} em ${quando}. Vamos confirmar em breve — responda esta mensagem se precisar cancelar.`;
}

export function textoLembrete(dados: DadosMensagem): string {
  const quando = dataHoraFormatada(dados.inicio, dados.fuso);
  return `${dados.nomeEstabelecimento}: lembrando do seu horário de ${dados.nomeServico} em ${quando}. Responda esta mensagem para confirmar ou cancelar.`;
}

export function textoConviteRetorno(dados: DadosMensagem): string {
  return `${dados.nomeEstabelecimento}: já faz um tempo desde seu último ${dados.nomeServico}! Que tal agendar um novo horário? Responda esta mensagem para combinarmos.`;
}
