import { describe, expect, it } from "vitest";
import { clientesSumidas, resumirDesempenho, type AgendamentoDoRelatorio } from "./desempenho";

const fuso = "America/Recife";
const inicioDoMes = new Date("2026-10-01T03:00:00Z");

function ag(dados: Partial<Omit<AgendamentoDoRelatorio, "inicio">> & { inicio: string }): AgendamentoDoRelatorio {
  return {
    status: "ATENDIDO",
    origem: "LINK",
    clienteId: "c1",
    servicoId: "s1",
    profissionalId: "p1",
    valorTotalCentavos: null,
    servico: { nome: "Esmaltação", precoCentavos: 5000 },
    profissional: { nome: "Ana" },
    cliente: { nome: "Carla" },
    ...dados,
    inicio: new Date(dados.inicio),
  };
}

describe("desempenho do mês", () => {
  const agendamentos = [
    // sábado 10/10, 9h e 10h em Recife
    ag({ inicio: "2026-10-10T12:00:00Z", valorTotalCentavos: 8000 }),
    ag({ inicio: "2026-10-10T13:00:00Z", clienteId: "c2", cliente: { nome: "Bia" }, origem: "MANUAL" }),
    ag({ inicio: "2026-10-12T13:00:00Z", clienteId: "c2", cliente: { nome: "Bia" }, status: "FALTOU" }),
    ag({ inicio: "2026-10-13T13:00:00Z", status: "CANCELADO" }),
  ];
  const primeiraVisita = new Map([
    ["c1", new Date("2026-08-01T12:00:00Z")],
    ["c2", new Date("2026-10-10T13:00:00Z")],
  ]);
  const r = resumirDesempenho(agendamentos, fuso, primeiraVisita, inicioDoMes);

  it("conta atendimentos, valor cobrado e ticket médio", () => {
    expect(r.atendimentos).toBe(2);
    expect(r.valorCentavos).toBe(13000);
    expect(r.ticketMedioCentavos).toBe(6500);
  });

  it("taxa de falta sobre os concluídos, sem os cancelados", () => {
    expect(r.faltas).toBe(1);
    expect(r.taxaFalta).toBeCloseTo(33.33, 1);
  });

  it("separa cliente nova de quem voltou", () => {
    expect(r.clientesAtendidas).toBe(2);
    expect(r.clientesNovas).toBe(1);
  });

  it("quanto veio pelo link, sem os cancelados", () => {
    expect(r.pelaLinkPercentual).toBeCloseTo(66.67, 1);
  });

  it("horário e dia da semana no fuso do salão", () => {
    expect(r.horarios[0]).toEqual({ hora: 10, qtd: 2 });
    expect(r.diasDaSemana[6].qtd).toBe(2);
  });

  it("profissional com atendimentos, faltas e ticket", () => {
    expect(r.profissionais[0]).toMatchObject({ atendimentos: 2, faltas: 1, ticketMedioCentavos: 6500 });
  });

  it("melhores clientes pelo valor", () => {
    expect(r.melhoresClientes[0]).toMatchObject({ nome: "Carla", valorCentavos: 8000 });
  });
});

describe("clientes que sumiram", () => {
  const agora = new Date("2026-10-08T12:00:00Z");
  const dias = (n: number) => new Date(agora.getTime() - n * 24 * 60 * 60 * 1000);

  it("mais de 45 dias sem vir e sem horário marcado, das mais recentes", () => {
    const lista = clientesSumidas(
      [
        { clienteId: "a", ultima: dias(30) },
        { clienteId: "b", ultima: dias(90) },
        { clienteId: "c", ultima: dias(50) },
        { clienteId: "d", ultima: dias(60) },
        { clienteId: "e", ultima: dias(400) },
      ],
      new Set(["d"]),
      agora,
    );
    expect(lista.map((c) => c.clienteId)).toEqual(["c", "b"]);
  });
});
