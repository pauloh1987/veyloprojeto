/** Guia "Comece por aqui": os passos que levam um negócio recém-cadastrado até o primeiro
 * agendamento pelo link. Aparece no topo da tela Hoje para a dona até ela esconder o guia.
 * Este arquivo não acessa o banco, para servir também ao componente do guia no navegador. */

export type DestinoPassoGuia =
  | { tipo: "tela"; href: string; rotulo: string }
  | { tipo: "link-publico"; rotulo: string }
  | { tipo: "copiar-link"; rotulo: string };

interface PassoGuia {
  id: string;
  titulo: string;
  descricao: string;
  /** Botão principal: leva aonde o passo é feito. */
  destino: DestinoPassoGuia;
  /** Rótulo do botão que dá o passo por feito à mão. Sem ele, o passo só se completa sozinho
   * (ex.: ao cadastrar o primeiro serviço). */
  marcarComo?: string;
}

const DEFINICOES = [
  {
    id: "marca",
    titulo: "Coloque sua marca",
    descricao: "Envie a logo e escolha a cor da sua página de agendamento.",
    destino: { tipo: "tela", href: "/painel/configuracoes", rotulo: "Enviar logo" },
    marcarComo: "Não tenho logo",
  },
  {
    id: "whatsapp",
    titulo: "Confira seu número de WhatsApp",
    descricao: "Quem agenda recebe este número nas mensagens automáticas, para falar com você.",
    destino: { tipo: "tela", href: "/painel/configuracoes", rotulo: "Trocar número" },
    marcarComo: "Está certo",
  },
  {
    id: "servicos",
    titulo: "Cadastre seus serviços",
    descricao: "Com nome, duração e preço. É o que se escolhe na hora de agendar.",
    destino: { tipo: "tela", href: "/painel/servicos", rotulo: "Cadastrar serviços" },
  },
  {
    id: "horarios",
    titulo: "Ajuste os dias e horários",
    descricao:
      "A agenda começa de segunda a sábado, das 9h às 18h, com almoço das 12h às 13h. Mude o que for diferente.",
    destino: { tipo: "tela", href: "/painel/horarios", rotulo: "Ajustar horários" },
    marcarComo: "Está certo",
  },
  {
    id: "equipe",
    titulo: "Adicione sua equipe",
    descricao: "Se mais alguém atende, cadastre aqui. Cada pessoa ganha a própria agenda.",
    destino: { tipo: "tela", href: "/painel/profissionais", rotulo: "Adicionar profissional" },
    marcarComo: "Só eu atendo",
  },
  {
    id: "teste",
    titulo: "Faça um agendamento de teste",
    descricao: "Abra seu link e marque um horário como se fosse cliente. Depois é só cancelar na Agenda.",
    destino: { tipo: "link-publico", rotulo: "Abrir meu link" },
  },
  {
    id: "divulgar",
    titulo: "Coloque o link na bio do Instagram",
    descricao: "Assim dá para agendar com você a qualquer hora, sem troca de mensagens.",
    destino: { tipo: "copiar-link", rotulo: "Copiar link" },
    marcarComo: "Já coloquei",
  },
] as const satisfies readonly PassoGuia[];

export type IdPassoGuia = (typeof DEFINICOES)[number]["id"];

export const PASSOS_GUIA: readonly (PassoGuia & { id: IdPassoGuia })[] = DEFINICOES;

export function ehIdPassoGuia(valor: string): valor is IdPassoGuia {
  return PASSOS_GUIA.some((passo) => passo.id === valor);
}

/** Passos que têm botão para marcar à mão (os únicos que a ação do guia aceita). */
export function ehPassoMarcavel(valor: string): valor is IdPassoGuia {
  return PASSOS_GUIA.some((passo) => passo.id === valor && passo.marcarComo);
}

/** Lê `Estabelecimento.guiaPassos` ("marca,horarios"), ignorando ids desconhecidos. */
export function lerPassosMarcados(texto: string): Set<IdPassoGuia> {
  return new Set(
    texto
      .split(",")
      .map((id) => id.trim())
      .filter(ehIdPassoGuia),
  );
}

/** Novo valor de `guiaPassos` com mais um passo marcado: na ordem do guia e sem repetir. */
export function comPassoMarcado(texto: string, passo: IdPassoGuia): string {
  const marcados = lerPassosMarcados(texto);
  marcados.add(passo);
  return PASSOS_GUIA.filter((p) => marcados.has(p.id))
    .map((p) => p.id)
    .join(",");
}

/** O que o banco já diz sobre o negócio, sem a dona precisar marcar nada. */
export interface SituacaoParaGuia {
  temLogo: boolean;
  servicosAtivos: number;
  profissionaisAtivas: number;
  temAgendamentoPeloLink: boolean;
}

/** Passos feitos, na ordem do guia: os que se completam sozinhos mais os marcados. */
export function passosFeitos(guiaPassos: string, situacao: SituacaoParaGuia): IdPassoGuia[] {
  const marcados = lerPassosMarcados(guiaPassos);
  const automatico: Record<IdPassoGuia, boolean> = {
    marca: situacao.temLogo,
    whatsapp: false,
    servicos: situacao.servicosAtivos > 0,
    horarios: false,
    equipe: situacao.profissionaisAtivas > 1,
    teste: situacao.temAgendamentoPeloLink,
    divulgar: false,
  };
  return PASSOS_GUIA.filter((p) => automatico[p.id] || marcados.has(p.id)).map((p) => p.id);
}
