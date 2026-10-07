/**
 * Site de teste: a branch `teste` publicada pela Netlify como branch deploy (não gasta os créditos
 * de deploy), em https://teste--veylo-agenda-286.netlify.app. Lá o banco é uma branch do Neon
 * (POSTGRES_URL_TESTE), o WhatsApp é só simulado e e-mail só sai para a equipe (ADMIN_EMAILS), para
 * nunca mexer em dado de produção nem avisar cliente de verdade. O contexto da Netlify (CONTEXT) só
 * existe durante o build, então o next.config.ts grava o resultado em VEYLO_AMBIENTE.
 */
export function ehSiteDeTeste(): boolean {
  return process.env.VEYLO_AMBIENTE === "teste";
}
