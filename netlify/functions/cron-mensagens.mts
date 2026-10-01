import type { Config } from "@netlify/functions";
import { processarFilaMensagens } from "../../src/lib/mensagens/fila";

/**
 * Envia os lembretes e convites de retorno que já chegaram na hora (Netlify Scheduled
 * Functions), chamando a fila direto, sem passar por `/api/cron/mensagens` (essa rota continua
 * existindo só para disparo manual/depuração, protegida por `CRON_SECRET`).
 *
 * Roda 3 vezes por dia (08h, 12h e 18h de Brasília), não a cada 15 minutos: cada execução
 * acorda o banco (Netlify Database), que só volta a dormir depois de 5 minutos parado e custa
 * créditos por hora acordado. A cada 15 minutos o banco ficava acordado ~8h por dia e consumiu
 * sozinho boa parte dos créditos do mês (setembro/2026). Com 3 horários, o maior intervalo sem
 * rodar é de 14h (18h -> 08h), então um lembrete agendado para 24h antes sai pelo menos 10h
 * antes do horário. A confirmação não depende disso: sai na hora em que a cliente agenda.
 */
export default async () => {
  const resultado = await processarFilaMensagens();
  console.log(
    `[cron-mensagens] processadas=${resultado.processadas} agora=${resultado.agora.toISOString()}`,
  );
};

export const config: Config = {
  // Cron em UTC: 11h, 15h e 21h UTC = 08h, 12h e 18h em Brasília (sem horário de verão).
  schedule: "0 11,15,21 * * *",
};
