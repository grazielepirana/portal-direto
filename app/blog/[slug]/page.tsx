"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { loadBlogPosts, type BlogPost } from "../../../lib/blog-posts";

function formatDateBR(value?: string) {
  if (!value) return "Atualizado recentemente";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Atualizado recentemente";
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function readingTime(content: string) {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return `${minutes} min leitura`;
}

function inferCategory(title: string) {
  const normalized = title.toLowerCase();
  if (normalized.includes("dica")) return "Dicas";
  if (normalized.includes("document")) return "Documentação";
  if (normalized.includes("tecnic")) return "Venda";
  if (normalized.includes("modelo")) return "Anúncios";
  return "Mercado";
}

export default function BlogArticlePage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBlogPosts(false)
      .then((loaded) => setPosts(loaded))
      .finally(() => setLoading(false));
  }, []);

  const post = useMemo(() => posts.find((p) => p.slug === slug), [posts, slug]);
  const recentPosts = useMemo(() => posts.filter((p) => p.slug !== slug).slice(0, 4), [posts, slug]);

  if (loading) {
    return (
      <main className="min-h-screen bg-white px-4 py-8 md:px-6 md:py-10">
        <div className="mx-auto w-full max-w-6xl grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-4">
            <div className="h-6 w-40 animate-pulse rounded bg-slate-200" />
            <div className="h-12 w-4/5 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-2/5 animate-pulse rounded bg-slate-200" />
            <div className="h-80 w-full animate-pulse rounded-2xl bg-slate-200" />
            <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
          </div>
          <aside className="hidden lg:block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
          </aside>
        </div>
      </main>
    );
  }

  if (!post) {
    return (
      <main className="min-h-screen bg-white px-4 py-8 md:px-6 md:py-10">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="font-bold text-slate-900">Artigo não encontrado.</p>
          <Link href="/blog" className="mt-3 inline-flex text-sm font-semibold text-slate-800 hover:text-red-600">
            ← Voltar para o blog
          </Link>
        </div>
      </main>
    );
  }

  const category = inferCategory(post.title);

  return (
    <main className="min-h-screen bg-white px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <article className="min-w-0">
          <Link
            href="/blog"
            className="inline-flex items-center text-sm font-semibold text-slate-700 transition hover:text-red-600"
          >
            ← Voltar para o blog
          </Link>

          <div className="mt-6 max-w-3xl">
            <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {category}
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-slate-950 md:text-5xl">
              {post.title}
            </h1>
            {post.excerpt ? <p className="mt-4 text-lg leading-8 text-slate-600">{post.excerpt}</p> : null}
            <p className="mt-4 text-sm text-slate-500">
              {formatDateBR(post.updated_at)} • {readingTime(post.content)}
            </p>
          </div>

          {post.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.cover_image_url}
              alt={post.title}
              className="mt-8 h-[420px] w-full max-w-3xl rounded-2xl object-cover shadow-sm"
            />
          ) : (
            <div className="mt-8 flex h-[320px] w-full max-w-3xl items-center justify-center rounded-2xl bg-slate-100 text-sm font-semibold text-slate-500">
              Portal Direto Blog
            </div>
          )}

          <div className="prose prose-slate mt-10 max-w-3xl whitespace-pre-line text-[16px] leading-8 text-slate-800">
            {post.content}
          </div>
        </article>

        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Posts recentes</h3>
              <div className="mt-3 space-y-3">
                {recentPosts.map((item) => (
                  <Link
                    key={item.id}
                    href={`/blog/${item.slug}`}
                    className="block rounded-lg px-2 py-1 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 hover:text-red-600"
                  >
                    {item.title}
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Categorias</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {["Venda", "Dicas", "Mercado", "Documentação", "Anúncios"].map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-600">Quer anunciar rápido com visibilidade?</p>
              <Link href="/anunciar" className="cta-primary mt-3 inline-flex h-11 w-full items-center justify-center rounded-xl px-4 text-sm font-bold">
                Cadastrar imóvel
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
