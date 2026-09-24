import type { Config } from "@netlify/functions";
import { processarFilaMensagens } from "../../src/lib/mensagens/fila";

/**
 * Roda a cada 15 minutos em produção (Netlify Scheduled Functions) e chama a fila de
 * mensagens direto — sem passar por `/api/cron/mensagens` — porque antes disso NADA disparava
 * essa rota automaticamente: não existia nenhum agendamento configurado (nem no netlify.toml
 * nem em nenhuma função), então nenhum lembrete de agendamento saía sozinho em produção, só a
 * confirmação imediata (essa sim chamada direto no fluxo de criar agendamento). A rota HTTP
 * continua existindo para disparo manual/depuração, agora protegida por `CRON_SECRET`.
 */
export default async () => {
  const resultado = await processarFilaMensagens();
  console.log(
    `[cron-mensagens] processadas=${resultado.processadas} agoraEfetivo=${resultado.agoraEfetivo.toISOString()}`,
  );
};

export const config: Config = {
  schedule: "*/15 * * * *",
};
