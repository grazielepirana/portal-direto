"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

type SectionKey =
  | "perfil"
  | "notificacoes"
  | "privacidade"
  | "preferencias"
  | "ajuda"
  | "conta";

type SectionDef = {
  key: SectionKey;
  label: string;
};

const SECTIONS: SectionDef[] = [
  { key: "perfil", label: "Perfil" },
  { key: "notificacoes", label: "Notificações" },
  { key: "privacidade", label: "Privacidade e segurança" },
  { key: "preferencias", label: "Preferências do anúncio" },
  { key: "ajuda", label: "Ajuda" },
  { key: "conta", label: "Conta" },
];

const STORAGE_KEY = "portal_settings_ui_v1";

function SidebarItem({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${
        active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
      }`}
    >
      {label}
    </button>
  );
}

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="!mt-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-slate-950">{title}</h2>
      {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

function DangerConfirmModal({
  open,
  loading,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [confirmText, setConfirmText] = useState("");

  if (!open) return null;

  function handleClose() {
    setConfirmText("");
    onCancel();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-slate-950">Confirmar exclusão da conta</h3>
        <p className="mt-2 text-sm text-slate-600">
          Esta ação é permanente. Para confirmar, digite <b>DELETAR</b> abaixo.
        </p>
        <input
          type="text"
          value={confirmText}
          onChange={(event) => setConfirmText(event.target.value)}
          className="mt-4 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900"
          placeholder="Digite DELETAR"
        />
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="h-10 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={confirmText !== "DELETAR" || loading}
            onClick={onConfirm}
            className="h-10 rounded-xl bg-[#dc2626] px-4 text-sm font-semibold text-white hover:bg-[#b91c1c] disabled:opacity-50"
          >
            {loading ? "Deletando..." : "Confirmar exclusão"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ConfiguracoesPage() {
  const [loading, setLoading] = useState(true);
  const [logged, setLogged] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SectionKey>("perfil");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileCity, setProfileCity] = useState("");
  const [profileBio, setProfileBio] = useState("");

  const [notifChat, setNotifChat] = useState(true);
  const [notifInterest, setNotifInterest] = useState(true);
  const [notifFav, setNotifFav] = useState(true);
  const [notifUpdates, setNotifUpdates] = useState(false);

  const [showFullAddress, setShowFullAddress] = useState(false);
  const [contactPreference, setContactPreference] = useState<"chat" | "whatsapp" | "ambos">(
    "ambos"
  );

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setLogged(Boolean(data.user));
      setEmail(data.user?.email ?? null);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace("#", "") as SectionKey;
    if (SECTIONS.some((item) => item.key === hash)) {
      setActiveSection(hash);
    }

    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      setProfileName(String(parsed.profileName ?? ""));
      setProfilePhone(String(parsed.profilePhone ?? ""));
      setProfileCity(String(parsed.profileCity ?? ""));
      setProfileBio(String(parsed.profileBio ?? ""));
      setNotifChat(Boolean(parsed.notifChat ?? true));
      setNotifInterest(Boolean(parsed.notifInterest ?? true));
      setNotifFav(Boolean(parsed.notifFav ?? true));
      setNotifUpdates(Boolean(parsed.notifUpdates ?? false));
      setShowFullAddress(Boolean(parsed.showFullAddress ?? false));
      const pref = String(parsed.contactPreference ?? "ambos");
      if (pref === "chat" || pref === "whatsapp" || pref === "ambos") {
        setContactPreference(pref);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        profileName,
        profilePhone,
        profileCity,
        profileBio,
        notifChat,
        notifInterest,
        notifFav,
        notifUpdates,
        showFullAddress,
        contactPreference,
      })
    );
  }, [
    profileName,
    profilePhone,
    profileCity,
    profileBio,
    notifChat,
    notifInterest,
    notifFav,
    notifUpdates,
    showFullAddress,
    contactPreference,
  ]);

  const activeLabel = useMemo(
    () => SECTIONS.find((item) => item.key === activeSection)?.label ?? "Configurações",
    [activeSection]
  );

  function selectSection(section: SectionKey) {
    setActiveSection(section);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${section}`);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  async function performDeleteAccount() {
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
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
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
    return <main className="min-h-screen p-8">Carregando configurações...</main>;
  }

  if (!logged) {
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
    <main className="min-h-[calc(100vh-96px)] bg-[#F8FAFC] px-4 py-6 lg:px-8 lg:py-8">
      <div className="mx-auto w-full max-w-7xl">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-24 self-start rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h1 className="text-xl font-bold text-slate-950 mb-4">Configurações</h1>
            <nav className="hidden lg:grid gap-1" aria-label="Menu de configurações">
              {SECTIONS.map((section) => (
                <SidebarItem
                  key={section.key}
                  label={section.label}
                  active={activeSection === section.key}
                  onClick={() => selectSection(section.key)}
                />
              ))}
            </nav>
            <div className="lg:hidden overflow-x-auto -mx-2 px-2">
              <div className="flex w-max gap-2">
                {SECTIONS.map((section) => (
                  <button
                    key={section.key}
                    type="button"
                    onClick={() => selectSection(section.key)}
                    aria-current={activeSection === section.key ? "page" : undefined}
                    className={`h-9 rounded-full px-4 text-sm font-semibold ${
                      activeSection === section.key
                        ? "bg-slate-900 text-white"
                        : "border border-slate-300 text-slate-700"
                    }`}
                  >
                    {section.label}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <section className="min-h-[620px] space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-600">Seção ativa</p>
              <p className="text-xl font-bold text-slate-950">{activeLabel}</p>
            </div>

            {activeSection === "perfil" ? (
              <SettingsSection
                title="Perfil"
                description="Atualize suas informações públicas para aparecer nos anúncios."
              >
                <p className="text-sm text-slate-700">Conta conectada: <b>{email}</b></p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <input
                    className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900"
                    placeholder="Nome público"
                    value={profileName}
                    onChange={(event) => setProfileName(event.target.value)}
                  />
                  <input
                    className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900"
                    placeholder="Telefone/WhatsApp"
                    value={profilePhone}
                    onChange={(event) => setProfilePhone(event.target.value)}
                  />
                  <input
                    className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 md:col-span-2"
                    placeholder="Cidade base"
                    value={profileCity}
                    onChange={(event) => setProfileCity(event.target.value)}
                  />
                  <textarea
                    className="min-h-28 rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 md:col-span-2"
                    placeholder="Bio curta"
                    value={profileBio}
                    onChange={(event) => setProfileBio(event.target.value)}
                  />
                </div>
                <button
                  type="button"
                  disabled
                  className="h-11 rounded-xl bg-slate-300 px-4 text-sm font-semibold text-white cursor-not-allowed"
                >
                  Salvar alterações (Em breve)
                </button>
              </SettingsSection>
            ) : null}

            {activeSection === "notificacoes" ? (
              <SettingsSection
                title="Notificações"
                description="Escolha como você quer ser avisado sobre seus anúncios."
              >
                {[
                  ["Novas mensagens no chat", notifChat, setNotifChat],
                  ["Interesse no anúncio", notifInterest, setNotifInterest],
                  ["Favoritaram meu imóvel", notifFav, setNotifFav],
                  ["Atualizações do anúncio", notifUpdates, setNotifUpdates],
                ].map(([label, value, setter]) => (
                  <label
                    key={String(label)}
                    className="flex items-center justify-between rounded-xl border border-slate-200 p-3"
                  >
                    <span className="text-sm font-medium text-slate-800">{String(label)}</span>
                    <button
                      type="button"
                      onClick={() => (setter as React.Dispatch<React.SetStateAction<boolean>>)(!Boolean(value))}
                      className={`relative h-7 w-12 rounded-full transition ${
                        value ? "bg-slate-900" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                          value ? "right-1" : "left-1"
                        }`}
                      />
                    </button>
                  </label>
                ))}
              </SettingsSection>
            ) : null}

            {activeSection === "privacidade" ? (
              <SettingsSection
                title="Privacidade e segurança"
                description="Gerencie sessões e segurança da sua conta."
              >
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="font-semibold text-slate-900">Sessões ativas</p>
                  <p className="mt-1 text-sm text-slate-600">Em breve</p>
                  <button
                    type="button"
                    disabled
                    className="mt-3 h-10 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-500 cursor-not-allowed"
                  >
                    Gerenciar sessões (Em breve)
                  </button>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="font-semibold text-slate-900">Alterar senha</p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordForm((prev) => !prev);
                      setPasswordMessage(null);
                    }}
                    className="mt-3 h-10 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {showPasswordForm ? "Fechar" : "Alterar senha"}
                  </button>

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
                      <div className="md:col-span-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleChangePassword}
                          disabled={changingPassword}
                          className="h-10 rounded-xl bg-[#dc2626] px-4 text-sm font-semibold text-white hover:bg-[#b91c1c] disabled:opacity-60"
                        >
                          {changingPassword ? "Salvando..." : "Salvar nova senha"}
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {passwordMessage ? (
                    <p className="mt-3 text-sm text-slate-700">{passwordMessage}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Sair da conta
                </button>
              </SettingsSection>
            ) : null}

            {activeSection === "preferencias" ? (
              <SettingsSection
                title="Preferências do anúncio"
                description="Defina preferências para exibição e contato dos seus anúncios."
              >
                <label className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                  <span className="text-sm font-medium text-slate-800">Mostrar endereço completo</span>
                  <button
                    type="button"
                    onClick={() => setShowFullAddress((prev) => !prev)}
                    className={`relative h-7 w-12 rounded-full transition ${
                      showFullAddress ? "bg-slate-900" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                        showFullAddress ? "right-1" : "left-1"
                      }`}
                    />
                  </button>
                </label>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-800">
                    Preferência de contato
                  </label>
                  <select
                    value={contactPreference}
                    onChange={(event) =>
                      setContactPreference(event.target.value as "chat" | "whatsapp" | "ambos")
                    }
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900"
                  >
                    <option value="chat">Chat</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="ambos">Ambos</option>
                  </select>
                </div>
              </SettingsSection>
            ) : null}

            {activeSection === "ajuda" ? (
              <SettingsSection title="Ajuda" description="Acesse conteúdos e canais de suporte.">
                <Link href="/central-de-ajuda" className="block rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Central de ajuda
                </Link>
                <Link href="/termos-e-privacidade" className="block rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Política de Privacidade
                </Link>
              </SettingsSection>
            ) : null}

            {activeSection === "conta" ? (
              <section className="!mt-0 rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold text-slate-950">Conta (Zona de perigo)</h2>
                <p className="mt-1 text-sm text-red-700">
                  Ao deletar a conta, seus dados e anúncios serão removidos permanentemente.
                </p>
                <div className="mt-5">
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(true)}
                    disabled={deleting}
                    className="h-11 rounded-xl bg-[#dc2626] px-4 text-sm font-semibold text-white hover:bg-[#b91c1c] disabled:opacity-60"
                  >
                    {deleting ? "Deletando conta..." : "Deletar conta"}
                  </button>
                </div>
              </section>
            ) : null}

            {message ? (
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                {message}
              </div>
            ) : null}
          </section>
        </div>
      </div>

      <DangerConfirmModal
        open={showDeleteModal}
        loading={deleting}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={performDeleteAccount}
      />
    </main>
  );
}
