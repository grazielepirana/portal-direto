import "./globals.css";
import type { Metadata } from "next";
import SiteThemeSync from "./SiteThemeSync";
import SiteFaviconSync from "./SiteFaviconSync";
import SiteBrand from "./SiteBrand";
import SiteFooter from "./SiteFooter";
import CookieBanner from "./CookieBanner";
import HeaderNav from "./HeaderNav";

export function generateMetadata(): Metadata {
  const iconUrl = "/api/site/favicon";
  return {
    title: "Portal Direto",
    description: "Imóveis direto com o proprietário",
    icons: {
      icon: [{ url: iconUrl }],
      shortcut: [{ url: iconUrl }],
      apple: [{ url: iconUrl }],
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="overflow-x-hidden bg-gray-100 text-gray-900">
        <SiteThemeSync />
        <SiteFaviconSync />

        <header className="site-header sticky top-0 z-40 border-b border-slate-200/70 backdrop-blur-md bg-white/85">
          <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
            <SiteBrand />
            <HeaderNav />
          </div>
        </header>

        <main>{children}</main>
        <SiteFooter />
        <CookieBanner />
      </body>
    </html>
  );
}
