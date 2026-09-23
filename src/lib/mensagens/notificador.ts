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

/** `Cliente.telefone` é guardado só com dígitos, no formato local (DDD + número, ex.
 * "81991234567") — provedores de SMS exigem E.164 (+ código do país). Assume Brasil porque
 * todo o resto do sistema (máscara de telefone, fuso padrão) já assume isso. */
function paraE164Brasil(telefoneDigitos: string): string {
  return telefoneDigitos.startsWith("+") ? telefoneDigitos : `+55${telefoneDigitos}`;
}

/** Envia SMS de verdade via Twilio (https://www.twilio.com) — a mensagem chega no celular da
 * cliente. Só é usado quando as três variáveis de ambiente abaixo existem; sem elas, o
 * sistema volta sozinho pro NotificadorConsole (ver `criarNotificadorPadrao`), então não tem
 * como isso quebrar o ambiente local nem um deploy que ainda não configurou a Twilio.
 * WhatsApp de verdade (não o modo sandbox de teste) fica pra depois: exige verificação de
 * empresa pela Meta, que não é algo que se resolve escrevendo código. */
export class NotificadorTwilio implements Notificador {
  constructor(
    private readonly accountSid: string,
    private readonly authToken: string,
    private readonly numeroOrigem: string,
  ) {}

  async enviar(mensagem: EnvioMensagem): Promise<ResultadoEnvio> {
    const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString("base64");
    const corpo = new URLSearchParams({
      To: paraE164Brasil(mensagem.destinatario),
      From: this.numeroOrigem,
      Body: mensagem.texto,
    });

    try {
      const resposta = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: corpo,
      });

      if (!resposta.ok) {
        const detalhe = await resposta.text();
        return { sucesso: false, erro: `Twilio ${resposta.status}: ${detalhe.slice(0, 300)}` };
      }
      return { sucesso: true };
    } catch (erro) {
      return { sucesso: false, erro: erro instanceof Error ? erro.message : "Falha ao enviar SMS." };
    }
  }
}

/** Usa Twilio de verdade quando as credenciais existem (variáveis de ambiente); continua no
 * NotificadorConsole (só ecoa no console) enquanto não existirem — é assim que o ambiente
 * local e qualquer deploy sem as credenciais configuradas continuam funcionando exatamente
 * como antes, sem precisar de nenhuma mudança de código quando a Twilio for configurada. */
function criarNotificadorPadrao(): Notificador {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER } = process.env;
  if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM_NUMBER) {
    return new NotificadorTwilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER);
  }
  return new NotificadorConsole();
}

export const notificadorPadrao: Notificador = criarNotificadorPadrao();
