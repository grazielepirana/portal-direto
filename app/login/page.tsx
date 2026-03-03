"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { upsertProfile } from "../../lib/profiles";

function isEmailValid(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function mapAuthError(message: string) {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid_credentials")
  ) {
    return "E-mail ou senha inválidos.";
  }
  if (
    normalized.includes("email not confirmed") ||
    normalized.includes("email_not_confirmed")
  ) {
    return "Seu e-mail ainda não foi confirmado.";
  }
  if (normalized.includes("password should be at least")) {
    return "A senha deve ter pelo menos 6 caracteres.";
  }
  if (normalized.includes("invalid email")) {
    return "Digite um e-mail válido.";
  }
  if (normalized.includes("too many requests")) {
    return "Muitas tentativas. Tente novamente em alguns minutos.";
  }

  return "Não foi possível autenticar agora. Tente novamente.";
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [isAdult, setIsAdult] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendingConfirmation, setResendingConfirmation] = useState(false);
  const [allowResendConfirmation, setAllowResendConfirmation] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const isLoginValid = useMemo(
    () => isEmailValid(email) && password.trim().length >= 6,
    [email, password]
  );
  const isSignupValid = useMemo(
    () =>
      fullName.trim().length >= 2 &&
      isEmailValid(email) &&
      password.trim().length >= 6 &&
      isAdult,
    [fullName, email, password, isAdult]
  );
  const isFormValid = mode === "login" ? isLoginValid : isSignupValid;

  function switchMode(next: "login" | "signup") {
    setMode(next);
    setMsg(null);
    setAllowResendConfirmation(false);
    if (next === "login") setIsAdult(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setAllowResendConfirmation(false);
    setLoading(true);

    try {
      if (mode === "signup") {
        if (!fullName.trim()) {
          setMsg("Preencha seu nome para criar a conta.");
          return;
        }
        if (!isAdult) {
          setMsg("Para se cadastrar, confirme que você é maior de 18 anos.");
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

        setMsg("Conta criada! Verifique seu e-mail para confirmar o cadastro.");
        switchMode("login");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          const message = mapAuthError(error.message ?? "Erro ao autenticar.");
          if (message.includes("ainda não foi confirmado")) {
            setAllowResendConfirmation(true);
          }
          setMsg(message);
          return;
        }

        const userId = data.user?.id;
        const metadataName = String(data.user?.user_metadata?.full_name ?? "").trim();
        if (userId && metadataName) {
          await upsertProfile(userId, metadataName);
        }

        setMsg("Login feito com sucesso!");
        router.replace("/");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? mapAuthError(err.message) : "Erro ao autenticar.";
      setMsg(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResendConfirmation() {
    if (!isEmailValid(email)) {
      setMsg("Digite o mesmo e-mail da conta para reenviar a confirmação.");
      return;
    }

    setResendingConfirmation(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
      });
      if (error) {
        setMsg(mapAuthError(error.message ?? "Erro ao reenviar confirmação."));
        return;
      }
      setMsg("Enviamos um novo e-mail de confirmação. Verifique sua caixa de entrada.");
      setAllowResendConfirmation(false);
    } finally {
      setResendingConfirmation(false);
    }
  }

  async function handleForgotPassword() {
    if (!isEmailValid(email)) {
      setMsg("Digite seu e-mail no campo acima para recuperar a senha.");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/login`,
    });
    if (error) {
      setMsg(mapAuthError(error.message ?? "Erro ao enviar recuperação de senha."));
      return;
    }
    setMsg("Enviamos um link para redefinir sua senha.");
  }

  return (
    <main className="min-h-screen bg-[var(--site-bg)] px-4 py-10 md:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-140px)] w-full max-w-[460px] items-center justify-center">
        <div className="w-full rounded-3xl border border-slate-200 bg-white p-7 shadow-[0_18px_50px_rgba(15,23,42,0.12)] md:p-9">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-xl font-extrabold text-white">
              PD
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">
              {mode === "login" ? "Entrar" : "Criar conta"}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
          {mode === "login"
            ? "Acesse para conversar e cadastrar imóveis."
            : "Crie sua conta para anunciar e conversar direto."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" ? (
              <>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-800">Nome completo</label>
                  <input
                    className="h-12 w-full rounded-xl border border-slate-300 px-3 text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                    type="text"
                    placeholder="Seu nome"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    autoComplete="name"
                  />
                </div>
                <label className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={isAdult}
                    onChange={(e) => setIsAdult(e.target.checked)}
                  />
                  <span>Declaro que sou maior de 18 anos.</span>
                </label>
              </>
            ) : null}

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-800">E-mail</label>
              <input
                className="h-12 w-full rounded-xl border border-slate-300 px-3 text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                type="email"
                placeholder="voce@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-800">Senha</label>
              <div className="flex h-12 items-center rounded-xl border border-slate-300 focus-within:border-slate-500 focus-within:ring-2 focus-within:ring-slate-200">
                <input
                  className="h-full w-full rounded-l-xl px-3 text-slate-900 outline-none"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="mr-2 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  {showPassword ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            </div>

            <button
              disabled={loading || !isFormValid}
              className="cta-primary h-12 w-full rounded-xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Entrando..." : mode === "login" ? "Entrar" : "Criar conta"}
            </button>
          </form>

          <div className="mt-4 flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={handleForgotPassword}
              className="font-semibold text-slate-700 underline hover:text-slate-900"
            >
              Esqueci minha senha
            </button>
            {mode === "login" ? (
              <span className="text-slate-600">
                Não tem conta?{" "}
                <button
                  type="button"
                  className="font-semibold text-slate-800 underline"
                  onClick={() => switchMode("signup")}
                >
                  Criar conta
                </button>
              </span>
            ) : (
              <span className="text-slate-600">
                Já tem conta?{" "}
                <button
                  type="button"
                  className="font-semibold text-slate-800 underline"
                  onClick={() => switchMode("login")}
                >
                  Entrar
                </button>
              </span>
            )}
          </div>

          {allowResendConfirmation ? (
            <button
              type="button"
              onClick={handleResendConfirmation}
              disabled={resendingConfirmation}
              className="mt-4 h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {resendingConfirmation ? "Reenviando..." : "Reenviar confirmação de e-mail"}
            </button>
          ) : null}

          {msg ? (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              {msg}
            </div>
          ) : null}

          <p className="mt-5 text-center text-xs text-slate-500">
            Ao continuar, você concorda com nossos{" "}
            <Link href="/termos-e-privacidade" className="font-semibold underline">
              Termos e Privacidade
            </Link>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
