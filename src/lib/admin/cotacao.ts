import "server-only";

/** Usada quando a cotação do dia não pode ser buscada (sem internet, API fora do ar). */
const COTACAO_RESERVA = 5.4;
const VALIDADE_MS = 6 * 60 * 60 * 1000;

export interface CotacaoDolar {
  valor: number;
  atualizadaEm: Date | null;
  /** true = não deu para buscar a cotação do dia e o valor é o de reserva. */
  reserva: boolean;
}

let guardada: { cotacao: CotacaoDolar; buscadaEm: number } | null = null;

/** Dólar em reais (cotação de compra da AwesomeAPI, gratuita e sem chave). Guarda o valor em
 * memória por 6 horas para não chamar a API a cada página do admin. */
export async function obterCotacaoDolar(): Promise<CotacaoDolar> {
  if (guardada && Date.now() - guardada.buscadaEm < VALIDADE_MS) return guardada.cotacao;
  try {
    const resposta = await fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL", {
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!resposta.ok) throw new Error(`AwesomeAPI ${resposta.status}`);
    const dados = (await resposta.json()) as { USDBRL?: { bid?: string; create_date?: string } };
    const valor = Number(dados.USDBRL?.bid);
    if (!Number.isFinite(valor) || valor <= 0) throw new Error("cotação inválida");
    const data = dados.USDBRL?.create_date;
    const cotacao: CotacaoDolar = {
      valor,
      atualizadaEm: data ? new Date(`${data.replace(" ", "T")}-03:00`) : null,
      reserva: false,
    };
    guardada = { cotacao, buscadaEm: Date.now() };
    return cotacao;
  } catch {
    return { valor: COTACAO_RESERVA, atualizadaEm: null, reserva: true };
  }
}
