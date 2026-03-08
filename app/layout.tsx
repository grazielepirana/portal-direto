import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import AuthButton from "./AuthButton";
import SiteThemeSync from "./SiteThemeSync";
import SiteFaviconSync from "./SiteFaviconSync";
import SiteBrand from "./SiteBrand";
import SiteFooter from "./SiteFooter";
import CookieBanner from "./CookieBanner";

async function loadFaviconFromSettings() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return { url: "", version: "" };

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/site_settings?id=eq.1&select=favicon_url,updated_at`,
      {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) return { url: "", version: "" };
    const data = (await response.json()) as Array<{
      favicon_url?: string | null;
      updated_at?: string | null;
    }>;
    const url = String(data?.[0]?.favicon_url ?? "").trim();
    const version = String(data?.[0]?.updated_at ?? "").trim();
    return { url, version };
  } catch {
    return { url: "", version: "" };
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const favicon = await loadFaviconFromSettings();
  const iconUrl = favicon.url
    ? `${favicon.url}${favicon.url.includes("?") ? "&" : "?"}v=${encodeURIComponent(
        favicon.version || "1"
      )}`
    : undefined;

  return {
    title: "Portal Direto",
    description: "Imóveis direto com o proprietário",
    icons: iconUrl
      ? {
          icon: [{ url: iconUrl }],
          shortcut: [{ url: iconUrl }],
          apple: [{ url: iconUrl }],
        }
      : undefined,
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-gray-100 text-gray-900">
        <SiteThemeSync />
        <SiteFaviconSync />

        <header className="site-header sticky top-0 z-40 border-b border-slate-200/70 backdrop-blur-md bg-white/85">
          <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
            <SiteBrand />

            <nav className="flex items-center gap-2 sm:gap-3">
              <Link href="/imoveis?kind=venda" className="site-nav-link hidden font-medium lg:inline-flex">
                Comprar
              </Link>

              <Link href="/imoveis?kind=locacao" className="site-nav-link hidden font-medium lg:inline-flex">
                Alugar
              </Link>

              <Link href="/chat" className="site-nav-link hidden font-medium xl:inline-flex">
                Chat
              </Link>

              <Link href="/favoritos" className="site-nav-link hidden font-medium xl:inline-flex">
                Favoritos
              </Link>

              <Link href="/anunciar" className="cta-primary inline-flex h-10 items-center rounded-xl px-3 text-xs font-semibold transition sm:h-auto sm:px-4 sm:py-2 sm:text-sm">
                <span className="sm:hidden">Cadastrar</span>
                <span className="hidden sm:inline">Cadastrar Imóvel</span>
              </Link>

              <AuthButton />
            </nav>
          </div>
        </header>

        <main>{children}</main>
        <SiteFooter />
        <CookieBanner />
      </body>
    </html>
  );
}
