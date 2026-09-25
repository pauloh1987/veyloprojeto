export interface EnvioEmail {
  destinatario: string;
  assunto: string;
  html: string;
}

export interface ResultadoEnvioEmail {
  sucesso: boolean;
  erro?: string;
}

/** Mesma ideia do `Notificador` de SMS/WhatsApp (`src/lib/mensagens/notificador.ts`): trocar
 * o provedor real não deve exigir nenhuma mudança em quem chama. */
export interface NotificadorEmail {
  enviar(email: EnvioEmail): Promise<ResultadoEnvioEmail>;
}

/** Sem provedor configurado, só ecoa no console — igual ao NotificadorConsole de SMS, pra
 * dev local e qualquer ambiente sem RESEND_API_KEY funcionar sem exigir nada externo. */
export class NotificadorEmailConsole implements NotificadorEmail {
  async enviar(email: EnvioEmail): Promise<ResultadoEnvioEmail> {
    console.log(`[Veylo] E-MAIL -> ${email.destinatario}: ${email.assunto}\n${email.html}`);
    return { sucesso: true };
  }
}

/** Envia e-mail de verdade via Resend (https://resend.com) — API simples via fetch, sem SDK
 * (mesmo padrão do Twilio: uma chamada HTTP direta, sem dependência nova no projeto). */
export class NotificadorEmailResend implements NotificadorEmail {
  constructor(
    private readonly apiKey: string,
    private readonly remetente: string,
  ) {}

  async enviar(email: EnvioEmail): Promise<ResultadoEnvioEmail> {
    try {
      const resposta = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: this.remetente,
          to: [email.destinatario],
          subject: email.assunto,
          html: email.html,
        }),
      });

      if (!resposta.ok) {
        const detalhe = await resposta.text();
        return { sucesso: false, erro: `Resend ${resposta.status}: ${detalhe.slice(0, 300)}` };
      }
      return { sucesso: true };
    } catch (erro) {
      return { sucesso: false, erro: erro instanceof Error ? erro.message : "Falha ao enviar e-mail." };
    }
  }
}

function criarNotificadorEmailPadrao(): NotificadorEmail {
  const { RESEND_API_KEY, EMAIL_REMETENTE } = process.env;
  if (RESEND_API_KEY && EMAIL_REMETENTE) {
    return new NotificadorEmailResend(RESEND_API_KEY, EMAIL_REMETENTE);
  }
  return new NotificadorEmailConsole();
}

export const notificadorEmailPadrao: NotificadorEmail = criarNotificadorEmailPadrao();
