/** Erros de envio da Twilio: o que guardar no banco e como explicar em português. */

/** Texto curto guardado em `Mensagem.erro` a partir da resposta de erro da API da Twilio
 * (`{"code": 21211, "message": "..."}`). */
export function descreverErroTwilio(status: number, corpo: string): string {
  try {
    const dados = JSON.parse(corpo) as { code?: number; message?: string };
    if (dados.code || dados.message) {
      return `Twilio ${status}${dados.code ? `, código ${dados.code}` : ""}: ${String(dados.message ?? "").slice(0, 300)}`;
    }
  } catch {
    // resposta que não é JSON: guarda o começo do texto
  }
  return `Twilio ${status}: ${corpo.slice(0, 300)}`;
}

/** Códigos da Twilio mais prováveis neste sistema e o que cada um quer dizer. */
const EXPLICACOES: Record<number, string> = {
  20003: "A Twilio não aceitou as credenciais (Account SID ou Auth Token cadastrados na Netlify).",
  20429: "Muitas mensagens ao mesmo tempo; a Twilio pediu para esperar.",
  21211: "O número da cliente não é um telefone válido.",
  21408: "A conta da Twilio não tem permissão para enviar para esse país.",
  21608: "A conta da Twilio ainda está em modo de teste e só envia para números verificados.",
  21610: "A cliente bloqueou mensagens deste número.",
  21614: "O número da cliente não é de celular.",
  21656: "As informações da mensagem não batem com o modelo aprovado.",
  21910: "Remetente e destinatário em canais diferentes (confira TWILIO_WHATSAPP_FROM).",
  63007: "A Twilio não encontrou o WhatsApp da Veylo como remetente (confira o número na Twilio).",
  63016: "Mensagem fora da janela de 24 horas e sem modelo aprovado.",
  63024: "O número da cliente não está no WhatsApp.",
};

/** Explicação para quem vê o erro no painel ou no admin; null se não houver erro guardado. */
export function explicarErroEnvio(erro: string | null): string | null {
  if (!erro) return null;
  const codigo = Number(/código (\d+)/.exec(erro)?.[1]);
  if (EXPLICACOES[codigo]) return EXPLICACOES[codigo];
  if (/^Twilio 401/.test(erro)) return EXPLICACOES[20003];
  if (/modelos do WhatsApp usam|Nenhum template/.test(erro)) return "Problema na configuração dos modelos de mensagem do WhatsApp.";
  return "A mensagem não foi enviada.";
}

/** Códigos que dizem respeito ao número da cliente: a dona do salão consegue agir sobre eles. */
const CODIGOS_DO_NUMERO_DA_CLIENTE = [21211, 21610, 21614, 63024];

/** Versão para a dona do salão (tela Mensagens): fala do número da cliente quando for o caso e
 * não mostra detalhe técnico de configuração, que fica no admin da Veylo. */
export function explicarErroParaSalao(erro: string | null): string {
  if (!erro) return "A mensagem não foi enviada.";
  const codigo = Number(/código (\d+)/.exec(erro)?.[1]);
  if (CODIGOS_DO_NUMERO_DA_CLIENTE.includes(codigo)) return EXPLICACOES[codigo];
  if (/^Twilio|modelos do WhatsApp|Nenhum template/.test(erro)) {
    return "Falha no envio pelo WhatsApp. A equipe Veylo vê o motivo no painel interno.";
  }
  return erro;
}
