const FOTO_TAMANHO_PX = 320;
const FOTO_QUALIDADE = 0.85;

/** Recorta a foto escolhida num quadrado centralizado e redimensiona para 320x320,
 * reexportando como JPEG — é uma foto de verdade (profissional, serviço), então só
 * centralizamos e enquadramos, sem cortar "espaço em branco" como no logo. */
export function recortarFotoQuadrada(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    leitor.onload = () => {
      const img = new window.Image();
      img.onerror = () => reject(new Error("Esse arquivo não é uma imagem válida."));
      img.onload = () => {
        const lado = Math.min(img.width, img.height);
        const origemX = (img.width - lado) / 2;
        const origemY = (img.height - lado) / 2;
        const canvas = document.createElement("canvas");
        canvas.width = FOTO_TAMANHO_PX;
        canvas.height = FOTO_TAMANHO_PX;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Não foi possível processar a imagem."));
        ctx.drawImage(img, origemX, origemY, lado, lado, 0, 0, FOTO_TAMANHO_PX, FOTO_TAMANHO_PX);
        resolve(canvas.toDataURL("image/jpeg", FOTO_QUALIDADE));
      };
      img.src = leitor.result as string;
    };
    leitor.readAsDataURL(arquivo);
  });
}
