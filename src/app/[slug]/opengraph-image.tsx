import { ImageResponse } from "next/og";
import { obterEstabelecimentoPorSlug } from "@/lib/estabelecimentoPublico";
import { iniciais } from "@/lib/formatadores";
import { fontesDaMarca } from "@/lib/marca/fonteOg";
import { LOGO_VEYLO_DATA_URL } from "@/lib/marca/logo";

/** Imagem de prévia do link de agendamento de cada salão (o que aparece no WhatsApp quando o
 * link é enviado): logo e nome do salão em tamanho grande, para não sair borrada. */
export const alt = "Agende seu horário online";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CHAMADA = "Agende seu horário online";
const APOIO = "Escolha o serviço e o horário em poucos toques, sem baixar aplicativo.";
const ASSINATURA = "Agendamento por Veylo Agenda";

/** "#e2557a" → "rgba(226,85,122,0.35)", para o brilho do fundo na cor do salão. */
function corComTransparencia(hex: string, alfa: number): string {
  const limpo = /^#[0-9a-f]{6}$/i.test(hex) ? hex.slice(1) : "3366f0";
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(limpo.slice(i, i + 2), 16));
  return `rgba(${r},${g},${b},${alfa})`;
}

export default async function ImagemDoSalao({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const salao = await obterEstabelecimentoPorSlug(slug);
  const nome = salao?.nome ?? "Veylo Agenda";
  const cor = salao?.corDestaque ?? "#3366f0";
  const tamanhoNome = nome.length > 34 ? 58 : nome.length > 22 ? 70 : 84;
  const fontes = await fontesDaMarca([CHAMADA, APOIO, ASSINATURA, nome, iniciais(nome)].join(""));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "64px 80px",
          color: "#ffffff",
          fontFamily: "Jakarta",
          backgroundColor: "#0a1220",
          backgroundImage: `radial-gradient(circle at 95% 0%, ${corComTransparencia(cor, 0.45)}, transparent 50%), radial-gradient(circle at 0% 100%, ${corComTransparencia(cor, 0.25)}, transparent 55%)`,
        }}
      >
        <div style={{ display: "flex", flex: 1, alignItems: "center", gap: 44 }}>
          {salao?.foto ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 240,
                height: 240,
                flexShrink: 0,
                padding: 20,
                borderRadius: 48,
                backgroundColor: salao.logoFundo || "#ffffff",
              }}
            >
              <img src={salao.foto} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 240,
                height: 240,
                flexShrink: 0,
                borderRadius: 999,
                backgroundColor: cor,
                fontSize: 100,
                fontWeight: 800,
              }}
            >
              {iniciais(nome)}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ display: "flex", fontSize: 30, fontWeight: 500, color: "rgba(255,255,255,0.8)" }}>{CHAMADA}</div>
            <div style={{ display: "flex", marginTop: 8, fontSize: tamanhoNome, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1.5 }}>
              {nome}
            </div>
            <div style={{ display: "flex", marginTop: 22, fontSize: 28, fontWeight: 500, lineHeight: 1.35, color: "rgba(255,255,255,0.72)" }}>
              {APOIO}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 26, fontWeight: 500, color: "rgba(255,255,255,0.6)" }}>
          <img src={LOGO_VEYLO_DATA_URL} width={44} height={44} alt="" />
          {ASSINATURA}
        </div>
      </div>
    ),
    { ...size, ...(fontes.length > 0 ? { fonts: fontes } : {}) },
  );
}
