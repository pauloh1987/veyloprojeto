import * as Sentry from "@sentry/nextjs";

/** Só captura erros — sem Session Replay/gravação de tela, pra não precisar mudar a política
 * de privacidade por causa de uma ferramenta interna de monitoramento. */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
