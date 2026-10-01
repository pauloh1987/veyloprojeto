import { describe, expect, it } from "vitest";
import { comPassoMarcado, ehPassoMarcavel, lerPassosMarcados, passosFeitos, type SituacaoParaGuia } from "./passos";

const NEGOCIO_NOVO: SituacaoParaGuia = {
  temLogo: false,
  servicosAtivos: 0,
  profissionaisAtivas: 1,
  temAgendamentoPeloLink: false,
};

describe("guia Comece por aqui", () => {
  it("negócio recém-cadastrado começa sem nenhum passo feito", () => {
    expect(passosFeitos("", NEGOCIO_NOVO)).toEqual([]);
  });

  it("completa sozinho logo, serviços, equipe e agendamento de teste", () => {
    const situacao = { temLogo: true, servicosAtivos: 3, profissionaisAtivas: 2, temAgendamentoPeloLink: true };
    expect(passosFeitos("", situacao)).toEqual(["marca", "servicos", "equipe", "teste"]);
  });

  it("uma profissional só não completa a equipe; o botão Só eu atendo completa", () => {
    expect(passosFeitos("", NEGOCIO_NOVO)).not.toContain("equipe");
    expect(passosFeitos("equipe", NEGOCIO_NOVO)).toEqual(["equipe"]);
  });

  it("junta os marcados à mão com os automáticos, na ordem do guia", () => {
    const situacao = { ...NEGOCIO_NOVO, servicosAtivos: 1 };
    expect(passosFeitos("divulgar,whatsapp", situacao)).toEqual(["whatsapp", "servicos", "divulgar"]);
  });

  it("ignora ids desconhecidos e espaços no texto salvo", () => {
    expect([...lerPassosMarcados(" horarios, , qualquer,marca ")]).toEqual(["horarios", "marca"]);
  });

  it("marcar um passo mantém a ordem do guia e não repete", () => {
    expect(comPassoMarcado("", "horarios")).toBe("horarios");
    expect(comPassoMarcado("horarios", "whatsapp")).toBe("whatsapp,horarios");
    expect(comPassoMarcado("whatsapp,horarios", "horarios")).toBe("whatsapp,horarios");
  });

  it("só aceita marcar à mão os passos que têm botão para isso", () => {
    expect(ehPassoMarcavel("whatsapp")).toBe(true);
    expect(ehPassoMarcavel("equipe")).toBe(true);
    expect(ehPassoMarcavel("servicos")).toBe(false);
    expect(ehPassoMarcavel("teste")).toBe(false);
    expect(ehPassoMarcavel("qualquer")).toBe(false);
  });
});
