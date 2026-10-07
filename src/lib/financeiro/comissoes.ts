import { formatInTimeZone } from "date-fns-tz";
import { formatarCentavos } from "../formatadores";
import { valorDoAtendimento } from "./fechamento";

/**
 * Comissão das profissionais: um percentual sobre o valor cobrado nos atendimentos finalizados
 * (serviço + adicionais), contado pelo dia do atendimento. Vale o percentual guardado no
 * atendimento quando ele foi finalizado; sem ele, o percentual atual da profissional. Regras sem
 * banco, para dar para testar; quem carrega os dados é src/lib/financeiro/dadosFinanceiro.ts.
 */

/** Percentual que vale para um atendimento; null = sem comissão. */
export function percentualDaComissao(
  atendimento: { comissaoPercentual: number | null },
  profissional: { comissaoPercentual: number | null },
): number | null {
  return atendimento.comissaoPercentual ?? profissional.comissaoPercentual;
}

/** Comissão de um atendimento, arredondada ao centavo. A comissão do mês é a soma dessas, para a
 * lista de atendimentos sempre bater com o total. */
export function valorDaComissao(valorCentavos: number, percentual: number): number {
  return Math.round((valorCentavos * percentual) / 100);
}

/** Soma a comissão de vários atendimentos, cada um com o seu percentual. `temComissao` é falso
 * quando nenhum deles tem percentual (a profissional não ganha por comissão). */
export function somarComissoes(itens: { valorCentavos: number; percentual: number | null }[]): {
  centavos: number;
  percentuais: number[];
  temComissao: boolean;
} {
  let centavos = 0;
  const percentuais = new Set<number>();
  for (const item of itens) {
    if (item.percentual === null) continue;
    centavos += valorDaComissao(item.valorCentavos, item.percentual);
    percentuais.add(item.percentual);
  }
  return { centavos, percentuais: [...percentuais].sort((a, b) => a - b), temComissao: percentuais.size > 0 };
}

/** "40%" ou, se a comissão mudou no meio do mês, "40% e 50%". */
export function rotuloPercentuais(percentuais: number[]): string {
  const textos = percentuais.map((p) => `${p}%`);
  if (textos.length <= 1) return textos[0] ?? "";
  return `${textos.slice(0, -1).join(", ")} e ${textos[textos.length - 1]}`;
}

export interface ProfissionalParaComissao {
  id: string;
  nome: string;
  ativo: boolean;
  comissaoPercentual: number | null;
}

export interface AtendimentoParaComissao {
  id: string;
  profissionalId: string;
  inicio: Date;
  comissaoPercentual: number | null;
  valorTotalCentavos: number | null;
  servico: { nome: string; precoCentavos: number };
  cliente: { nome: string };
}

export interface PagamentoDeComissao {
  id: string;
  profissionalId: string;
  valorCentavos: number;
  pagoEm: Date;
  observacao: string;
}

export interface AtendimentoComissionado {
  id: string;
  inicio: Date;
  clienteNome: string;
  servicoNome: string;
  valorCentavos: number;
  percentual: number | null;
  comissaoCentavos: number;
}

export interface ComissaoDaProfissional {
  profissionalId: string;
  nome: string;
  /** Comissão atual dela (tela Profissionais); null = sem comissão definida. */
  percentualAtual: number | null;
  /** Percentuais que valeram nos atendimentos do mês (mais de um se a comissão mudou no meio). */
  percentuais: number[];
  /** Ganha por comissão: tem comissão definida ou algum atendimento do mês com percentual. */
  temComissao: boolean;
  /** Atendimentos finalizados no mês, do mais antigo ao mais recente. */
  atendimentos: AtendimentoComissionado[];
  /** Valor atendido no mês (a base da comissão). */
  baseCentavos: number;
  comissaoCentavos: number;
  /** Acertos já feitos da comissão do mês, do mais antigo ao mais recente. */
  pagamentos: PagamentoDeComissao[];
  pagoCentavos: number;
  faltaCentavos: number;
  /** Pago acima da comissão (ex.: vale maior que o que ela fez no mês). */
  pagoAMaisCentavos: number;
}

/** Comissão de cada profissional no mês. Entra quem atendeu no mês, quem recebeu algum acerto e
 * quem está ativa com comissão definida (mesmo sem atendimento ainda). Quem ganha por comissão vem
 * primeiro, da maior comissão para a menor; depois quem não ganha, pelo valor atendido. */
