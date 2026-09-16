"use server";

import { revalidatePath } from "next/cache";
import { exigirSessao } from "@/lib/auth";
import { simularPassagemDoTempo, processarFilaMensagens } from "@/lib/mensagens/fila";

export async function acaoSimularPassagemDoTempo(): Promise<{ processadas: number; agoraEfetivo: string }> {
  await exigirSessao();
  const resultado = await simularPassagemDoTempo();
  revalidatePath("/painel/mensagens");
  return { processadas: resultado.processadas, agoraEfetivo: resultado.agoraEfetivo.toISOString() };
}

export async function acaoProcessarFilaAgora(): Promise<{ processadas: number; agoraEfetivo: string }> {
  await exigirSessao();
  const resultado = await processarFilaMensagens();
  revalidatePath("/painel/mensagens");
  return { processadas: resultado.processadas, agoraEfetivo: resultado.agoraEfetivo.toISOString() };
}
