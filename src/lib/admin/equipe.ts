/** Quem pode entrar no admin da Veylo. A lista vem da variável de ambiente `ADMIN_EMAILS`
 * (cadastrada na Netlify, fora do git): e-mails separados por vírgula, cada um com nome
 * opcional, por exemplo `Paulo <paulo@exemplo.com>, Biel <biel@exemplo.com>`. */
export interface MembroEquipe {
  nome: string;
  email: string;
}

const REGEX_EMAIL = /^[^@\s<>]+@[^@\s<>]+\.[^@\s<>]+$/;

function nomeDoEmail(email: string): string {
  const local = email.split("@")[0];
  return local.charAt(0).toUpperCase() + local.slice(1);
}

export function lerEquipe(valor: string | undefined): MembroEquipe[] {
  const equipe: MembroEquipe[] = [];
  for (const parte of (valor ?? "").split(",")) {
    const texto = parte.trim();
    if (!texto) continue;
    const comNome = /^(.*)<([^<>]+)>$/.exec(texto);
    const email = (comNome ? comNome[2] : texto).trim().toLowerCase();
    if (!REGEX_EMAIL.test(email) || equipe.some((m) => m.email === email)) continue;
    equipe.push({ nome: comNome?.[1].trim() || nomeDoEmail(email), email });
  }
  return equipe;
}

export function membroPorEmail(equipe: MembroEquipe[], email: string): MembroEquipe | null {
  const alvo = email.trim().toLowerCase();
  return equipe.find((membro) => membro.email === alvo) ?? null;
}
