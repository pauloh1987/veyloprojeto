/** Plus Jakarta Sans (a fonte dos títulos do site) para as imagens de prévia de link. O Google
 * Fonts devolve só as letras usadas, em TTF (formato que o gerador de imagens aceita). Sem
 * internet, devolve null e a imagem sai com a fonte padrão. */

type Peso = 500 | 800;

const guardadas = new Map<string, Promise<ArrayBuffer | null>>();

async function buscarFonte(peso: Peso, texto: string): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@${peso}&text=${encodeURIComponent(texto)}`,
      { signal: AbortSignal.timeout(4000) },
    ).then((resposta) => resposta.text());
    const url = /src: url\((.+?)\) format\('(?:opentype|truetype)'\)/.exec(css)?.[1];
    if (!url) return null;
    const resposta = await fetch(url, { signal: AbortSignal.timeout(4000) });
    return resposta.ok ? await resposta.arrayBuffer() : null;
  } catch {
    return null;
  }
}

function fonte(peso: Peso, texto: string): Promise<ArrayBuffer | null> {
  const chave = `${peso}:${texto}`;
  let promessa = guardadas.get(chave);
  if (!promessa) {
    promessa = buscarFonte(peso, texto).then((dados) => {
      if (!dados) guardadas.delete(chave);
      return dados;
    });
    guardadas.set(chave, promessa);
  }
  return promessa;
}

/** Fontes para `new ImageResponse(..., { fonts })`, com as letras de `texto`; lista vazia (a
 * imagem usa a fonte padrão) se o Google Fonts não responder. */
export async function fontesDaMarca(texto: string) {
  const [normal, negrito] = await Promise.all([fonte(500, texto), fonte(800, texto)]);
  return [
    ...(normal ? [{ name: "Jakarta", data: normal, weight: 500 as const, style: "normal" as const }] : []),
    ...(negrito ? [{ name: "Jakarta", data: negrito, weight: 800 as const, style: "normal" as const }] : []),
  ];
}
