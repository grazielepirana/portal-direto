"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { upsertProfile } from "../../lib/profiles";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        if (!fullName.trim()) {
          setMsg("Preencha seu nome para criar a conta.");
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName.trim(),
            },
          },
        });
        if (error) throw error;

        const userId = data.user?.id;
        if (userId) {
          await upsertProfile(userId, fullName);
        }

        setMsg("Conta criada! (Se confirmação por e-mail estiver ativa, verifique sua caixa.)");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        const userId = data.user?.id;
        const metadataName = String(data.user?.user_metadata?.full_name ?? "").trim();
        if (userId && metadataName) {
          await upsertProfile(userId, metadataName);
        }

        setMsg("Login feito com sucesso!");
        router.replace("/");
      }
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Erro ao autenticar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-2">{mode === "login" ? "Entrar" : "Criar conta"}</h1>
        <p className="text-gray-600 mb-6">
          {mode === "login"
            ? "Acesse para conversar e cadastrar imóveis."
            : "Crie sua conta para anunciar e conversar direto."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" ? (
            <input
              className="w-full border p-3 rounded-lg"
              type="text"
              placeholder="Nome completo"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          ) : null}
          <input className="w-full border p-3 rounded-lg" type="email" placeholder="E-mail"
            value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="w-full border p-3 rounded-lg" type="password" placeholder="Senha"
            value={password} onChange={(e) => setPassword(e.target.value)} />

          <button disabled={loading}
            className="cta-primary w-full px-4 py-3 rounded-xl transition disabled:opacity-60">
            {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
          </button>
        </form>

        <div className="mt-4 text-sm text-gray-600">
          {mode === "login" ? (
            <>Não tem conta? <button type="button" className="font-semibold underline" onClick={() => setMode("signup")}>Criar agora</button></>
          ) : (
            <>Já tem conta? <button type="button" className="font-semibold underline" onClick={() => setMode("login")}>Entrar</button></>
          )}
        </div>

        {msg && <div className="mt-4 text-sm rounded-lg border p-3 bg-gray-50">{msg}</div>}
      </div>
    </main>
  );
}
