"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { isAdminEmail } from "../../../lib/site-settings";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const { data } = await supabase.auth.getUser();
      const userEmail = data.user?.email ?? null;
      if (!isAdminEmail(userEmail)) {
        await supabase.auth.signOut();
        setMsg("Este usuário não tem permissão para acessar o painel admin.");
        return;
      }

      router.push("/admin");
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Erro ao fazer login.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-2">Login Admin</h1>
        <p className="text-gray-600 mb-6">Acesso exclusivo para configurações do site.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            className="w-full border border-slate-400 text-slate-950 placeholder:text-slate-700 p-3 rounded-lg"
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="w-full border border-slate-400 text-slate-950 placeholder:text-slate-700 p-3 rounded-lg"
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            disabled={loading}
            className="w-full bg-black text-white px-4 py-3 rounded-xl hover:bg-gray-800 transition disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar no painel"}
          </button>
        </form>

        {msg && <div className="mt-4 text-sm rounded-lg border p-3 bg-gray-50">{msg}</div>}
      </div>
    </main>
  );
}
