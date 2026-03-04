"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import {
  DEFAULT_SITE_SETTINGS,
  isAdminEmail,
  loadSiteSettings,
  saveSiteSettings,
  type SiteSettings,
} from "../../lib/site-settings";
import {
  DEFAULT_LISTING_PLANS,
  loadListingPlans,
  type ListingPlan,
} from "../../lib/listing-plans";

const FONT_OPTIONS = [
  { label: "Arial (padrão)", value: "Arial, Helvetica, sans-serif" },
  { label: "Trebuchet", value: "'Trebuchet MS', 'Segoe UI', sans-serif" },
  { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
  { label: "Georgia", value: "Georgia, 'Times New Roman', serif" },
  { label: "Palatino", value: "'Palatino Linotype', 'Book Antiqua', Palatino, serif" },
  { label: "Courier New", value: "'Courier New', Courier, monospace" },
  { label: "Lucida Console", value: "'Lucida Console', Monaco, monospace" },
];

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function parseDimension(value: string, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function clampPercentage(value: number) {
  return Math.min(100, Math.max(0, value));
}

async function uploadSiteAsset(file: File, folder: "logo" | "hero" | "home-blocks" | "favicon") {
  const safeName = sanitizeFileName(file.name);
  const path = `${folder}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;

  const { error } = await supabase.storage
    .from("site-assets")
    .upload(path, file, { upsert: false, cacheControl: "3600" });

  if (error) {
    throw new Error(
      "Não foi possível enviar o arquivo. Verifique bucket/policies do Storage para 'site-assets'."
    );
  }

  const { data } = supabase.storage.from("site-assets").getPublicUrl(path);
  return data.publicUrl;
}

export default function AdminPage() {
  type AdminSection = "appearance" | "content" | "payment" | "locations" | "plans";

  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncingLocations, setSyncingLocations] = useState(false);
  const [importingLocations, setImportingLocations] = useState(false);
  const [activeSection, setActiveSection] = useState<AdminSection>("appearance");
  const [msg, setMsg] = useState<string | null>(null);
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [plans, setPlans] = useState<ListingPlan[]>(DEFAULT_LISTING_PLANS);
  const [locationsCsvFile, setLocationsCsvFile] = useState<File | null>(null);
  const [replaceLocations, setReplaceLocations] = useState(false);
  const heroPreviewRef = useRef<HTMLDivElement | null>(null);
  const [draggingHeroPreview, setDraggingHeroPreview] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const email = data.user?.email ?? null;

      if (!email || !isAdminEmail(email)) {
        router.replace("/admin/login");
        return;
      }

      const loaded = await loadSiteSettings();
      const loadedPlans = await loadListingPlans();
      setSettings(loaded);
      setPlans(loadedPlans.length > 0 ? loadedPlans : DEFAULT_LISTING_PLANS);
      setLoading(false);
    })();
  }, [router]);

  async function handleLogoUpload(file: File | null) {
    if (!file) return;
    try {
      const url = await uploadSiteAsset(file, "logo");
      setSettings((prev) => ({ ...prev, logo_url: url }));
      setMsg("Logo enviada com sucesso.");
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Erro ao enviar logo.");
    }
  }

  async function handleFaviconUpload(file: File | null) {
    if (!file) return;
    try {
      const url = await uploadSiteAsset(file, "favicon");
      setSettings((prev) => ({ ...prev, favicon_url: url }));
      setMsg("Favicon enviado com sucesso.");
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Erro ao enviar favicon.");
    }
  }

  async function handleHeroUpload(file: File | null) {
    if (!file) return;
    try {
      const url = await uploadSiteAsset(file, "hero");
      setSettings((prev) => ({ ...prev, hero_image_url: url }));
      setMsg("Foto de capa enviada com sucesso.");
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Erro ao enviar foto.");
    }
  }

  async function handleHomeBlockBgUpload(
    file: File | null,
    block: "home_info_block_1_bg_url" | "home_info_block_2_bg_url"
  ) {
    if (!file) return;
    try {
      const url = await uploadSiteAsset(file, "home-blocks");
      setSettings((prev) => ({ ...prev, [block]: url }));
      setMsg("Imagem de fundo do bloco enviada com sucesso.");
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Erro ao enviar imagem de fundo.");
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    let settingsSaved = false;
    let plansSaved = false;
    let settingsError: string | null = null;
    let plansError: string | null = null;

    try {
      await saveSiteSettings(settings);
      settingsSaved = true;
    } catch (err: unknown) {
      settingsError = err instanceof Error ? err.message : "Falha ao salvar configurações do site.";
    }

    try {
      const accessToken = await getAdminAccessToken();
      const response = await fetch("/api/admin/save-listing-plans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ plans }),
      });

      const result = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !result.ok) {
        throw new Error(result.error ?? "Falha ao salvar planos.");
      }
      plansSaved = true;
    } catch (err: unknown) {
      plansError = err instanceof Error ? err.message : "Falha ao salvar planos.";
    }

    if (settingsSaved && plansSaved) {
      setMsg("✅ Configurações salvas e atualizadas no site.");
    } else if (settingsSaved && !plansSaved) {
      setMsg(
        `✅ Configurações do site salvas. ⚠️ Os planos não foram salvos agora${
          plansError ? ` (${plansError})` : "."
        }`
      );
    } else if (!settingsSaved && plansSaved) {
      setMsg(
        `⚠️ Planos salvos, mas as configurações do site falharam${
          settingsError ? ` (${settingsError})` : "."
        }`
      );
    } else {
      setMsg(
        `Erro ao salvar configurações.${
          settingsError ? ` Site: ${settingsError}.` : ""
        }${plansError ? ` Planos: ${plansError}.` : ""}`
      );
    }

    setSaving(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  async function getAdminAccessToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("Sessão inválida. Faça login novamente.");
    }
    return session.access_token;
  }

  async function callAdminSyncApi(path: "/api/admin/sync-cities" | "/api/admin/sync-neighborhoods") {
    const accessToken = await getAdminAccessToken();

    const response = await fetch(path, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const result = (await response.json()) as { ok?: boolean; imported?: number; error?: string };
    if (!response.ok || !result.ok) {
      throw new Error(result.error ?? "Falha ao sincronizar localizações.");
    }

    return result;
  }

  async function handleSyncCities() {
    try {
      setSyncingLocations(true);
      setMsg(null);
      const result = await callAdminSyncApi("/api/admin/sync-cities");
      setMsg(`✅ Cidades importadas com sucesso: ${result.imported ?? 0}.`);
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Erro ao importar cidades.");
    } finally {
      setSyncingLocations(false);
    }
  }

  async function handleImportLocationsCsv() {
    if (!locationsCsvFile) {
      setMsg("Selecione um arquivo CSV primeiro.");
      return;
    }

    try {
      setImportingLocations(true);
      setMsg(null);

      const accessToken = await getAdminAccessToken();
      const body = new FormData();
      body.set("file", locationsCsvFile);
      body.set("replace", replaceLocations ? "true" : "false");

      const response = await fetch("/api/admin/import-locations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body,
      });

      const result = (await response.json()) as {
        ok?: boolean;
        imported?: number;
        error?: string;
      };

      if (!response.ok || !result.ok) {
        throw new Error(result.error ?? "Falha ao importar CSV.");
      }

      setMsg(`✅ Base importada via CSV: ${result.imported ?? 0} registros.`);
      setLocationsCsvFile(null);
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Erro ao importar CSV.");
    } finally {
      setImportingLocations(false);
    }
  }

  async function handleSyncNeighborhoods() {
    try {
      setSyncingLocations(true);
      setMsg(null);
      const result = await callAdminSyncApi("/api/admin/sync-neighborhoods");
      setMsg(`✅ Bairros sincronizados com sucesso: ${result.imported ?? 0}.`);
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Erro ao sincronizar bairros.");
    } finally {
      setSyncingLocations(false);
    }
  }

  function updateHeroPositionFromClientPoint(clientX: number, clientY: number) {
    if (!heroPreviewRef.current) return;
    const rect = heroPreviewRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const x = clampPercentage(((clientX - rect.left) / rect.width) * 100);
    const y = clampPercentage(((clientY - rect.top) / rect.height) * 100);

    setSettings((prev) => ({
      ...prev,
      hero_image_position_x: Math.round(x),
      hero_image_position_y: Math.round(y),
    }));
  }

  if (loading) {
    return <main className="min-h-screen p-8">Carregando painel admin...</main>;
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Painel Admin</h1>
          <div className="flex gap-2">
            <Link
              href="/admin/blog"
              className="border px-4 py-2 rounded-xl font-semibold hover:bg-gray-50"
            >
              Editar Blog
            </Link>
            <button
              onClick={handleLogout}
              className="border px-4 py-2 rounded-xl font-semibold hover:bg-gray-50"
            >
              Sair
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-6">
          <button
            type="button"
            onClick={() => setActiveSection("appearance")}
            className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
              activeSection === "appearance"
                ? "bg-black text-white border-black"
                : "bg-white text-slate-800 border-slate-300 hover:bg-slate-50"
            }`}
          >
            Cores e imagens
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("content")}
            className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
              activeSection === "content"
                ? "bg-black text-white border-black"
                : "bg-white text-slate-800 border-slate-300 hover:bg-slate-50"
            }`}
          >
            Conteúdo
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("payment")}
            className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
              activeSection === "payment"
                ? "bg-black text-white border-black"
                : "bg-white text-slate-800 border-slate-300 hover:bg-slate-50"
            }`}
          >
            Pagamentos
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("locations")}
            className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
              activeSection === "locations"
                ? "bg-black text-white border-black"
                : "bg-white text-slate-800 border-slate-300 hover:bg-slate-50"
            }`}
          >
            Localizações
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("plans")}
            className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
              activeSection === "plans"
                ? "bg-black text-white border-black"
                : "bg-white text-slate-800 border-slate-300 hover:bg-slate-50"
            }`}
          >
            Planos
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {activeSection === "content" ? (
            <div className="border border-slate-300 rounded-xl p-4 space-y-3">
              <h2 className="text-xl font-bold">Conteúdo do site</h2>
              <input
                className="w-full border border-slate-400 text-slate-950 placeholder:text-slate-700 p-3 rounded-lg"
                placeholder="Nome do site"
                value={settings.site_name}
                onChange={(e) => setSettings((p) => ({ ...p, site_name: e.target.value }))}
              />
              <textarea
                className="w-full border border-slate-400 text-slate-950 placeholder:text-slate-700 p-3 rounded-lg min-h-24"
                placeholder="Texto de Sobre nós"
                value={settings.about_text}
                onChange={(e) => setSettings((p) => ({ ...p, about_text: e.target.value }))}
              />
              <textarea
                className="w-full border border-slate-400 text-slate-950 placeholder:text-slate-700 p-3 rounded-lg min-h-24"
                placeholder="Texto de Como funciona"
                value={settings.how_it_works_text}
                onChange={(e) => setSettings((p) => ({ ...p, how_it_works_text: e.target.value }))}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  className="border border-slate-400 text-slate-950 placeholder:text-slate-700 p-3 rounded-lg"
                  placeholder="Telefone principal"
                  value={settings.support_phone_1}
                  onChange={(e) => setSettings((p) => ({ ...p, support_phone_1: e.target.value }))}
                />
                <input
                  className="border border-slate-400 text-slate-950 placeholder:text-slate-700 p-3 rounded-lg"
                  placeholder="Telefone secundário"
                  value={settings.support_phone_2}
                  onChange={(e) => setSettings((p) => ({ ...p, support_phone_2: e.target.value }))}
                />
              </div>
              <input
                className="w-full border border-slate-400 text-slate-950 placeholder:text-slate-700 p-3 rounded-lg"
                placeholder="E-mail de atendimento"
                value={settings.support_email}
                onChange={(e) => setSettings((p) => ({ ...p, support_email: e.target.value }))}
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  className="border border-slate-400 text-slate-950 placeholder:text-slate-700 p-3 rounded-lg"
                  placeholder="Link do Instagram"
                  value={settings.social_instagram_url}
                  onChange={(e) =>
                    setSettings((p) => ({ ...p, social_instagram_url: e.target.value }))
                  }
                />
                <input
                  className="border border-slate-400 text-slate-950 placeholder:text-slate-700 p-3 rounded-lg"
                  placeholder="Link do Facebook"
                  value={settings.social_facebook_url}
                  onChange={(e) =>
                    setSettings((p) => ({ ...p, social_facebook_url: e.target.value }))
                  }
                />
                <input
                  className="border border-slate-400 text-slate-950 placeholder:text-slate-700 p-3 rounded-lg"
                  placeholder="Link do YouTube"
                  value={settings.social_youtube_url}
                  onChange={(e) =>
                    setSettings((p) => ({ ...p, social_youtube_url: e.target.value }))
                  }
                />
              </div>
            </div>
          ) : null}

          {activeSection === "payment" ? (
            <div className="border border-slate-300 rounded-xl p-4">
              <h2 className="text-xl font-bold mb-1">Integração de pagamento</h2>
              <p className="text-sm text-slate-600 mb-3">
                Configure aqui como o cliente vai pagar dentro do fluxo de anúncio.
              </p>
              <label className="block text-sm font-semibold text-slate-800 mb-1">Gateway</label>
              <select
                className="w-full border border-slate-400 text-slate-950 p-3 rounded-lg"
                value={settings.payment_provider}
                onChange={(e) =>
                  setSettings((p) => ({
                    ...p,
                    payment_provider: e.target.value as
                      | "internal_checkout"
                      | "none"
                      | "mercado_pago_link"
                      | "stripe_link"
                      | "custom_link",
                  }))
                }
              >
                <option value="internal_checkout">Checkout interno no site</option>
                <option value="none">Sem gateway (manual)</option>
                <option value="mercado_pago_link">Mercado Pago (link do checkout)</option>
                <option value="stripe_link">Stripe (link)</option>
                <option value="custom_link">Outro link</option>
              </select>

              {settings.payment_provider === "mercado_pago_link" ? (
                <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                  <p className="font-semibold">Configuração recomendada do Mercado Pago</p>
                  <ul className="mt-1 list-disc pl-5 space-y-0.5">
                    <li>Defina abaixo o link do seu checkout Mercado Pago.</li>
                    <li>Ative o método no site em &quot;Gateway&quot;.</li>
                    <li>Depois salve para aplicar no checkout do anúncio.</li>
                  </ul>
                </div>
              ) : null}

              <label className="block text-sm font-semibold text-slate-800 mt-3 mb-1">
                {settings.payment_provider === "mercado_pago_link"
                  ? "Chave PIX (opcional no Mercado Pago)"
                  : "Chave PIX (checkout interno)"}
              </label>
              <input
                className="w-full border border-slate-400 text-slate-950 placeholder:text-slate-700 p-3 rounded-lg"
                placeholder="Ex: email@pix.com ou chave aleatória"
                value={settings.payment_pix_key}
                onChange={(e) => setSettings((p) => ({ ...p, payment_pix_key: e.target.value }))}
              />

              <label className="block text-sm font-semibold text-slate-800 mt-3 mb-1">
                {settings.payment_provider === "mercado_pago_link"
                  ? "Link do checkout Mercado Pago"
                  : "Link de pagamento (template)"}
              </label>
              <input
                className="w-full border border-slate-400 text-slate-950 placeholder:text-slate-700 p-3 rounded-lg"
                placeholder={
                  settings.payment_provider === "mercado_pago_link"
                    ? "https://link.mercadopago.com.br/SEU_LINK"
                    : "https://pagamento.exemplo.com/checkout?plan={PLAN_ID}&amount={AMOUNT}&listing={LISTING_ID}"
                }
                value={settings.payment_link_template}
                onChange={(e) =>
                  setSettings((p) => ({ ...p, payment_link_template: e.target.value }))
                }
              />
              <p className="text-xs text-slate-600 mt-2">
                Variáveis disponíveis: {"{PLAN_ID}"}, {"{PLAN_NAME}"}, {"{AMOUNT}"}, {"{DAYS}"},{" "}
                {"{LISTING_ID}"}
              </p>

              <label className="block text-sm font-semibold text-slate-800 mt-3 mb-1">
                Mensagem de ajuda no pagamento
              </label>
              <textarea
                className="w-full border border-slate-400 text-slate-950 placeholder:text-slate-700 p-3 rounded-lg min-h-20"
                placeholder="Ex: Após o pagamento, aguarde a confirmação automática."
                value={settings.payment_help_text}
                onChange={(e) => setSettings((p) => ({ ...p, payment_help_text: e.target.value }))}
              />
            </div>
          ) : null}

          {activeSection === "locations" ? (
            <div className="border border-slate-300 rounded-xl p-4">
              <h2 className="text-xl font-bold mb-3">Base de cidades e bairros</h2>
              <p className="text-sm text-slate-700 mb-3">
                Use os botões abaixo para popular as sugestões do filtro da home.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleSyncCities}
                  disabled={syncingLocations}
                  className="border px-4 py-2 rounded-xl font-semibold hover:bg-gray-50 disabled:opacity-60"
                >
                  Importar cidades (IBGE)
                </button>
                <button
                  type="button"
                  onClick={handleSyncNeighborhoods}
                  disabled={syncingLocations}
                  className="border px-4 py-2 rounded-xl font-semibold hover:bg-gray-50 disabled:opacity-60"
                >
                  Sincronizar bairros dos anúncios
                </button>
              </div>

              <div className="mt-4 border-t pt-4">
                <h3 className="font-semibold text-slate-900 mb-2">Importar base própria (CSV)</h3>
                <p className="text-xs text-slate-600 mb-2">
                  Colunas aceitas: city/cidade, neighborhood/bairro, state_code/uf, label
                  (opcional).
                </p>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => setLocationsCsvFile(e.target.files?.[0] ?? null)}
                />
                <label className="mt-2 flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={replaceLocations}
                    onChange={(e) => setReplaceLocations(e.target.checked)}
                  />
                  Substituir toda a base atual antes de importar
                </label>
                <button
                  type="button"
                  onClick={handleImportLocationsCsv}
                  disabled={importingLocations || !locationsCsvFile}
                  className="mt-3 border px-4 py-2 rounded-xl font-semibold hover:bg-gray-50 disabled:opacity-60"
                >
                  {importingLocations ? "Importando..." : "Importar CSV de bairros/cidades"}
                </button>
              </div>
            </div>
          ) : null}

          {activeSection === "appearance" ? (
            <>
              <div className="border border-slate-300 rounded-xl p-4">
                <h2 className="text-xl font-bold mb-3">Imagens do site</h2>
                <label className="block font-semibold mb-2">Favicon do site</label>
                <input
                  type="file"
                  accept="image/x-icon,image/png,image/svg+xml"
                  onChange={(e) => handleFaviconUpload(e.target.files?.[0] ?? null)}
                />
                <input
                  className="mt-3 w-full border border-slate-400 text-slate-950 placeholder:text-slate-700 p-2 rounded-lg"
                  placeholder="URL do favicon (opcional)"
                  value={settings.favicon_url}
                  onChange={(e) => setSettings((p) => ({ ...p, favicon_url: e.target.value }))}
                />
                <p className="mt-1 text-xs text-slate-600">
                  Recomendado: PNG 32x32 ou ICO.
                </p>
                {settings.favicon_url ? (
                  <div className="mt-3 inline-flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <img
                      src={settings.favicon_url}
                      alt="Preview do favicon"
                      className="h-8 w-8 rounded object-contain"
                    />
                    <span className="text-sm text-slate-700">Preview do favicon</span>
                  </div>
                ) : null}

                <div className="mt-4 border-t border-slate-200 pt-4">
                <label className="block font-semibold mb-2">Logo do site</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleLogoUpload(e.target.files?.[0] ?? null)}
                />
                <label className="block text-sm font-semibold text-slate-800 mt-3 mb-1">
                  Altura do logo (px)
                </label>
                <input
                  type="number"
                  min={24}
                  max={180}
                  className="w-full md:w-64 border border-slate-400 text-slate-950 p-2 rounded-lg"
                  value={settings.logo_height_px}
                  onChange={(e) =>
                    setSettings((p) => ({
                      ...p,
                      logo_height_px: parseDimension(
                        e.target.value,
                        DEFAULT_SITE_SETTINGS.logo_height_px,
                        24,
                        180
                      ),
                    }))
                  }
                />
                {settings.logo_url ? (
                  <img
                    src={settings.logo_url}
                    alt="Logo"
                    className="mt-3 w-auto object-contain"
                    style={{ height: `${settings.logo_height_px}px` }}
                  />
                ) : null}
                </div>
              </div>

              <div className="border border-slate-300 rounded-xl p-4">
                <label className="block font-semibold mb-2">Foto de capa da home</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleHeroUpload(e.target.files?.[0] ?? null)}
                />
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1">
                      Altura do banner (px)
                    </label>
                    <input
                      type="number"
                      min={120}
                      max={680}
                      className="w-full border border-slate-400 text-slate-950 p-2 rounded-lg"
                      value={settings.hero_height_px}
                      onChange={(e) =>
                        setSettings((p) => ({
                          ...p,
                          hero_height_px: parseDimension(
                            e.target.value,
                            DEFAULT_SITE_SETTINGS.hero_height_px,
                            120,
                            680
                          ),
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1">
                      Ajuste da imagem
                    </label>
                    <select
                      className="w-full border border-slate-400 text-slate-950 p-2 rounded-lg"
                      value={settings.hero_image_fit}
                      onChange={(e) =>
                        setSettings((p) => ({
                          ...p,
                          hero_image_fit: e.target.value === "contain" ? "contain" : "cover",
                        }))
                      }
                    >
                      <option value="cover">Preencher (cover)</option>
                      <option value="contain">Mostrar inteira (contain)</option>
                    </select>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1">
                      Posição horizontal ({settings.hero_image_position_x}%)
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={settings.hero_image_position_x}
                      onChange={(e) =>
                        setSettings((p) => ({
                          ...p,
                          hero_image_position_x: clampPercentage(Number(e.target.value)),
                        }))
                      }
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1">
                      Posição vertical ({settings.hero_image_position_y}%)
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={settings.hero_image_position_y}
                      onChange={(e) =>
                        setSettings((p) => ({
                          ...p,
                          hero_image_position_y: clampPercentage(Number(e.target.value)),
                        }))
                      }
                      className="w-full"
                    />
                  </div>
                </div>
                {settings.hero_image_url ? (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-slate-600">
                      Arraste a imagem no quadro para escolher o enquadramento do banner.
                    </p>
                    <div
                      ref={heroPreviewRef}
                      className={`w-full rounded-lg border border-slate-300 bg-slate-100 touch-none select-none ${
                        draggingHeroPreview ? "cursor-grabbing" : "cursor-grab"
                      }`}
                      style={{
                        height: `${settings.hero_height_px}px`,
                        backgroundImage: `url(${settings.hero_image_url})`,
                        backgroundRepeat: "no-repeat",
                        backgroundSize: settings.hero_image_fit,
                        backgroundPosition: `${settings.hero_image_position_x}% ${settings.hero_image_position_y}%`,
                      }}
                      onPointerDown={(e) => {
                        e.currentTarget.setPointerCapture(e.pointerId);
                        setDraggingHeroPreview(true);
                        updateHeroPositionFromClientPoint(e.clientX, e.clientY);
                      }}
                      onPointerMove={(e) => {
                        if (!draggingHeroPreview) return;
                        updateHeroPositionFromClientPoint(e.clientX, e.clientY);
                      }}
                      onPointerUp={(e) => {
                        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                          e.currentTarget.releasePointerCapture(e.pointerId);
                        }
                        setDraggingHeroPreview(false);
                      }}
                      onPointerCancel={(e) => {
                        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                          e.currentTarget.releasePointerCapture(e.pointerId);
                        }
                        setDraggingHeroPreview(false);
                      }}
                      onPointerLeave={() => setDraggingHeroPreview(false)}
                    />
                  </div>
                ) : null}
              </div>

              <div className="border border-slate-300 rounded-xl p-4">
                <label className="block font-semibold mb-2">Fundo do bloco 1 (home)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    handleHomeBlockBgUpload(e.target.files?.[0] ?? null, "home_info_block_1_bg_url")
                  }
                />
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1">
                      Altura dos blocos (px)
                    </label>
                    <input
                      type="number"
                      min={140}
                      max={700}
                      className="w-full border border-slate-400 text-slate-950 p-2 rounded-lg"
                      value={settings.home_info_blocks_height_px}
                      onChange={(e) =>
                        setSettings((p) => ({
                          ...p,
                          home_info_blocks_height_px: parseDimension(
                            e.target.value,
                            DEFAULT_SITE_SETTINGS.home_info_blocks_height_px,
                            140,
                            700
                          ),
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1">
                      Ajuste da imagem do bloco
                    </label>
                    <select
                      className="w-full border border-slate-400 text-slate-950 p-2 rounded-lg"
                      value={settings.home_info_blocks_image_fit}
                      onChange={(e) =>
                        setSettings((p) => ({
                          ...p,
                          home_info_blocks_image_fit:
                            e.target.value === "contain" ? "contain" : "cover",
                        }))
                      }
                    >
                      <option value="cover">Preencher (cover)</option>
                      <option value="contain">Mostrar inteira (contain)</option>
                    </select>
                  </div>
                </div>
                {settings.home_info_block_1_bg_url ? (
                  <img
                    src={settings.home_info_block_1_bg_url}
                    alt="Fundo bloco 1"
                    className="mt-3 w-full rounded-lg bg-slate-100"
                    style={{
                      height: `${settings.home_info_blocks_height_px}px`,
                      objectFit: settings.home_info_blocks_image_fit,
                    }}
                  />
                ) : null}
              </div>

              <div className="border border-slate-300 rounded-xl p-4">
                <label className="block font-semibold mb-2">Fundo do bloco 2 (home)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    handleHomeBlockBgUpload(e.target.files?.[0] ?? null, "home_info_block_2_bg_url")
                  }
                />
                {settings.home_info_block_2_bg_url ? (
                  <img
                    src={settings.home_info_block_2_bg_url}
                    alt="Fundo bloco 2"
                    className="mt-3 w-full rounded-lg bg-slate-100"
                    style={{
                      height: `${settings.home_info_blocks_height_px}px`,
                      objectFit: settings.home_info_blocks_image_fit,
                    }}
                  />
                ) : null}
              </div>

              <div className="border border-slate-300 rounded-xl p-4">
                <h2 className="text-xl font-bold mb-3">Cores do site</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <div className="border border-slate-200 rounded-lg p-3">
                    <label className="block font-semibold mb-2">Cor principal</label>
                    <input
                      type="color"
                      value={settings.primary_color}
                      onChange={(e) => setSettings((p) => ({ ...p, primary_color: e.target.value }))}
                    />
                  </div>
                  <div className="border border-slate-200 rounded-lg p-3">
                    <label className="block font-semibold mb-2">Cor do fundo do topo</label>
                    <input
                      type="color"
                      value={settings.header_bg_color}
                      onChange={(e) => setSettings((p) => ({ ...p, header_bg_color: e.target.value }))}
                    />
                  </div>
                  <div className="border border-slate-200 rounded-lg p-3">
                    <label className="block font-semibold mb-2">Cor dos textos do topo</label>
                    <input
                      type="color"
                      value={settings.header_text_color}
                      onChange={(e) => setSettings((p) => ({ ...p, header_text_color: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="border border-slate-200 rounded-lg p-3">
                    <label className="block font-semibold mb-2">Fundo do site</label>
                    <input type="color" value={settings.background_color} onChange={(e) => setSettings((p) => ({ ...p, background_color: e.target.value }))} />
                  </div>
                  <div className="border border-slate-200 rounded-lg p-3">
                    <label className="block font-semibold mb-2">Texto principal</label>
                    <input type="color" value={settings.text_primary_color} onChange={(e) => setSettings((p) => ({ ...p, text_primary_color: e.target.value }))} />
                  </div>
                  <div className="border border-slate-200 rounded-lg p-3">
                    <label className="block font-semibold mb-2">Cor de ação (links/destaques)</label>
                    <input type="color" value={settings.action_color} onChange={(e) => setSettings((p) => ({ ...p, action_color: e.target.value }))} />
                  </div>
                  <div className="border border-slate-200 rounded-lg p-3">
                    <label className="block font-semibold mb-2">Botão (fundo)</label>
                    <input type="color" value={settings.button_bg_color} onChange={(e) => setSettings((p) => ({ ...p, button_bg_color: e.target.value }))} />
                  </div>
                  <div className="border border-slate-200 rounded-lg p-3">
                    <label className="block font-semibold mb-2">Hover do botão</label>
                    <input type="color" value={settings.button_hover_color} onChange={(e) => setSettings((p) => ({ ...p, button_hover_color: e.target.value }))} />
                  </div>
                  <div className="border border-slate-200 rounded-lg p-3">
                    <label className="block font-semibold mb-2">Cards de imóveis</label>
                    <input type="color" value={settings.listing_card_bg_color} onChange={(e) => setSettings((p) => ({ ...p, listing_card_bg_color: e.target.value }))} />
                  </div>
                  <div className="border border-slate-200 rounded-lg p-3">
                    <label className="block font-semibold mb-2">Área de detalhes</label>
                    <input type="color" value={settings.detail_bg_color} onChange={(e) => setSettings((p) => ({ ...p, detail_bg_color: e.target.value }))} />
                  </div>
                  <div className="border border-slate-200 rounded-lg p-3">
                    <label className="block font-semibold mb-2">Linhas e bordas</label>
                    <input type="color" value={settings.line_color} onChange={(e) => setSettings((p) => ({ ...p, line_color: e.target.value }))} />
                  </div>
                </div>
              </div>

              <div className="border border-slate-300 rounded-xl p-4">
                <h2 className="text-xl font-bold mb-3">Fontes do site</h2>
                <label className="block font-semibold mb-2">Fonte geral (texto do site)</label>
                <select
                  className="w-full border border-slate-400 text-slate-950 p-3 rounded-lg"
                  value={settings.font_body}
                  onChange={(e) => setSettings((p) => ({ ...p, font_body: e.target.value }))}
                >
                  {FONT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <label className="block font-semibold mt-4 mb-2">Fonte dos títulos</label>
                <select
                  className="w-full border border-slate-400 text-slate-950 p-3 rounded-lg"
                  value={settings.font_headings}
                  onChange={(e) => setSettings((p) => ({ ...p, font_headings: e.target.value }))}
                >
                  {FONT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <label className="block font-semibold mt-4 mb-2">Fonte do topo/menu</label>
                <select
                  className="w-full border border-slate-400 text-slate-950 p-3 rounded-lg"
                  value={settings.font_header}
                  onChange={(e) => setSettings((p) => ({ ...p, font_header: e.target.value }))}
                >
                  {FONT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : null}

          {activeSection === "plans" ? (
            <div className="border border-slate-300 rounded-xl p-4">
              <h2 className="text-xl font-bold mb-3">Planos de anúncio</h2>
              <div className="space-y-4">
                {plans.map((plan, index) => (
                  <div
                    key={plan.id}
                    className="border border-slate-200 rounded-lg p-3 grid grid-cols-1 md:grid-cols-4 gap-3"
                  >
                    <input
                      className="border border-slate-400 text-slate-950 p-2 rounded-lg"
                      value={plan.name}
                      onChange={(e) =>
                        setPlans((prev) =>
                          prev.map((p, i) => (i === index ? { ...p, name: e.target.value } : p))
                        )
                      }
                      placeholder={`Nome do plano ${index + 1}`}
                    />
                    <input
                      className="border border-slate-400 text-slate-950 p-2 rounded-lg"
                      type="number"
                      min={0}
                      value={plan.price}
                      onChange={(e) =>
                        setPlans((prev) =>
                          prev.map((p, i) =>
                            i === index ? { ...p, price: Number(e.target.value || 0) } : p
                          )
                        )
                      }
                      placeholder="Preço (R$)"
                    />
                    <input
                      className="border border-slate-400 text-slate-950 p-2 rounded-lg"
                      type="number"
                      min={1}
                      value={plan.days}
                      onChange={(e) =>
                        setPlans((prev) =>
                          prev.map((p, i) =>
                            i === index ? { ...p, days: Number(e.target.value || 1) } : p
                          )
                        )
                      }
                      placeholder="Dias ativo"
                    />
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <input
                        type="checkbox"
                        checked={plan.is_featured}
                        onChange={(e) =>
                          setPlans((prev) =>
                            prev.map((p, i) =>
                              i === index ? { ...p, is_featured: e.target.checked } : p
                            )
                          )
                        }
                      />
                      Destaque no site
                    </label>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex gap-3">
            <button
              disabled={saving}
              className="bg-black text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Salvar configurações"}
            </button>
          </div>
        </form>

        {msg && <div className="mt-4 text-sm rounded-lg border p-3 bg-gray-50">{msg}</div>}
      </div>
    </main>
  );
}
