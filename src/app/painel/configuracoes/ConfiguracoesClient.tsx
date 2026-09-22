"use client";

import { useActionState, useRef, useState } from "react";
import { Check, Copy, ImageOff } from "lucide-react";
import { salvarConfiguracoes } from "@/lib/acoes/configuracoes";
import type { EstadoAcao } from "@/lib/acoes/agendamentos";
import { Button } from "@/components/ui/Button";
import { Campo, Input, Rotulo } from "@/components/ui/Campo";
import { iniciais } from "@/lib/formatadores";
import { cn } from "@/lib/cn";

const ESTADO_INICIAL: EstadoAcao = {};
const LOGO_TAMANHO_MAX_PX = 320;
const LOGO_QUALIDADE = 0.85;

/** Acha o retângulo que realmente tem desenho (não branco, não transparente) — muita
 * ferramenta de logo (Canva etc.) exporta um canvas quadrado enorme com a arte só ocupando
 * uma fatia pequena no meio; sem cortar essa margem, o logo fica minúsculo dentro do card. */
function encontrarCaixaConteudo(ctx: CanvasRenderingContext2D, largura: number, altura: number) {
  const { data } = ctx.getImageData(0, 0, largura, altura);
  let minX = largura;
  let minY = altura;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      const i = (y * largura + x) * 4;
      const alfa = data[i + 3];
      const quaseBranco = data[i] > 248 && data[i + 1] > 248 && data[i + 2] > 248;
      if (alfa > 10 && !quaseBranco) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  return maxX < 0 ? null : { minX, minY, maxX, maxY };
}

/** Corta a margem em branco/transparente ao redor do desenho, redimensiona o que sobrou para
 * no máximo 320px no maior lado e reexporta como PNG — tudo no navegador, sem subir o arquivo
 * original a lugar nenhum. O resultado (um data URL pequeno) é o que de fato é salvo no banco,
 * direto na coluna `foto`. */
function redimensionarLogo(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    leitor.onload = () => {
      const img = new window.Image();
      img.onerror = () => reject(new Error("Esse arquivo não é uma imagem válida."));
      img.onload = () => {
        const canvasOriginal = document.createElement("canvas");
        canvasOriginal.width = img.width;
        canvasOriginal.height = img.height;
        const ctxOriginal = canvasOriginal.getContext("2d", { willReadFrequently: true });
        if (!ctxOriginal) return reject(new Error("Não foi possível processar a imagem."));
        ctxOriginal.drawImage(img, 0, 0);

        const caixa = encontrarCaixaConteudo(ctxOriginal, img.width, img.height);
        const margem = caixa ? Math.round(Math.max(caixa.maxX - caixa.minX, caixa.maxY - caixa.minY) * 0.08) : 0;
        const origemX = caixa ? Math.max(0, caixa.minX - margem) : 0;
        const origemY = caixa ? Math.max(0, caixa.minY - margem) : 0;
        const larguraConteudo = caixa ? Math.min(img.width, caixa.maxX + margem) - origemX : img.width;
        const alturaConteudo = caixa ? Math.min(img.height, caixa.maxY + margem) - origemY : img.height;

        const escala = Math.min(1, LOGO_TAMANHO_MAX_PX / Math.max(larguraConteudo, alturaConteudo));
        const largura = Math.max(1, Math.round(larguraConteudo * escala));
        const altura = Math.max(1, Math.round(alturaConteudo * escala));
        const canvas = document.createElement("canvas");
        canvas.width = largura;
        canvas.height = altura;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Não foi possível processar a imagem."));
        ctx.drawImage(img, origemX, origemY, larguraConteudo, alturaConteudo, 0, 0, largura, altura);
        resolve(canvas.toDataURL("image/png", LOGO_QUALIDADE));
      };
      img.src = leitor.result as string;
    };
    leitor.readAsDataURL(arquivo);
  });
}

