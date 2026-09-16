import { db } from "@/lib/db";

/** Único ponto de resolução de um estabelecimento a partir do slug da URL pública — todo
 * código que atende a área pública deve passar por aqui, nunca aceitar um estabelecimentoId
 * vindo do cliente, garantindo o isolamento entre estabelecimentos. */
export async function obterEstabelecimentoPorSlug(slug: string) {
  return db.estabelecimento.findUnique({ where: { slug } });
}
