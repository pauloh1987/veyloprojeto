import { describe, expect, it } from "vitest";
import { corDoTextoSobre, destaqueParaTexto } from "./cores";

describe("cor do texto sobre a cor do salão", () => {
  it("cores claras pedem texto escuro", () => {
    expect(corDoTextoSobre("#FACC15")).toBe("#10151f");
    expect(corDoTextoSobre("#ffffff")).toBe("#10151f");
    expect(corDoTextoSobre("#86efac")).toBe("#10151f");
  });

  it("cores médias e escuras ficam com texto branco", () => {
    expect(corDoTextoSobre("#D94E7F")).toBe("#ffffff");
    expect(corDoTextoSobre("#2f6b4f")).toBe("#ffffff");
    expect(corDoTextoSobre("#0EA5A0")).toBe("#ffffff");
    expect(corDoTextoSobre("#000000")).toBe("#ffffff");
  });

  it("cor inválida cai no branco", () => {
    expect(corDoTextoSobre("rosa")).toBe("#ffffff");
  });
});

describe("cor do salão para texto", () => {
  it("mantém cores que já têm leitura no branco", () => {
    expect(destaqueParaTexto("#D94E7F")).toBe("#D94E7F");
  });

  it("escurece cores claras", () => {
    expect(destaqueParaTexto("#FACC15")).toBe("color-mix(in oklab, #FACC15 55%, black)");
  });
});
