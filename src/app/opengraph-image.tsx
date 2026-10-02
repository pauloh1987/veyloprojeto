import { ImageResponse } from "next/og";
import { fontesDaMarca } from "@/lib/marca/fonteOg";
import { LOGO_VEYLO_DATA_URL } from "@/lib/marca/logo";

/** Imagem de prévia do site (quando alguém manda veyloagenda.com.br no WhatsApp, Instagram etc.). */
export const alt = "Veylo Agenda: sua cliente agenda sozinha, você organiza o resto";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TEXTOS = {
  marca: "Veylo",
  agenda: "Agenda",
  // Sem ponto final: no peso 800 o gerador de imagem deixa um espaço antes do ponto.
  linha1: "Sua cliente agenda sozinha",
  linha2: "Você organiza o resto",
  apoio: "Agenda online para salões, barbearias, esmalterias e estética",
  site: "veyloagenda.com.br",
};

export default async function ImagemDoSite() {
  const fontes = await fontesDaMarca(Object.values(TEXTOS).join(""));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          color: "#ffffff",
          fontFamily: "Jakarta",
          backgroundColor: "#060a12",
          backgroundImage:
            "radial-gradient(circle at 92% 0%, rgba(34,214,176,0.32), transparent 45%), radial-gradient(circle at 0% 100%, rgba(51,102,240,0.34), transparent 50%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <img src={LOGO_VEYLO_DATA_URL} width={84} height={84} alt="" />
          <div style={{ display: "flex", fontSize: 44, fontWeight: 800 }}>
            {TEXTOS.marca} <span style={{ color: "#22d6b0", marginLeft: 12 }}>{TEXTOS.agenda}</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 78, fontWeight: 800, lineHeight: 1.05 }}>{TEXTOS.linha1}</div>
          <div style={{ display: "flex", fontSize: 78, fontWeight: 800, lineHeight: 1.05, color: "#22d6b0" }}>
            {TEXTOS.linha2}
          </div>
          <div style={{ display: "flex", marginTop: 28, fontSize: 32, fontWeight: 500, color: "rgba(255,255,255,0.75)" }}>
            {TEXTOS.apoio}
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 28, fontWeight: 800, color: "rgba(255,255,255,0.6)" }}>{TEXTOS.site}</div>
      </div>
    ),
    { ...size, ...(fontes.length > 0 ? { fonts: fontes } : {}) },
  );
}
