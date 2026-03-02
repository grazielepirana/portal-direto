"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

function profileLocalKey(userId: string) {
  return `portal_profile_extra_v1:${userId}`;
}

export default function PerfilPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [cityUf, setCityUf] = useState<string>("");
  const [showPhoneOnListing, setShowPhoneOnListing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editingInfo, setEditingInfo] = useState(false);
  const [prefChat, setPrefChat] = useState(true);
  const [preferredPeriod, setPreferredPeriod] = useState<"manha" | "tarde" | "noite">("manha");
  const [statsMyListings, setStatsMyListings] = useState<number | null>(null);
  const [statsFavorites, setStatsFavorites] = useState<number | null>(null);
  const [statsMessages, setStatsMessages] = useState<number | null>(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user ?? null;
      setEmail(user?.email ?? null);
      setUserId(user?.id ?? null);

      if (!user?.id) {
        setLoading(false);
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      setFullName(String(profileData?.full_name ?? "").trim());
      setPhone(String((profileData as Record<string, unknown> | null)?.phone ?? "").trim());
      setCityUf(String((profileData as Record<string, unknown> | null)?.city_uf ?? "").trim());
      setShowPhoneOnListing(
        Boolean((profileData as Record<string, unknown> | null)?.show_phone_on_listing ?? false)
      );

      if (typeof window !== "undefined") {
        const raw = window.localStorage.getItem(profileLocalKey(user.id));
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as {
              phone?: string;
              cityUf?: string;
              showPhoneOnListing?: boolean;
            };
            if (!String((profileData as Record<string, unknown> | null)?.phone ?? "").trim()) {
              setPhone(parsed.phone ?? "");
            }
            if (!String((profileData as Record<string, unknown> | null)?.city_uf ?? "").trim()) {
              setCityUf(parsed.cityUf ?? "");
            }
            if (
              (profileData as Record<string, unknown> | null)?.show_phone_on_listing == null &&
              typeof parsed.showPhoneOnListing === "boolean"
            ) {
              setShowPhoneOnListing(parsed.showPhoneOnListing);
            }
          } catch {
            // ignore
          }
        }
      }

      const [listingsCount, favoritesCount, conversationsCount] = await Promise.all([
        supabase.from("listings").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
        supabase.from("favorites").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase
          .from("conversations")
          .select("id", { count: "exact", head: true })
          .or(`user_a.eq.${user.id},user_b.eq.${user.id}`),
      ]);

      setStatsMyListings(listingsCount.error ? null : listingsCount.count ?? 0);
      setStatsFavorites(favoritesCount.error ? null : favoritesCount.count ?? 0);
      setStatsMessages(conversationsCount.error ? null : conversationsCount.count ?? 0);
      setLoading(false);
    })();
  }, []);

  const filledFields = [fullName, email ?? "", phone, cityUf].filter((item) => item.trim().length > 0).length;
  const completionPercent = Math.round((filledFields / 4) * 100);
  const profileDisplayName = fullName.trim() || "Usuário";
  const initials = profileDisplayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  async function handleSavePersonalInfo() {
    if (!userId) return;
    setSavingProfile(true);
    setMessage(null);

    const payload = {
      user_id: userId,
      full_name: fullName.trim(),
      phone: phone.trim(),
      city_uf: cityUf.trim(),
      show_phone_on_listing: showPhoneOnListing,
    };

    let saved = false;
    let nextMessage: string | null = null;
    const fullTry = await supabase.from("profiles").upsert(payload, { onConflict: "user_id" });
    if (!fullTry.error) {
      saved = true;
    } else if (
      fullTry.error.message.toLowerCase().includes("phone") ||
      fullTry.error.message.toLowerCase().includes("city_uf") ||
      fullTry.error.message.toLowerCase().includes("show_phone_on_listing")
    ) {
      const fallback = await supabase.from("profiles").upsert(
        {
          user_id: userId,
          full_name: fullName.trim(),
        },
        { onConflict: "user_id" }
      );
      if (!fallback.error) {
        saved = true;
        nextMessage =
          "Nome salvo. Para salvar telefone/cidade e exibir telefone no anúncio, adicione as colunas phone, city_uf e show_phone_on_listing na tabela profiles."
        ;
      }
    } else {
      nextMessage = fullTry.error.message;
    }

    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        profileLocalKey(userId),
        JSON.stringify({
          phone: phone.trim(),
          cityUf: cityUf.trim(),
          showPhoneOnListing,
        })
      );
    }

    setMessage(nextMessage ?? (saved ? "Perfil atualizado com sucesso." : "Não foi possível salvar o perfil."));
    setEditingInfo(false);
    setSavingProfile(false);
  }

  async function handleDeleteAccount() {
    try {
      setDeleting(true);
      setMessage(null);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setMessage("Sessão inválida. Faça login novamente.");
        return;
      }

      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      const result = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !result.ok) {
        setMessage(result.error ?? "Não foi possível deletar a conta agora.");
        return;
      }

      await supabase.auth.signOut();
      window.location.href = "/";
    } catch {
      setMessage("Erro inesperado ao deletar a conta.");
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
      setDeleteConfirmText("");
    }
  }

  async function handleChangePassword() {
    setPasswordMessage(null);

    if (newPassword.length < 6) {
      setPasswordMessage("A nova senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage("A confirmação de senha não confere.");
      return;
    }

    try {
      setChangingPassword(true);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setPasswordMessage(error.message || "Não foi possível alterar a senha agora.");
        return;
      }

      setPasswordMessage("Senha alterada com sucesso.");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordForm(false);
    } catch {
      setPasswordMessage("Erro inesperado ao alterar a senha.");
    } finally {
      setChangingPassword(false);
    }
  }

  if (loading) {
    return <main className="min-h-screen p-8">Carregando perfil...</main>;
  }

  if (!email) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow p-6">
          <p className="font-bold">Você precisa estar logado.</p>
          <Link className="underline font-semibold" href="/login">
            Ir para login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <section className="!mt-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-900 text-xl font-bold text-white">
                {initials || "U"}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-extrabold text-slate-950">{profileDisplayName}</h1>
                  {fullName.trim() ? (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                      Conta verificada
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingInfo(true)}
                      className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Adicionar nome
                    </button>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-600">{email}</p>
              </div>
            </div>

            <div className="w-full max-w-xs">
              <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-600">
                <span>Completude do perfil</span>
                <span>{completionPercent}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-slate-900 transition-all"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-6">
            <article className="!mt-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-950">Informações pessoais</h2>
                  <p className="mt-1 text-sm text-slate-600">Dados visíveis no seu perfil de anunciante.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingInfo((prev) => !prev)}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {editingInfo ? "Fechar edição" : "Editar"}
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nome completo</p>
                  {editingInfo ? (
                    <input
                      className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      placeholder="Digite seu nome completo"
                    />
                  ) : (
                    <p className="mt-2 text-sm font-semibold text-slate-900">{fullName || "Adicionar"}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Telefone / WhatsApp</p>
                  {editingInfo ? (
                    <input
                      className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="Digite seu telefone"
                    />
                  ) : (
                    <p className="mt-2 text-sm font-semibold text-slate-900">{phone || "Adicionar"}</p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cidade / UF</p>
                  {editingInfo ? (
                    <input
                      className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900"
                      value={cityUf}
                      onChange={(event) => setCityUf(event.target.value)}
                      placeholder="Digite sua cidade/UF"
                    />
                  ) : (
                    <p className="mt-2 text-sm font-semibold text-slate-900">{cityUf || "Adicionar"}</p>
                  )}
                </div>
              </div>
              {editingInfo ? (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSavePersonalInfo}
                    disabled={savingProfile}
                    className="cta-primary inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold disabled:opacity-60"
                  >
                    {savingProfile ? "Salvando..." : "Salvar alterações"}
                  </button>
                </div>
              ) : null}
            </article>

            <article className="!mt-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
              <h2 className="text-xl font-bold text-slate-950">Preferências de contato</h2>
              <p className="mt-1 text-sm text-slate-600">Defina como prefere receber o primeiro contato.</p>

              <div className="mt-5 space-y-3">
                <label className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                  <span className="text-sm font-semibold text-slate-800">Mostrar telefone no anúncio</span>
                  <button
                    type="button"
                    onClick={() => setShowPhoneOnListing((prev) => !prev)}
                    className={`relative h-7 w-12 rounded-full transition ${showPhoneOnListing ? "bg-slate-900" : "bg-slate-300"}`}
                  >
                    <span
                      className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${showPhoneOnListing ? "right-1" : "left-1"}`}
                    />
                  </button>
                </label>
                <label className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                  <span className="text-sm font-semibold text-slate-800">Receber mensagens no chat</span>
                  <button
                    type="button"
                    onClick={() => setPrefChat((prev) => !prev)}
                    className={`relative h-7 w-12 rounded-full transition ${prefChat ? "bg-slate-900" : "bg-slate-300"}`}
                  >
                    <span
                      className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${prefChat ? "right-1" : "left-1"}`}
                    />
                  </button>
                </label>
              </div>

              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Horário preferido</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: "manha", label: "Manhã" },
                    { id: "tarde", label: "Tarde" },
                    { id: "noite", label: "Noite" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setPreferredPeriod(item.id as "manha" | "tarde" | "noite")}
                      className={`h-9 rounded-full px-4 text-sm font-semibold transition ${
                        preferredPeriod === item.id
                          ? "bg-slate-900 text-white"
                          : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleSavePersonalInfo}
                  disabled={savingProfile}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  {savingProfile ? "Salvando..." : "Salvar preferências"}
                </button>
              </div>
            </article>

            <article className="!mt-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
              <h2 className="text-xl font-bold text-slate-950">Segurança</h2>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordForm((prev) => !prev);
                    setPasswordMessage(null);
                  }}
                  className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {showPasswordForm ? "Fechar senha" : "Trocar senha"}
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Sair da conta
                </button>
              </div>

              {showPasswordForm ? (
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900"
                    placeholder="Nova senha"
                  />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900"
                    placeholder="Confirmar nova senha"
                  />
                  <div className="md:col-span-2">
                    <button
                      type="button"
                      onClick={handleChangePassword}
                      disabled={changingPassword}
                      className="cta-primary h-10 rounded-xl px-4 text-sm font-semibold disabled:opacity-60"
                    >
                      {changingPassword ? "Salvando..." : "Salvar nova senha"}
                    </button>
                  </div>
                </div>
              ) : null}

              {passwordMessage ? (
                <p className="mt-3 text-sm text-slate-700">{passwordMessage}</p>
              ) : null}
            </article>
          </div>

          <aside className="!mt-0 space-y-6">
            <article className="!mt-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">Atividade</h2>
              <div className="mt-4 grid grid-cols-1 gap-3">
                {[
                  { label: "Meus imóveis", value: statsMyListings },
                  { label: "Favoritos", value: statsFavorites },
                  { label: "Mensagens", value: statsMessages },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
                    <p className="mt-1 text-2xl font-extrabold text-slate-950">
                      {typeof item.value === "number" ? item.value : "—"}
                    </p>
                  </div>
                ))}
              </div>
            </article>

            <article className="!mt-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">Ações da conta</h2>
              <p className="mt-1 text-sm text-slate-600">
                A exclusão é permanente e remove seus dados e anúncios.
              </p>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                disabled={deleting}
                className="mt-4 h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {deleting ? "Deletando..." : "Deletar conta"}
              </button>
            </article>
          </aside>
        </section>

        {message ? (
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
            {message}
          </div>
        ) : null}
      </div>

      {showDeleteModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
          onClick={() => {
            setShowDeleteModal(false);
            setDeleteConfirmText("");
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-slate-950">Confirmar exclusão da conta</h3>
            <p className="mt-2 text-sm text-slate-600">
              Esta ação é permanente. Digite <b>DELETAR</b> para confirmar.
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(event) => setDeleteConfirmText(event.target.value)}
              className="mt-4 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900"
              placeholder="Digite DELETAR"
            />
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText("");
                }}
                className="h-10 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleteConfirmText !== "DELETAR" || deleting}
                onClick={handleDeleteAccount}
                className="h-10 rounded-xl bg-[#dc2626] px-4 text-sm font-semibold text-white hover:bg-[#b91c1c] disabled:opacity-50"
              >
                {deleting ? "Deletando..." : "Confirmar exclusão"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
