import { describe, expect, it } from "vitest";
import { situacaoResposta, textoParaConfirmarHorario } from "./situacaoResposta";

const FUSO = "America/Recife";
const agora = new Date("2026-10-02T12:00:00-03:00");
const daquiDuasHoras = new Date("2026-10-02T14:00:00-03:00");
const umAvisoEnviado = [{ id: "m1" }];

describe("situação da resposta da cliente", () => {
  it("sem resposta: aviso com botões enviado, sem confirmação, antes do fim do horário", () => {
    expect(
      situacaoResposta({ status: "CONFIRMADO", fim: daquiDuasHoras, presencaConfirmadaEm: null, mensagens: umAvisoEnviado }, agora),
    ).toBe("semResposta");
  });

  it("sem aviso enviado ainda, não marca nada", () => {
    expect(situacaoResposta({ status: "CONFIRMADO", fim: daquiDuasHoras, presencaConfirmadaEm: null, mensagens: [] }, agora)).toBeNull();
  });

  it("depois do fim do horário, o selo some (a dona marca atendido ou faltou)", () => {
    const fimPassado = new Date("2026-10-02T11:00:00-03:00");
    expect(
      situacaoResposta({ status: "CONFIRMADO", fim: fimPassado, presencaConfirmadaEm: null, mensagens: umAvisoEnviado }, agora),
    ).toBeNull();
  });

  it("quem confirmou aparece como confirmou, inclusive depois de atendida", () => {
    const confirmouEm = new Date("2026-10-01T18:00:00-03:00");
    expect(
      situacaoResposta({ status: "CONFIRMADO", fim: daquiDuasHoras, presencaConfirmadaEm: confirmouEm, mensagens: umAvisoEnviado }, agora),
    ).toBe("confirmou");
    expect(
      situacaoResposta({ status: "ATENDIDO", fim: daquiDuasHoras, presencaConfirmadaEm: confirmouEm, mensagens: umAvisoEnviado }, agora),
    ).toBe("confirmou");
  });

  it("cancelado ou já concluído não mostra selo de resposta pendente", () => {
    expect(
      situacaoResposta({ status: "CANCELADO", fim: daquiDuasHoras, presencaConfirmadaEm: null, mensagens: umAvisoEnviado }, agora),
    ).toBeNull();
    expect(
      situacaoResposta({ status: "FALTOU", fim: daquiDuasHoras, presencaConfirmadaEm: null, mensagens: umAvisoEnviado }, agora),
    ).toBeNull();
  });
});

describe("mensagem para a dona chamar a cliente", () => {
  it("fala hoje, amanhã ou a data, com o primeiro nome", () => {
    const base = { nomeCliente: "Thais Ribeiro", servico: "Manutenção", fuso: FUSO };
    expect(textoParaConfirmarHorario({ ...base, inicio: daquiDuasHoras }, agora)).toBe(
      "Oi, Thais! Tudo bem? Passando para confirmar seu horário de Manutenção hoje às 14:00. Posso confirmar?",
    );
    expect(textoParaConfirmarHorario({ ...base, inicio: new Date("2026-10-03T09:30:00-03:00") }, agora)).toContain("amanhã às 09:30");
    expect(textoParaConfirmarHorario({ ...base, inicio: new Date("2026-10-06T16:00:00-03:00") }, agora)).toContain("no dia 06/10 às 16:00");
  });
});
