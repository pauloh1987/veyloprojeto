import { fromZonedTime } from "date-fns-tz";

export interface FaixaHoraria {
  inicio: Date;
  fim: Date;
}

export interface ConfigDiaTrabalho {
  abre: string;
  fecha: string;
  almocoInicio?: string | null;
  almocoFim?: string | null;
}

export interface CalcularHorariosDisponiveisParams {
  /** Data alvo no calendário do fuso informado, no formato "yyyy-MM-dd". */
  data: string;
  /** Fuso IANA do estabelecimento, ex. "America/Recife". */
  fuso: string;
  duracaoMin: number;
  /** Configuração do dia da semana correspondente a `data`; `null` quando o dia está fechado. */
  configDia: ConfigDiaTrabalho | null;
  bloqueios: FaixaHoraria[];
  agendamentos: FaixaHoraria[];
  /** Instante atual, injetado explicitamente para manter a função pura e testável. */
  agora: Date;
  antecedenciaMinMin?: number;
  passoMin?: number;
}

const ANTECEDENCIA_PADRAO_MIN = 120;
const PASSO_PADRAO_MIN = 15;

/**
 * Converte um horário local ("HH:mm") de uma data específica, em um fuso IANA, para o
 * instante UTC correspondente. Usa a regra real do fuso (via Intl/tz database), então
 * datas com deslocamento diferente (ex. mudanças históricas de horário de verão) são
 * resolvidas corretamente sem depender do fuso da máquina que executa o código.
 */
function horaLocalParaInstante(data: string, horaHHmm: string, fuso: string): Date {
  return fromZonedTime(`${data}T${horaHHmm}:00`, fuso);
}

/** Recorta faixas aos limites do expediente, ordena e mescla as que se sobrepõem ou se tocam. */
function normalizarFaixasOcupadas(
  faixas: FaixaHoraria[],
  limiteInicio: Date,
  limiteFim: Date,
): FaixaHoraria[] {
  const recortadas = faixas
    .map((faixa) => ({
      inicio: faixa.inicio < limiteInicio ? limiteInicio : faixa.inicio,
      fim: faixa.fim > limiteFim ? limiteFim : faixa.fim,
    }))
    .filter((faixa) => faixa.inicio.getTime() < faixa.fim.getTime())
    .sort((a, b) => a.inicio.getTime() - b.inicio.getTime());

  const mescladas: FaixaHoraria[] = [];
  for (const faixa of recortadas) {
    const anterior = mescladas.at(-1);
    if (anterior && faixa.inicio.getTime() <= anterior.fim.getTime()) {
      if (faixa.fim.getTime() > anterior.fim.getTime()) {
        anterior.fim = faixa.fim;
      }
    } else {
      mescladas.push({ ...faixa });
    }
  }
  return mescladas;
}

/** Calcula os intervalos livres entre o início/fim do expediente e as faixas ocupadas (já mescladas). */
function calcularJanelasLivres(
  expedienteInicio: Date,
  expedienteFim: Date,
  ocupadas: FaixaHoraria[],
): FaixaHoraria[] {
  const livres: FaixaHoraria[] = [];
  let cursor = expedienteInicio;

  for (const ocupada of ocupadas) {
    if (ocupada.inicio.getTime() > cursor.getTime()) {
      livres.push({ inicio: cursor, fim: ocupada.inicio });
    }
    if (ocupada.fim.getTime() > cursor.getTime()) {
      cursor = ocupada.fim;
    }
  }

  if (cursor.getTime() < expedienteFim.getTime()) {
    livres.push({ inicio: cursor, fim: expedienteFim });
  }

  return livres;
}

/**
 * Motor de cálculo de horários disponíveis. Função pura: não acessa banco de dados nem
 * relógio do sistema — tudo que precisa (horário de funcionamento do dia, bloqueios,
 * agendamentos existentes e o instante "agora") é recebido como parâmetro.
 *
 * Regras aplicadas, nesta ordem: parte do expediente do dia da semana; remove o intervalo
 * de almoço; remove bloqueios e agendamentos que colidem; gera candidatos em passos de
 * `passoMin` a partir do início de cada janela livre, oferecendo apenas horários em que o
 * serviço inteiro cabe; descarta candidatos a menos de `antecedenciaMinMin` do instante atual.
 */
export function calcularHorariosDisponiveis(
  params: CalcularHorariosDisponiveisParams,
): Date[] {
  const {
    data,
    fuso,
    duracaoMin,
    configDia,
    bloqueios,
    agendamentos,
    agora,
    antecedenciaMinMin = ANTECEDENCIA_PADRAO_MIN,
    passoMin = PASSO_PADRAO_MIN,
  } = params;

  if (!configDia) return [];

  const expedienteInicio = horaLocalParaInstante(data, configDia.abre, fuso);
  const expedienteFim = horaLocalParaInstante(data, configDia.fecha, fuso);
  if (expedienteFim.getTime() <= expedienteInicio.getTime()) return [];

  const ocupadasBrutas: FaixaHoraria[] = [...bloqueios, ...agendamentos];
  if (configDia.almocoInicio && configDia.almocoFim) {
    ocupadasBrutas.push({
      inicio: horaLocalParaInstante(data, configDia.almocoInicio, fuso),
      fim: horaLocalParaInstante(data, configDia.almocoFim, fuso),
    });
  }

  const ocupadas = normalizarFaixasOcupadas(ocupadasBrutas, expedienteInicio, expedienteFim);
  const janelasLivres = calcularJanelasLivres(expedienteInicio, expedienteFim, ocupadas);

  const limiteAntecedencia = agora.getTime() + antecedenciaMinMin * 60_000;
  const duracaoMs = duracaoMin * 60_000;
  const passoMs = passoMin * 60_000;

  const horarios: Date[] = [];
  for (const janela of janelasLivres) {
    let candidatoMs = janela.inicio.getTime();
    const fimJanelaMs = janela.fim.getTime();
    while (candidatoMs + duracaoMs <= fimJanelaMs) {
      if (candidatoMs >= limiteAntecedencia) {
        horarios.push(new Date(candidatoMs));
      }
      candidatoMs += passoMs;
    }
  }

  return horarios;
}