export function resumirComissoes(dados: {
  profissionais: ProfissionalParaComissao[];
  atendimentos: AtendimentoParaComissao[];
  pagamentos: PagamentoDeComissao[];
}): ComissaoDaProfissional[] {
  const resumos: ComissaoDaProfissional[] = [];

  for (const profissional of dados.profissionais) {
    const atendimentos: AtendimentoComissionado[] = dados.atendimentos
      .filter((a) => a.profissionalId === profissional.id)
      .sort((a, b) => a.inicio.getTime() - b.inicio.getTime())
      .map((a) => {
        const valorCentavos = valorDoAtendimento(a);
        const percentual = percentualDaComissao(a, profissional);
        return {
          id: a.id,
          inicio: a.inicio,
          clienteNome: a.cliente.nome,
          servicoNome: a.servico.nome,
          valorCentavos,
          percentual,
          comissaoCentavos: percentual === null ? 0 : valorDaComissao(valorCentavos, percentual),
        };
      });
    const pagamentos = dados.pagamentos
      .filter((p) => p.profissionalId === profissional.id)
      .sort((a, b) => a.pagoEm.getTime() - b.pagoEm.getTime());

    const temComissaoDefinida = profissional.ativo && profissional.comissaoPercentual !== null;
    if (atendimentos.length === 0 && pagamentos.length === 0 && !temComissaoDefinida) continue;

    const soma = somarComissoes(atendimentos);
    const pagoCentavos = pagamentos.reduce((total, p) => total + p.valorCentavos, 0);
    resumos.push({
      profissionalId: profissional.id,
      nome: profissional.nome,
      percentualAtual: profissional.comissaoPercentual,
      percentuais: soma.percentuais,
      temComissao: soma.temComissao || profissional.comissaoPercentual !== null || pagamentos.length > 0,
      atendimentos,
      baseCentavos: atendimentos.reduce((total, a) => total + a.valorCentavos, 0),
      comissaoCentavos: soma.centavos,
      pagamentos,
      pagoCentavos,
      faltaCentavos: Math.max(0, soma.centavos - pagoCentavos),
      pagoAMaisCentavos: Math.max(0, pagoCentavos - soma.centavos),
    });
  }

  return resumos.sort((a, b) => {
    if (a.temComissao !== b.temComissao) return a.temComissao ? -1 : 1;
    if (a.temComissao) return b.comissaoCentavos - a.comissaoCentavos || b.baseCentavos - a.baseCentavos;
    return b.baseCentavos - a.baseCentavos;
  });
}

/** Resumo da comissão do mês para a dona mandar à profissional pelo WhatsApp. */
export function textoResumoComissao(resumo: ComissaoDaProfissional, rotuloMes: string, fuso: string): string {
  const quantidade = resumo.atendimentos.length;
  const percentual =
    resumo.percentuais.length > 0
      ? rotuloPercentuais(resumo.percentuais)
      : resumo.percentualAtual !== null
        ? `${resumo.percentualAtual}%`
        : "";
  const linhas = [
    `Comissão de ${rotuloMes} – ${resumo.nome}`,
    quantidade === 0
      ? "Nenhum atendimento finalizado no mês."
      : `${quantidade} ${quantidade === 1 ? "atendimento" : "atendimentos"}: ${formatarCentavos(resumo.baseCentavos)}`,
    `Comissão${percentual ? ` (${percentual})` : ""}: ${formatarCentavos(resumo.comissaoCentavos)}`,
  ];
  if (resumo.pagamentos.length > 0) {
    linhas.push(`Já pago: ${formatarCentavos(resumo.pagoCentavos)}`);
    for (const p of resumo.pagamentos) {
      linhas.push(`• ${formatInTimeZone(p.pagoEm, fuso, "dd/MM")}: ${formatarCentavos(p.valorCentavos)}${p.observacao ? ` (${p.observacao})` : ""}`);
    }
  }
  if (resumo.pagoAMaisCentavos > 0) linhas.push(`Pago a mais: ${formatarCentavos(resumo.pagoAMaisCentavos)}`);
  else if (resumo.faltaCentavos > 0) linhas.push(`Falta pagar: ${formatarCentavos(resumo.faltaCentavos)}`);
  else if (resumo.comissaoCentavos > 0) linhas.push("Tudo pago.");
  return linhas.join("\n");
}

/** Totais da equipe: comissão do mês, já pago e o que falta pagar. */
export function totaisDasComissoes(resumos: ComissaoDaProfissional[]): {
  comissaoCentavos: number;
  pagoCentavos: number;
  faltaCentavos: number;
} {
  return resumos.reduce(
    (totais, r) => ({
      comissaoCentavos: totais.comissaoCentavos + r.comissaoCentavos,
      pagoCentavos: totais.pagoCentavos + r.pagoCentavos,
      faltaCentavos: totais.faltaCentavos + r.faltaCentavos,
    }),
    { comissaoCentavos: 0, pagoCentavos: 0, faltaCentavos: 0 },
  );
}
