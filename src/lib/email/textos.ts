interface EmailPronto {
  assunto: string;
  html: string;
}

/** Layout mínimo com estilo inline (cliente de e-mail não confia em CSS externo/classes) —
 * mesma identidade visual da Veylo (navy + gradiente teal/azul), só o essencial pra ficar
 * legível em qualquer caixa de entrada. */
function layoutEmail(tituloBotao: string, link: string, corpo: string, rodape = ""): string {
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
        ${rodape}
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

export function emailEntrarAdmin(nome: string, link: string): EmailPronto {
  return {
    assunto: "Seu link de acesso ao admin da Veylo",
    html: layoutEmail(
      "Entrar no admin",
      link,
      `<p style="margin:0 0 12px;">Olá, ${nome}! Toque no botão abaixo para entrar no admin da Veylo.</p>
       <p style="margin:0;">O link vale por 15 minutos e só funciona uma vez. Se não foi você que pediu, pode ignorar este e-mail.</p>`,
    ),
  };
}

/** Para o endereço novo, depois que a pessoa troca o e-mail de acesso em Configurações. */
export function emailNovoEnderecoConta(nomeEstabelecimento: string, link: string): EmailPronto {
  return {
    assunto: "Confirme seu novo e-mail — Veylo Agenda",
    html: layoutEmail(
      "Confirmar meu e-mail",
      link,
      `<p style="margin:0 0 12px;">Olá! Este agora é o e-mail de acesso da conta do <strong>${escaparHtml(nomeEstabelecimento)}</strong> no Veylo Agenda.</p>
       <p style="margin:0;">Ele também recebe os avisos de agendamento. Confirme clicando no botão abaixo.</p>`,
    ),
  };
}

/** Para o endereço antigo: avisa da troca, para a pessoa perceber se não foi ela. */
export function emailEnderecoTrocado(nomeEstabelecimento: string, novoEmail: string, linkEntrar: string): EmailPronto {
  return {
    assunto: "O e-mail da sua conta foi trocado — Veylo Agenda",
    html: layoutEmail(
      "Entrar no painel",
      linkEntrar,
      `<p style="margin:0 0 12px;">O e-mail de acesso da conta do <strong>${escaparHtml(nomeEstabelecimento)}</strong> foi trocado para <strong>${escaparHtml(novoEmail)}</strong>.</p>
       <p style="margin:0;">Daqui para a frente, o login e os avisos usam esse endereço. Se não foi você que trocou, fale com a equipe da Veylo o quanto antes.</p>`,
    ),
  };
}

/** Escapa o que vem de fora (o nome que a cliente digitou no link) antes de pôr no HTML. */
function escaparHtml(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
}

/** Dados de um agendamento, já formatados, para os avisos à dona do salão. */
export interface DadosAvisoDona {
  nomeEstabelecimento: string;
  nomeCliente: string;
  /** "(81) 99999-0001" */
  telefoneCliente: string;
  linkWhatsAppCliente: string;
  servico: string;
  /** Só quando o salão tem mais de uma profissional. */
  profissional: string | null;
  /** "ter, 06/10 às 14:00", para o assunto. */
  quandoCurto: string;
  /** "terça-feira, 6 de outubro às 14:00" */
  quandoLongo: string;
  linkAgenda: string;
  linkConfiguracoes: string;
}

function detalhesAgendamento(d: DadosAvisoDona): string {
  const linhas: [string, string][] = [
    ["Serviço", escaparHtml(d.servico)],
    ...(d.profissional ? ([["Profissional", escaparHtml(d.profissional)]] as [string, string][]) : []),
    ["Quando", escaparHtml(d.quandoLongo)],
    [
      "WhatsApp da cliente",
      `<a href="${d.linkWhatsAppCliente}" style="color:#3366f0;text-decoration:none;">${escaparHtml(d.telefoneCliente)}</a>`,
    ],
  ];
  return `<table style="width:100%;border-collapse:collapse;margin:16px 0 0;font-size:14px;">${linhas
    .map(
      ([rotulo, valor]) =>
        `<tr><td style="padding:6px 0;color:#545d6e;width:44%;vertical-align:top;">${rotulo}</td><td style="padding:6px 0;font-weight:600;">${valor}</td></tr>`,
    )
    .join("")}</table>`;
}

function rodapeAvisos(linkConfiguracoes: string): string {
  return `<p style="margin:16px 0 0;font-size:12px;color:#8891a0;">Você recebe este aviso porque ele está ligado em Configurações. Para parar, desmarque em <a href="${linkConfiguracoes}" style="color:#8891a0;">Configurações</a>.</p>`;
}

/** Assunto em texto puro: sem quebras de linha vindas do nome da cliente. */
function assunto(texto: string): string {
  return texto.replace(/\s+/g, " ").trim();
}

export function emailNovoAgendamento(d: DadosAvisoDona): EmailPronto {
  return {
    assunto: assunto(`Novo agendamento: ${d.nomeCliente}, ${d.quandoCurto}`),
    html: layoutEmail(
      "Ver na agenda",
      d.linkAgenda,
      `<p style="margin:0 0 4px;font-size:16px;font-weight:700;">Novo agendamento pelo seu link</p>
       <p style="margin:0;"><strong>${escaparHtml(d.nomeCliente)}</strong> marcou um horário no ${escaparHtml(d.nomeEstabelecimento)}.</p>
       ${detalhesAgendamento(d)}`,
      rodapeAvisos(d.linkConfiguracoes),
    ),
  };
}

export function emailCancelamento(d: DadosAvisoDona): EmailPronto {
  return {
    assunto: assunto(`Cancelamento: ${d.nomeCliente}, ${d.quandoCurto}`),
    html: layoutEmail(
      "Ver na agenda",
      d.linkAgenda,
      `<p style="margin:0 0 4px;font-size:16px;font-weight:700;">Uma cliente cancelou</p>
       <p style="margin:0;"><strong>${escaparHtml(d.nomeCliente)}</strong> cancelou o horário. Ele já está livre de novo no seu link.</p>
       ${detalhesAgendamento(d)}`,
      rodapeAvisos(d.linkConfiguracoes),
    ),
  };
}
