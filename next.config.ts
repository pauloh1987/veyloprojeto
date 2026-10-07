import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

// A Netlify só informa o contexto do deploy (production, branch-deploy, deploy-preview) durante o
// build; aqui ele fica gravado no código para o servidor saber, já rodando, se é o site de teste
// (ver src/lib/ambiente.ts).
const ehDeployDeTeste = process.env.CONTEXT === "branch-deploy" || process.env.CONTEXT === "deploy-preview";

const nextConfig: NextConfig = {
  env: {
    VEYLO_AMBIENTE: ehDeployDeTeste ? "teste" : "",
    VEYLO_URL_TESTE: ehDeployDeTeste ? (process.env.DEPLOY_PRIME_URL ?? "") : "",
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  sourcemaps: { disable: true },
});
