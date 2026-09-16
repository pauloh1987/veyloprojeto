import { describe, expect, it } from "vitest";
import { fromZonedTime } from "date-fns-tz";
import { calcularHorariosDisponiveis, type ConfigDiaTrabalho } from "./disponibilidade";

const FUSO = "America/Recife";

/** Constrói o instante UTC de um horário "HH:mm" numa data, no fuso de teste. */
function horario(data: string, hhmm: string): Date {
  return fromZonedTime(`${data}T${hhmm}:00`, FUSO);
}

/** "Agora" bem no passado (anterior a todas as datas usadas nos testes), para não filtrar
 * nenhum candidato por antecedência mínima. */
const AGORA_NEUTRO = new Date("2000-01-01T00:00:00Z");

function paraHorasMinutos(datas: Date[]): string[] {
  return datas.map((d) =>
    new Intl.DateTimeFormat("pt-BR", {
      timeZone: FUSO,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d),
  );
}

describe("calcularHorariosDisponiveis", () => {
  it("janela exata: oferece um único horário quando a janela livre cabe exatamente um serviço", () => {
    const configDia: ConfigDiaTrabalho = { abre: "09:00", fecha: "10:00" };

    const resultado = calcularHorariosDisponiveis({
      data: "2026-03-10",
      fuso: FUSO,
      duracaoMin: 60,
      configDia,
      bloqueios: [],
      agendamentos: [],
      agora: AGORA_NEUTRO,
    });

    expect(paraHorasMinutos(resultado)).toEqual(["09:00"]);
  });

  it("serviço que não cabe: não oferece horário quando a janela livre é menor que a duração", () => {
    const configDia: ConfigDiaTrabalho = { abre: "09:00", fecha: "10:30" };

    const resultado = calcularHorariosDisponiveis({
      data: "2026-03-10",
      fuso: FUSO,
      duracaoMin: 120,
      configDia,
      bloqueios: [],
      agendamentos: [],
      agora: AGORA_NEUTRO,
    });

    expect(resultado).toEqual([]);
  });

  it("colisão parcial no começo e no fim: recorta bloqueios que ultrapassam os limites do expediente", () => {
    const configDia: ConfigDiaTrabalho = {
      abre: "09:00",
      fecha: "18:00",
      almocoInicio: "12:00",
      almocoFim: "13:00",
    };
    const data = "2026-03-10";

    const resultado = calcularHorariosDisponiveis({
      data,
      fuso: FUSO,
      duracaoMin: 30,
      configDia,
      bloqueios: [
        { inicio: horario(data, "08:00"), fim: horario(data, "09:30") }, // começa antes de abrir
        { inicio: horario(data, "17:45"), fim: horario(data, "19:00") }, // termina depois de fechar
      ],
      agendamentos: [],
      agora: AGORA_NEUTRO,
    });

    const horas = paraHorasMinutos(resultado);
    expect(horas[0]).toBe("09:30");
    expect(horas).not.toContain("09:15");
    expect(horas).not.toContain("09:00");
    expect(horas).toContain("11:30");
    expect(horas).not.toContain("12:00");
    expect(horas).toContain("13:00");
    expect(horas[horas.length - 1]).toBe("17:15");
    expect(horas).not.toContain("17:30");
  });

  it("dia fechado: não oferece nenhum horário quando não há expediente no dia", () => {
    const resultado = calcularHorariosDisponiveis({
      data: "2026-03-08",
      fuso: FUSO,
      duracaoMin: 30,
      configDia: null,
      bloqueios: [],
      agendamentos: [],
      agora: AGORA_NEUTRO,
    });

    expect(resultado).toEqual([]);
  });

  it("dia todo bloqueado: não oferece horário quando um bloqueio cobre o expediente inteiro", () => {
    const configDia: ConfigDiaTrabalho = { abre: "09:00", fecha: "18:00" };
    const data = "2026-03-10";

    const resultado = calcularHorariosDisponiveis({
      data,
      fuso: FUSO,
      duracaoMin: 30,
      configDia,
      bloqueios: [{ inicio: horario(data, "00:00"), fim: horario(data, "23:59") }],
      agendamentos: [],
      agora: AGORA_NEUTRO,
    });

    expect(resultado).toEqual([]);
  });

  it("agendamento no limite do almoço: respeita o encontro exato das fronteiras, sem falso conflito", () => {
    const configDia: ConfigDiaTrabalho = {
      abre: "09:00",
      fecha: "18:00",
      almocoInicio: "12:00",
      almocoFim: "13:00",
    };
    const data = "2026-03-10";

    const resultado = calcularHorariosDisponiveis({
      data,
      fuso: FUSO,
      duracaoMin: 15,
      configDia,
      bloqueios: [],
      agendamentos: [
        { inicio: horario(data, "11:30"), fim: horario(data, "12:00") }, // termina exatamente onde o almoço começa
        { inicio: horario(data, "13:00"), fim: horario(data, "13:30") }, // começa exatamente onde o almoço termina
      ],
      agora: AGORA_NEUTRO,
    });

    const horas = paraHorasMinutos(resultado);
    expect(horas).toContain("11:15"); // livre logo antes do agendamento
    expect(horas).not.toContain("11:30"); // ocupado pelo agendamento
    expect(horas).not.toContain("11:45"); // ainda dentro do agendamento
    expect(horas).not.toContain("12:00"); // início do almoço
    expect(horas).not.toContain("12:45"); // ainda almoço
    expect(horas).not.toContain("13:00"); // ocupado pelo segundo agendamento
    expect(horas).toContain("13:30"); // livre logo depois do segundo agendamento
  });

  it("virada de horário de verão: mantém o offset de Recife estável (-03:00) na data em que o restante do país mudou de horário", () => {
    // Pernambuco/Recife não observa horário de verão desde a década de 1990; em 17/02/2019
    // o resto do Brasil que ainda tinha DST voltou ao horário padrão. Este teste garante que
    // o motor usa a regra real do fuso America/Recife (sempre UTC-3) e não um deslocamento
    // genérico de "horário de verão brasileiro" que afetaria Recife indevidamente.
    const configDia: ConfigDiaTrabalho = { abre: "09:00", fecha: "10:00" };

    const antes = calcularHorariosDisponiveis({
      data: "2019-02-16",
      fuso: FUSO,
      duracaoMin: 30,
      configDia,
      bloqueios: [],
      agendamentos: [],
      agora: AGORA_NEUTRO,
    });
    const depois = calcularHorariosDisponiveis({
      data: "2019-02-18",
      fuso: FUSO,
      duracaoMin: 30,
      configDia,
      bloqueios: [],
      agendamentos: [],
      agora: AGORA_NEUTRO,
    });

    expect(antes[0].toISOString()).toBe("2019-02-16T12:00:00.000Z");
    expect(depois[0].toISOString()).toBe("2019-02-18T12:00:00.000Z");
  });

  it("nunca oferece horário no passado nem abaixo da antecedência mínima configurável", () => {
    const configDia: ConfigDiaTrabalho = { abre: "09:00", fecha: "18:00" };
    const data = "2026-03-10";
    // "Agora" é 10:50 no fuso de Recife; com antecedência mínima de 2h, só a partir das 12:50.
    const agora = horario(data, "10:50");

    const resultado = calcularHorariosDisponiveis({
      data,
      fuso: FUSO,
      duracaoMin: 15,
      configDia,
      bloqueios: [],
      agendamentos: [],
      agora,
      antecedenciaMinMin: 120,
    });

    // A grade de horários segue passos de 15min a partir das 09:00, então o primeiro
    // candidato a partir das 12:50 (limite de antecedência) é 13:00, não 12:50 em si.
    const horas = paraHorasMinutos(resultado);
    expect(horas).not.toContain("09:00");
    expect(horas).not.toContain("12:45");
    expect(horas[0]).toBe("13:00");
  });
});
