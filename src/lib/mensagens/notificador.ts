import type { CanalMensagem } from "@prisma/client";

export interface EnvioMensagem {
  canal: CanalMensagem;
  destinatario: string;
  texto: string;
}

export interface ResultadoEnvio {
  sucesso: boolean;
  erro?: string;
}

/** Camada de envio de mensagens. Trocar a implementação (ex. plugar um provedor real de
 * SMS/e-mail) não deve exigir nenhuma mudança no resto do sistema. */
export interface Notificador {
  enviar(mensagem: EnvioMensagem): Promise<ResultadoEnvio>;
}

/** Implementação padrão: grava no banco (feito pelo chamador) e ecoa no console, para que o
 * envio seja visível ao rodar `npm run dev` sem precisar de nenhum provedor externo. */
export class NotificadorConsole implements Notificador {
  async enviar(mensagem: EnvioMensagem): Promise<ResultadoEnvio> {
    console.log(
      `[Veylo] ${mensagem.canal} -> ${mensagem.destinatario}: ${mensagem.texto}`,
    );
    return { sucesso: true };
  }
}

/** Implementação vazia (não faz nada), pronta para ligar um provedor real depois sem tocar
 * no resto do código: basta trocar `notificadorPadrao` por uma nova implementação. */
export class NotificadorNulo implements Notificador {
  async enviar(): Promise<ResultadoEnvio> {
    return { sucesso: true };
  }
}

export const notificadorPadrao: Notificador = new NotificadorConsole();
