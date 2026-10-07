import type { Metadata } from "next";
import { Manrope, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ehSiteDeTeste } from "@/lib/ambiente";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const DESCRICAO =
  "Agenda online para salões, barbearias, esmalterias e estética: a cliente agenda sozinha pelo link e recebe a confirmação no WhatsApp.";

export const metadata: Metadata = {
  // Endereço do site para as imagens de prévia (Open Graph) saírem com URL completa. Na Netlify,
  // URL é o domínio principal.
  metadataBase: new URL(process.env.URL ?? "http://localhost:3000"),
  title: {
    default: "Veylo Agenda",
    template: "%s · Veylo Agenda",
  },
  description: DESCRICAO,
  openGraph: { siteName: "Veylo Agenda", locale: "pt_BR", type: "website", description: DESCRICAO },
  twitter: { card: "summary_large_image" },
  ...(ehSiteDeTeste() ? { robots: { index: false, follow: false } } : {}),
};

const SCRIPT_TEMA = `
(function () {
  try {
    var salvo = localStorage.getItem("veylo-tema");
    var tema = salvo || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.classList.toggle("dark", tema === "dark");
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${manrope.variable} ${jakarta.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* eslint-disable-next-line react/no-danger */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className="min-h-screen font-body antialiased" suppressHydrationWarning>
        {ehSiteDeTeste() && (
          <div className="sticky top-0 z-[100] bg-amber-400 px-3 py-1 text-center text-xs font-bold text-amber-950">
            Ambiente de teste: dados de cópia, WhatsApp simulado e e-mail só para a equipe.
          </div>
        )}
        {children}
      </body>
    </html>
  );
}
