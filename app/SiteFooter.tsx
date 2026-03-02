"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadBlogPosts, type BlogPost } from "../lib/blog-posts";
import { DEFAULT_SITE_SETTINGS, loadSiteSettings, type SiteSettings } from "../lib/site-settings";

export default function SiteFooter() {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [posts, setPosts] = useState<BlogPost[]>([]);

  useEffect(() => {
    loadSiteSettings()
      .then((loaded) => setSettings(loaded))
      .catch(() => setSettings(DEFAULT_SITE_SETTINGS));

    loadBlogPosts(false)
      .then((loaded) => setPosts(loaded.slice(0, 5)))
      .catch(() => setPosts([]));
  }, []);

  return (
    <footer
      className="mt-12 border-t border-white/10"
      style={{ background: "#0F172A", color: "#CBD5E1" }}
    >
      <div className="max-w-[1200px] mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-2 gap-10">
        <section className="!mt-0">
          <h3 className="text-lg font-bold text-white mb-4">Institucional</h3>
          <div className="space-y-2">
            <Link href="/sobre-nos" className="block text-[#E2E8F0] transition-colors hover:text-white">
              Sobre nós
            </Link>
            <Link href="/central-de-ajuda" className="block text-[#E2E8F0] transition-colors hover:text-white">
              Central de ajuda
            </Link>
            <Link href="/planos" className="block text-[#E2E8F0] transition-colors hover:text-white">
              Planos para cadastrar imóveis
            </Link>
            <Link href="/termos-e-privacidade" className="block text-[#E2E8F0] transition-colors hover:text-white">
              Termos e privacidades
            </Link>
          </div>

          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Redes sociais</p>
            <div className="flex items-center gap-3">
              <a
                href={settings.social_instagram_url || "#"}
                target={settings.social_instagram_url ? "_blank" : undefined}
                rel={settings.social_instagram_url ? "noreferrer" : undefined}
                aria-label="Instagram"
                className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-[#E2E8F0] transition-colors ${
                  settings.social_instagram_url
                    ? "hover:text-white hover:border-white/30"
                    : "opacity-40 cursor-not-allowed pointer-events-none"
                }`}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                  <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 1.5A4.25 4.25 0 0 0 3.5 7.75v8.5a4.25 4.25 0 0 0 4.25 4.25h8.5a4.25 4.25 0 0 0 4.25-4.25v-8.5a4.25 4.25 0 0 0-4.25-4.25h-8.5Zm8.9 1.1a1.15 1.15 0 1 1 0 2.3 1.15 1.15 0 0 1 0-2.3ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.5A3.5 3.5 0 1 0 12 15.5 3.5 3.5 0 0 0 12 8.5Z" />
                </svg>
              </a>
              <a
                href={settings.social_facebook_url || "#"}
                target={settings.social_facebook_url ? "_blank" : undefined}
                rel={settings.social_facebook_url ? "noreferrer" : undefined}
                aria-label="Facebook"
                className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-[#E2E8F0] transition-colors ${
                  settings.social_facebook_url
                    ? "hover:text-white hover:border-white/30"
                    : "opacity-40 cursor-not-allowed pointer-events-none"
                }`}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                  <path d="M13.5 22v-8h2.7l.4-3h-3.1V9.1c0-.9.3-1.6 1.6-1.6h1.7V4.8c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1V11H8v3h2.4v8h3.1Z" />
                </svg>
              </a>
              <a
                href={settings.social_youtube_url || "#"}
                target={settings.social_youtube_url ? "_blank" : undefined}
                rel={settings.social_youtube_url ? "noreferrer" : undefined}
                aria-label="YouTube"
                className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-[#E2E8F0] transition-colors ${
                  settings.social_youtube_url
                    ? "hover:text-white hover:border-white/30"
                    : "opacity-40 cursor-not-allowed pointer-events-none"
                }`}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                  <path d="M22 8.6a3 3 0 0 0-2.1-2.1C18 6 12 6 12 6s-6 0-7.9.5A3 3 0 0 0 2 8.6 31 31 0 0 0 2 12a31 31 0 0 0 .1 3.4 3 3 0 0 0 2.1 2.1C6 18 12 18 12 18s6 0 7.9-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 22 12a31 31 0 0 0 0-3.4ZM10 15V9l5 3-5 3Z" />
                </svg>
              </a>
            </div>
          </div>
        </section>

        <section className="!mt-0">
          <h3 className="text-lg font-bold text-white mb-3">Blog</h3>
          <div className="space-y-2">
            {posts.length === 0 ? <p className="text-[#CBD5E1]">Sem artigos publicados.</p> : null}
            {posts.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`} className="block text-[#E2E8F0] transition-colors hover:text-white">
                {post.title}
              </Link>
            ))}
            <Link href="/blog" className="block font-semibold mt-2 text-[#E2E8F0] transition-colors hover:text-white">
              Ver todos os artigos
            </Link>
          </div>
        </section>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 pb-8 pt-1 text-center text-sm text-[#CBD5E1]">
        © {new Date().getFullYear()} {settings.site_name || "Portal Direto"} — Todos os direitos reservados.
      </div>
    </footer>
  );
}
