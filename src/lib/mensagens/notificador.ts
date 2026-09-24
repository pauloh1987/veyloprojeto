import type { CanalMensagem, TipoMensagem } from "@prisma/client";

export interface EnvioMensagem {
  canal: CanalMensagem;
  destinatario: string;
  texto: string;
  tipo: TipoMensagem;
  variaveis: string[];
}

export interface ResultadoEnvio {
  sucesso: boolean;
  erro?: string;
}

/** Camada de envio de mensagens. Trocar a implementação (ex. plugar um provedor real de
 * SMS/e-mail) não deve exigir nenhuma mudança no resto do sistema. `canal` identifica qual
 * canal esse notificador de fato usa, para gravar corretamente em `Mensagem.canal`. */
export interface Notificador {
  readonly canal: CanalMensagem;
  enviar(mensagem: EnvioMensagem): Promise<ResultadoEnvio>;
}

/** Implementação padrão: grava no banco (feito pelo chamador) e ecoa no console, para que o
 * envio seja visível ao rodar `npm run dev` sem precisar de nenhum provedor externo. */
export class NotificadorConsole implements Notificador {
  readonly canal: CanalMensagem = "SMS";

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
  readonly canal: CanalMensagem = "SMS";

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
 * como isso quebrar o ambiente local nem um deploy que ainda não configurou a Twilio. */
export class NotificadorTwilio implements Notificador {
  readonly canal: CanalMensagem = "SMS";

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

/** Templates aprovados na Meta (via Content Template Builder da Twilio) para cada tipo de
 * mensagem que este sistema de fato produz hoje (ver `fila.ts` — CONFIRMACAO, LEMBRETE e
 * CONVITE_RETORNO). */
type ContentSidsPorTipo = Partial<Record<TipoMensagem, string>>;

/** Envia WhatsApp de verdade via WhatsApp Business Platform (usando a Twilio como provedor).
 * Diferente do SMS, aqui NÃO dá pra mandar texto livre: toda mensagem que a empresa inicia
 * (é sempre o caso aqui — o cliente nunca manda um WhatsApp pra empresa antes, ele só agenda
 * pelo link público) exige um template pré-aprovado pela Meta. Por isso, em vez de `Body`,
 * o envio usa `ContentSid` (o template) + `ContentVariables` (os valores que preenchem os
 * `{{1}}`, `{{2}}`... do template). Se o template de um tipo específico ainda não foi
 * configurado, falha só aquele envio (com uma mensagem clara) — os outros tipos já
 * configurados continuam funcionando normalmente. */
export class NotificadorTwilioWhatsApp implements Notificador {
  readonly canal: CanalMensagem = "WHATSAPP";

  constructor(
    private readonly accountSid: string,
    private readonly authToken: string,
    private readonly numeroOrigem: string,
    private readonly contentSids: ContentSidsPorTipo,
  ) {}

  async enviar(mensagem: EnvioMensagem): Promise<ResultadoEnvio> {
    const contentSid = this.contentSids[mensagem.tipo];
    if (!contentSid) {
      return {
        sucesso: false,
        erro: `Nenhum template do WhatsApp configurado para "${mensagem.tipo}" (defina a variável de ambiente correspondente).`,
      };
    }

    const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString("base64");
    const contentVariables = Object.fromEntries(mensagem.variaveis.map((valor, indice) => [String(indice + 1), valor]));
    const corpo = new URLSearchParams({
      To: `whatsapp:${paraE164Brasil(mensagem.destinatario)}`,
      From: this.numeroOrigem,
      ContentSid: contentSid,
      ContentVariables: JSON.stringify(contentVariables),
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
      return { sucesso: false, erro: erro instanceof Error ? erro.message : "Falha ao enviar WhatsApp." };
    }
  }
}

/** Usa WhatsApp quando configurado (preferido — mais barato e é o canal que as clientes já
 * usam no dia a dia); senão usa SMS se essas credenciais existirem; senão cai no
 * NotificadorConsole. Isso garante que o ambiente local e qualquer deploy sem nenhuma
 * credencial configurada continuam funcionando exatamente como antes. */
function criarNotificadorPadrao(): Notificador {
  const {
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_FROM_NUMBER,
    TWILIO_WHATSAPP_FROM,
    TWILIO_WHATSAPP_CONTENT_SID_CONFIRMACAO,
    TWILIO_WHATSAPP_CONTENT_SID_LEMBRETE,
    TWILIO_WHATSAPP_CONTENT_SID_CONVITE_RETORNO,
  } = process.env;

  if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_WHATSAPP_FROM) {
    const numeroOrigem = TWILIO_WHATSAPP_FROM.startsWith("whatsapp:") ? TWILIO_WHATSAPP_FROM : `whatsapp:${TWILIO_WHATSAPP_FROM}`;
    return new NotificadorTwilioWhatsApp(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, numeroOrigem, {
      CONFIRMACAO: TWILIO_WHATSAPP_CONTENT_SID_CONFIRMACAO,
      LEMBRETE: TWILIO_WHATSAPP_CONTENT_SID_LEMBRETE,
      CONVITE_RETORNO: TWILIO_WHATSAPP_CONTENT_SID_CONVITE_RETORNO,
    });
  }
  if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM_NUMBER) {
    return new NotificadorTwilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER);
  }
  return new NotificadorConsole();
}

export const notificadorPadrao: Notificador = criarNotificadorPadrao();
