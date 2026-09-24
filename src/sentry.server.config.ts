import * as Sentry from "@sentry/nextjs";

/** Sem SENTRY_DSN configurado, Sentry.init vira um no-op seguro — nenhum ambiente quebra por
 * causa disso (mesmo padrão usado pra Twilio: funciona sem, liga sozinho quando configurado). */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
});
