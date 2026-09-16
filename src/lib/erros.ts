/** Erros conhecidos da aplicação: mensagem segura para mostrar ao usuário, nunca um stack. */
export class ErroDeAplicacao extends Error {
  codigo: string;

  constructor(mensagem: string, codigo: string) {
    super(mensagem);
    this.name = "ErroDeAplicacao";
    this.codigo = codigo;
  }
}

export class ConflitoDeHorarioError extends ErroDeAplicacao {
  constructor() {
    super("Este horário acabou de ficar indisponível. Escolha outro horário.", "CONFLITO_HORARIO");
  }
}

export class NaoEncontradoError extends ErroDeAplicacao {
  constructor(entidade: string) {
    super(`${entidade} não encontrado.`, "NAO_ENCONTRADO");
  }
}

export class ValidacaoError extends ErroDeAplicacao {
  constructor(mensagem: string) {
    super(mensagem, "VALIDACAO");
  }
}

export class NaoAutorizadoError extends ErroDeAplicacao {
  constructor() {
    super("Você não tem permissão para fazer isso.", "NAO_AUTORIZADO");
  }
}

/** Converte qualquer erro numa mensagem segura para o usuário, sem vazar stack/detalhes internos. */
export function mensagemSeguraDeErro(erro: unknown): string {
  if (erro instanceof ErroDeAplicacao) return erro.message;
  return "Não foi possível concluir a ação. Tente novamente.";
}
