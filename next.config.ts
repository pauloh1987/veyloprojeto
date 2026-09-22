import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Em deploys serverless (Netlify/Vercel), o rastreamento de arquivos do Next não detecta
  // sozinho o banco SQLite (é aberto por um caminho vindo de variável de ambiente, não de um
  // import estático) — sem isso, a função sobe sem o arquivo do banco.
  outputFileTracingIncludes: {
    "/*": ["./prisma/dev.db"],
  },
};

export default nextConfig;
