"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { isAdminEmail } from "../../../lib/site-settings";
import {
  DEFAULT_BLOG_POSTS,
  deleteBlogPost,
  loadBlogPosts,
  saveBlogPost,
  slugify,
  type BlogPost,
} from "../../../lib/blog-posts";

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function uploadBlogImage(file: File) {
  const safeName = sanitizeFileName(file.name);
  const path = `blog/${Date.now()}-${crypto.randomUUID()}-${safeName}`;

  const { error } = await supabase.storage
    .from("blog-assets")
    .upload(path, file, { upsert: false, cacheControl: "3600" });

  if (error) {
    throw new Error(
      "Não foi possível enviar a imagem. Verifique bucket/policies do Storage para 'blog-assets'."
    );
  }

  const { data } = supabase.storage.from("blog-assets").getPublicUrl(path);
  return data.publicUrl;
}

function createEmptyPost(index: number): BlogPost {
  return {
    id: `blog-${Date.now()}-${index}`,
    slug: "",
    title: "",
    excerpt: "",
    content: "",
    cover_image_url: "",
    published: true,
    sort_order: index,
  };
}

export default function AdminBlogPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const email = data.user?.email ?? null;

      if (!email || !isAdminEmail(email)) {
        router.replace("/admin/login");
        return;
      }

      const loaded = await loadBlogPosts(true);
      setPosts(loaded.length > 0 ? loaded : DEFAULT_BLOG_POSTS);
      setLoading(false);
    })();
  }, [router]);

  async function handleSaveAll() {
    setSaving(true);
    setMsg(null);

    try {
      for (let i = 0; i < posts.length; i += 1) {
        const post = posts[i];
        const safeTitle = post.title.trim();
        if (!safeTitle) continue;

        await saveBlogPost({
          ...post,
          slug: post.slug?.trim() ? slugify(post.slug) : slugify(safeTitle),
          sort_order: i + 1,
        });
      }

      setMsg("✅ Artigos salvos com sucesso.");
    } catch (err: unknown) {
      setMsg(
        err instanceof Error
          ? `${err.message}. Se necessário, crie a tabela blog_posts no Supabase.`
          : "Erro ao salvar artigos."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleImageUpload(index: number, file: File | null) {
    if (!file) return;

    try {
      const url = await uploadBlogImage(file);
      setPosts((prev) =>
        prev.map((post, i) => (i === index ? { ...post, cover_image_url: url } : post))
      );
      setMsg("Imagem enviada com sucesso.");
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Erro ao enviar imagem.");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteBlogPost(id);
      setPosts((prev) => prev.filter((post) => post.id !== id));
      setMsg("Artigo removido.");
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Erro ao remover artigo.");
    }
  }

  if (loading) {
    return <main className="min-h-screen p-8">Carregando editor de blog...</main>;
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-lg p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Admin Blog</h1>
            <p className="text-slate-700">Edite títulos, conteúdo e imagens dos artigos.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/admin" className="border px-4 py-2 rounded-xl font-semibold hover:bg-gray-50">
              Voltar ao Admin
            </Link>
            <button
              onClick={() => setPosts((prev) => [...prev, createEmptyPost(prev.length + 1)])}
              className="border px-4 py-2 rounded-xl font-semibold hover:bg-gray-50"
            >
              Novo artigo
            </button>
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="bg-black text-white px-4 py-2 rounded-xl hover:bg-gray-800 disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Salvar tudo"}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {posts.map((post, index) => (
            <section key={post.id} className="border border-slate-200 rounded-xl p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  className="border border-slate-400 text-slate-950 p-3 rounded-lg"
                  placeholder="Título"
                  value={post.title}
                  onChange={(e) =>
                    setPosts((prev) =>
                      prev.map((p, i) => (i === index ? { ...p, title: e.target.value } : p))
                    )
                  }
                />

                <input
                  className="border border-slate-400 text-slate-950 p-3 rounded-lg"
                  placeholder="Slug (opcional)"
                  value={post.slug}
                  onChange={(e) =>
                    setPosts((prev) =>
                      prev.map((p, i) => (i === index ? { ...p, slug: e.target.value } : p))
                    )
                  }
                />

                <input
                  className="md:col-span-2 border border-slate-400 text-slate-950 p-3 rounded-lg"
                  placeholder="Resumo curto"
                  value={post.excerpt}
                  onChange={(e) =>
                    setPosts((prev) =>
                      prev.map((p, i) => (i === index ? { ...p, excerpt: e.target.value } : p))
                    )
                  }
                />

                <textarea
                  className="md:col-span-2 border border-slate-400 text-slate-950 p-3 rounded-lg min-h-40"
                  placeholder="Conteúdo do artigo"
                  value={post.content}
                  onChange={(e) =>
                    setPosts((prev) =>
                      prev.map((p, i) => (i === index ? { ...p, content: e.target.value } : p))
                    )
                  }
                />

                <div className="md:col-span-2 border border-slate-300 rounded-lg p-3">
                  <label className="block font-semibold mb-2">Foto de capa do artigo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(index, e.target.files?.[0] ?? null)}
                  />
                  {post.cover_image_url ? (
                    <img
                      src={post.cover_image_url}
                      alt="Capa do artigo"
                      className="mt-3 h-40 w-full object-cover rounded-lg"
                    />
                  ) : null}
                </div>

                <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={post.published}
                    onChange={(e) =>
                      setPosts((prev) =>
                        prev.map((p, i) => (i === index ? { ...p, published: e.target.checked } : p))
                      )
                    }
                  />
                  Publicado
                </label>

                <button
                  onClick={() => handleDelete(post.id)}
                  className="border border-red-300 text-red-700 px-3 py-2 rounded-lg font-semibold hover:bg-red-50"
                >
                  Excluir artigo
                </button>
              </div>
            </section>
          ))}
        </div>

        {msg && <div className="mt-4 text-sm rounded-lg border p-3 bg-gray-50">{msg}</div>}
      </div>
    </main>
  );
}
