import { describe, expect, it } from "vitest";
import {
  emailCancelamento,
  emailEnderecoTrocado,
  emailNovoAgendamento,
  emailNovoEnderecoConta,
  type DadosAvisoDona,
} from "./textos";

const dados: DadosAvisoDona = {
  nomeEstabelecimento: "Studio Ana Nails",
  nomeCliente: "Mariana Souza",
  telefoneCliente: "(81) 99999-0001",
  linkWhatsAppCliente: "https://wa.me/5581999990001",
  servico: "Esmaltação em gel",
  profissional: null,
  quandoCurto: "ter, 06/10 às 14:00",
  quandoLongo: "terça-feira, 6 de outubro às 14:00",
  linkAgenda: "https://veyloagenda.com.br/painel/agenda?data=2026-10-06",
  linkConfiguracoes: "https://veyloagenda.com.br/painel/configuracoes",
};

describe("avisos por e-mail para a dona", () => {
  it("novo agendamento: assunto com a cliente e o horário, e os detalhes no corpo", () => {
    const email = emailNovoAgendamento(dados);
    expect(email.assunto).toBe("Novo agendamento: Mariana Souza, ter, 06/10 às 14:00");
    expect(email.html).toContain("Esmaltação em gel");
    expect(email.html).toContain("terça-feira, 6 de outubro às 14:00");
    expect(email.html).toContain("https://wa.me/5581999990001");
    expect(email.html).toContain("/painel/agenda?data=2026-10-06");
    expect(email.html).toContain("/painel/configuracoes");
  });

  it("cancelamento avisa que o horário ficou livre", () => {
    const email = emailCancelamento(dados);
    expect(email.assunto).toBe("Cancelamento: Mariana Souza, ter, 06/10 às 14:00");
    expect(email.html).toContain("livre de novo");
  });

  it("mostra a profissional só quando o salão tem equipe", () => {
    expect(emailNovoAgendamento(dados).html).not.toContain("Profissional");
    expect(emailNovoAgendamento({ ...dados, profissional: "Lays Monteiro" }).html).toContain("Lays Monteiro");
  });

  it("escapa o nome digitado pela cliente e tira quebras de linha do assunto", () => {
    const email = emailNovoAgendamento({ ...dados, nomeCliente: "<b>Ana</b>\nTeste" });
    expect(email.html).toContain("&lt;b&gt;Ana&lt;/b&gt;");
    expect(email.html).not.toContain("<b>Ana</b>");
    expect(email.assunto).toBe("Novo agendamento: <b>Ana</b> Teste, ter, 06/10 às 14:00");
  });
});

describe("e-mails da troca de endereço", () => {
  it("o endereço novo recebe o link de confirmação", () => {
    const email = emailNovoEnderecoConta("Studio Ana Nails", "https://veyloagenda.com.br/confirmar-email/abc");
    expect(email.assunto).toBe("Confirme seu novo e-mail — Veylo Agenda");
    expect(email.html).toContain("https://veyloagenda.com.br/confirmar-email/abc");
  });

  it("o endereço antigo é avisado de para onde foi a conta", () => {
    const email = emailEnderecoTrocado("Studio Ana Nails", "hulyanne@exemplo.com", "https://veyloagenda.com.br/login");
    expect(email.html).toContain("hulyanne@exemplo.com");
    expect(email.html).toContain("Se não foi você");
  });
});
