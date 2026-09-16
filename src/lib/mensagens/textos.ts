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

export function textoConfirmacao(dados: DadosMensagem): string {
  const quando = dataHoraFormatada(dados.inicio, dados.fuso);
  return `${dados.nomeEstabelecimento}: seu horário de ${dados.nomeServico} foi agendado para ${quando}. Responda esta mensagem para confirmar ou cancelar.`;
}

export function textoLembrete(dados: DadosMensagem): string {
  const quando = dataHoraFormatada(dados.inicio, dados.fuso);
  return `${dados.nomeEstabelecimento}: lembrando do seu horário de ${dados.nomeServico} em ${quando}. Responda esta mensagem para confirmar ou cancelar.`;
}

export function textoConviteRetorno(dados: DadosMensagem): string {
  return `${dados.nomeEstabelecimento}: já faz um tempo desde seu último ${dados.nomeServico}! Que tal agendar um novo horário? Responda esta mensagem para combinarmos.`;
}
