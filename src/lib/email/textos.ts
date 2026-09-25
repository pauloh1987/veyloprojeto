interface EmailPronto {
  assunto: string;
  html: string;
}

/** Layout mínimo com estilo inline (cliente de e-mail não confia em CSS externo/classes) —
 * mesma identidade visual da Veylo (navy + gradiente teal/azul), só o essencial pra ficar
 * legível em qualquer caixa de entrada. */
function layoutEmail(tituloBotao: string, link: string, corpo: string): string {
  return `
  <div style="background:#f6f7fa;padding:32px 16px;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
    <div style="max-width:420px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e6ee;">
      <div style="background:#060a12;padding:24px;text-align:center;">
        <p style="margin:0;font-size:16px;font-weight:800;color:#ffffff;">
          Veylo <span style="color:#22d6b0;">Agenda</span>
        </p>
      </div>
      <div style="padding:28px 24px;color:#10151f;font-size:14.5px;line-height:1.6;">
        ${corpo}
        <div style="text-align:center;margin:28px 0 8px;">
          <a href="${link}" style="display:inline-block;background:#3366f0;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 28px;border-radius:10px;">
            ${tituloBotao}
          </a>
        </div>
        <p style="margin:20px 0 0;font-size:12px;color:#8891a0;word-break:break-all;">
          Se o botão não funcionar, copie e cole este link no navegador:<br />${link}
        </p>
      </div>
    </div>
  </div>`;
}

export function emailConfirmarConta(nomeEstabelecimento: string, link: string): EmailPronto {
  return {
    assunto: "Confirme seu e-mail — Veylo Agenda",
    html: layoutEmail(
      "Confirmar meu e-mail",
      link,
      `<p style="margin:0 0 12px;">Olá! Sua conta do <strong>${nomeEstabelecimento}</strong> foi criada no Veylo Agenda.</p>
       <p style="margin:0;">Confirme seu e-mail clicando no botão abaixo — leva menos de um minuto.</p>`,
    ),
  };
}

export function emailRedefinirSenha(link: string): EmailPronto {
  return {
    assunto: "Redefinir sua senha — Veylo Agenda",
    html: layoutEmail(
      "Criar nova senha",
      link,
      `<p style="margin:0 0 12px;">Recebemos um pedido pra redefinir a senha da sua conta no Veylo Agenda.</p>
       <p style="margin:0;">Se foi você, clique no botão abaixo pra escolher uma nova senha. Esse link vale por 1 hora.
       Se não foi você, pode ignorar este e-mail — sua senha continua a mesma.</p>`,
    ),
  };
}