export function ConfiguracoesClient({
  estabelecimento,
  linkPublico,
}: {
  estabelecimento: {
    nome: string;
    telefone: string;
    endereco: string;
    corDestaque: string;
    antecedenciaMinMin: number;
    plano: string;
    foto: string | null;
  };
  linkPublico: string;
}) {
  const [estado, acao] = useActionState(salvarConfiguracoes, ESTADO_INICIAL);
  const [copiado, setCopiado] = useState(false);
  const [plano, setPlano] = useState<"SOLO" | "EQUIPE">(estabelecimento.plano === "EQUIPE" ? "EQUIPE" : "SOLO");
  const [foto, setFoto] = useState<string | null>(estabelecimento.foto);
  const [erroLogo, setErroLogo] = useState<string | null>(null);
  const inputArquivoRef = useRef<HTMLInputElement>(null);

  async function aoEscolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setErroLogo(null);
    try {
      const dataUrl = await redimensionarLogo(arquivo);
      setFoto(dataUrl);
    } catch (erro) {
      setErroLogo(erro instanceof Error ? erro.message : "Não foi possível usar essa imagem.");
    } finally {
      e.target.value = "";
    }
  }

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(linkPublico);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // clipboard indisponível — o link já está selecionável no campo.
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <header className="mb-6">
        <h1 className="font-heading text-2xl font-extrabold text-text">Configurações</h1>
        <p className="text-sm text-text-muted">Plano atual: {estabelecimento.plano === "EQUIPE" ? "Equipe" : "Solo"}</p>
      </header>

      <div className="mb-6 rounded-2xl border border-border bg-surface p-4">
        <Rotulo htmlFor="link-publico">Link público de agendamento</Rotulo>
        <div className="flex gap-2">
          <input
            id="link-publico"
            readOnly
            value={linkPublico}
            className="min-h-11 flex-1 rounded-xl border border-border-strong bg-surface-2 px-3.5 text-sm text-text"
            onFocus={(e) => e.currentTarget.select()}
          />
          <Button type="button" variant="secondary" onClick={copiarLink}>
            {copiado ? <Check size={16} /> : <Copy size={16} />}
            {copiado ? "Copiado" : "Copiar"}
          </Button>
        </div>
        <p className="mt-2 text-xs text-text-faint">Compartilhe esse link no Instagram, WhatsApp ou onde preferir.</p>
      </div>

      <form action={acao} className="space-y-4 rounded-2xl border border-border bg-surface p-4">
        <div>
          <span className="mb-1.5 block text-sm font-medium text-text">Logo</span>
          <div className="flex items-center gap-3">
            {foto ? (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border-strong bg-white p-1.5">
                <img src={foto} alt="Logo do estabelecimento" className="max-h-full max-w-full object-contain" />
              </div>
            ) : (
              <span
                className="flex h-16 w-16 items-center justify-center rounded-full font-heading text-lg font-extrabold text-white"
                style={{ backgroundColor: estabelecimento.corDestaque }}
                aria-hidden
              >
                {iniciais(estabelecimento.nome)}
              </span>
            )}
            <div className="flex flex-col gap-1.5">
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={() => inputArquivoRef.current?.click()}>
                  {foto ? "Trocar" : "Enviar logo"}
                </Button>
                {foto && (
                  <Button type="button" variant="secondary" onClick={() => setFoto(null)}>
                    <ImageOff size={16} />
                    Remover
                  </Button>
                )}
              </div>
              <p className="text-xs text-text-faint">PNG ou JPG. Aparece na sua página pública de agendamento.</p>
              {erroLogo && <p className="text-xs text-danger">{erroLogo}</p>}
            </div>
          </div>
          <input
            ref={inputArquivoRef}
            type="file"
            accept="image/*"
            onChange={aoEscolherArquivo}
            className="hidden"
          />
          <input type="hidden" name="foto" value={foto ?? ""} />
        </div>

        <Campo rotulo="Nome do estabelecimento" htmlFor="nome">
          <Input id="nome" name="nome" required defaultValue={estabelecimento.nome} />
        </Campo>
        <Campo rotulo="Telefone" htmlFor="telefone">
          <Input id="telefone" name="telefone" required defaultValue={estabelecimento.telefone} />
        </Campo>
        <Campo rotulo="Endereço" htmlFor="endereco">
          <Input id="endereco" name="endereco" required defaultValue={estabelecimento.endereco} />
        </Campo>

        <div>
          <span className="mb-1.5 block text-sm font-medium text-text">Plano</span>
          <div className="grid grid-cols-2 gap-2.5">
            {(
              [
                { valor: "SOLO" as const, titulo: "Solo", desc: "Você atende sozinha." },
                { valor: "EQUIPE" as const, titulo: "Equipe", desc: "Você e outras profissionais." },
              ]
            ).map((op) => (
              <button
                key={op.valor}
                type="button"
                onClick={() => setPlano(op.valor)}
                className={cn(
                  "rounded-xl border p-3.5 text-left transition-colors",
                  plano === op.valor ? "border-accent bg-surface-2" : "border-border-strong bg-surface",
                )}
              >
                <p className="font-semibold text-text">{op.titulo}</p>
                <p className="text-xs text-text-muted">{op.desc}</p>
              </button>
            ))}
          </div>
          <input type="hidden" name="plano" value={plano} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Rotulo htmlFor="corDestaque">Cor de destaque</Rotulo>
            <input
              id="corDestaque"
              name="corDestaque"
              type="color"
              defaultValue={estabelecimento.corDestaque}
              className="h-11 w-full rounded-lg border border-border-strong bg-surface"
            />
          </div>
          <Campo rotulo="Antecedência mínima (min)" htmlFor="antecedenciaMinMin">
            <Input
              id="antecedenciaMinMin"
              name="antecedenciaMinMin"
              type="number"
              min={0}
              step={15}
              required
              defaultValue={estabelecimento.antecedenciaMinMin}
            />
          </Campo>
        </div>

        {estado?.erro && <p className="text-sm text-danger">{estado.erro}</p>}
        {estado?.sucesso && <p className="text-sm text-success">Configurações salvas.</p>}

        <Button type="submit">Salvar alterações</Button>
      </form>
    </div>
  );
}
