import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import AuthButton from "./AuthButton";
import SiteThemeSync from "./SiteThemeSync";
import SiteBrand from "./SiteBrand";
import SiteFooter from "./SiteFooter";
import CookieConsentBanner from "./CookieConsentBanner";

export const metadata: Metadata = {
  title: "Portal Direto",
  description: "Imóveis direto com o proprietário",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-gray-100 text-gray-900">
        <SiteThemeSync />

        <header className="site-header sticky top-0 z-40 border-b border-slate-200/70 backdrop-blur-md bg-white/85">
          <div className="max-w-[1200px] mx-auto px-6 py-4 flex justify-between items-center">
            <SiteBrand />

            <nav className="flex gap-6 items-center">
              <Link href="/imoveis?kind=venda" className="site-nav-link font-medium">
                Comprar
              </Link>

              <Link href="/imoveis?kind=locacao" className="site-nav-link font-medium">
                Alugar
              </Link>

              <Link href="/chat" className="site-nav-link font-medium">
                Chat
              </Link>

              <Link href="/favoritos" className="site-nav-link font-medium">
                Favoritos
              </Link>

              <Link href="/anunciar" className="cta-primary rounded-xl px-4 py-2 text-sm font-semibold transition">
                Cadastrar Imóvel
              </Link>

              <AuthButton />
            </nav>
          </div>
        </header>

        <main>{children}</main>
        <SiteFooter />
        <CookieConsentBanner />
      </body>
    </html>
  );
}
