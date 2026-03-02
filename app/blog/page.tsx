"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadBlogPosts, type BlogPost } from "../../lib/blog-posts";

function inferCategory(title: string) {
  const normalized = title.toLowerCase();
  if (normalized.includes("dica")) return "Dicas";
  if (normalized.includes("document")) return "Documentação";
  if (normalized.includes("tecnic")) return "Venda";
  if (normalized.includes("modelo")) return "Anúncios";
  return "Mercado";
}

function formatDateBR(value?: string) {
  if (!value) return "Atualizado recentemente";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Atualizado recentemente";
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBlogPosts(false)
      .then((loaded) => setPosts(loaded))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-white">
      <header className="border-b border-slate-200 bg-white px-4 py-16 md:px-6 md:py-20">
        <div className="mx-auto w-full max-w-6xl text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-950 md:text-5xl">
            Blog Portal Direto
          </h1>
          <p className="mx-auto mt-4 max-w-3xl text-base text-slate-600 md:text-lg">
            Dicas para vender, comprar e anunciar imóveis direto com o proprietário.
          </p>
        </div>
      </header>

      <section className="px-4 py-10 md:px-6 md:py-14">
        <div className="mx-auto w-full max-w-6xl">
          {loading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={`blog-skeleton-${index}`}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="h-48 animate-pulse bg-slate-200" />
                  <div className="space-y-3 p-5">
                    <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
                    <div className="h-6 w-4/5 animate-pulse rounded bg-slate-200" />
                    <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
                    <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
                  </div>
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
              <p className="text-slate-700">Nenhum artigo publicado.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {posts.map((post) => {
                const category = inferCategory(post.title);
                return (
                  <article
                    key={post.id}
                    className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_32px_rgba(15,23,42,0.12)]"
                  >
                    {post.cover_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={post.cover_image_url}
                        alt={post.title}
                        className="h-52 w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-52 items-center justify-center bg-slate-100 text-sm font-semibold text-slate-500">
                        Portal Direto Blog
                      </div>
                    )}

                    <div className="flex flex-1 flex-col p-5">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          {category}
                        </span>
                        <span className="text-xs text-slate-500">{formatDateBR(post.updated_at)}</span>
                      </div>

                      <h2 className="line-clamp-2 text-xl font-bold leading-tight text-slate-950">
                        {post.title}
                      </h2>
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{post.excerpt}</p>

                      <Link
                        href={`/blog/${post.slug}`}
                        className="mt-5 inline-flex items-center text-sm font-semibold text-slate-900 transition group-hover:text-red-600"
                      >
                        Ler artigo
                        <span className="ml-1 transition group-hover:translate-x-0.5">→</span>
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
