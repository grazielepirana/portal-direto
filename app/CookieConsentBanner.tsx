"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const CONSENT_KEY = "portal_cookie_consent_v1";
const PREFERENCES_COOKIE = "portal_cookie_preferences";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

type CookiePreferences = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
};

type SavedConsent = {
  status: "all" | "custom" | "rejected";
  preferences: CookiePreferences;
  updatedAt: string;
};

const DEFAULT_PREFERENCES: CookiePreferences = {
  necessary: true,
  analytics: false,
  marketing: false,
  preferences: false,
};

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [prefs, setPrefs] = useState<CookiePreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const timer = window.setTimeout(() => {
      const current = window.localStorage.getItem(CONSENT_KEY);
      if (current) {
        try {
          const parsed = JSON.parse(current) as Partial<SavedConsent>;
          if (parsed.preferences) {
            setPrefs({
              necessary: true,
              analytics: Boolean(parsed.preferences.analytics),
              marketing: Boolean(parsed.preferences.marketing),
              preferences: Boolean(parsed.preferences.preferences),
            });
          }
          setVisible(false);
          return;
        } catch {
          // fallback para formato antigo
        }
      }
      setVisible(!current);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function saveConsent(status: SavedConsent["status"], preferences: CookiePreferences) {
    const payload: SavedConsent = {
      status,
      preferences,
      updatedAt: new Date().toISOString(),
    };
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CONSENT_KEY, JSON.stringify(payload));
    }
    document.cookie = `portal_cookie_consent=${status}; path=/; max-age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
    document.cookie = `${PREFERENCES_COOKIE}=${encodeURIComponent(
      JSON.stringify(preferences)
    )}; path=/; max-age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
    setVisible(false);
  }

  function handleAcceptAll() {
    saveConsent("all", {
      necessary: true,
      analytics: true,
      marketing: true,
      preferences: true,
    });
  }

  function handleRejectOptional() {
    saveConsent("rejected", {
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false,
    });
  }

  function handleSaveSelection() {
    saveConsent("custom", prefs);
  }

  function togglePreference(key: "analytics" | "marketing" | "preferences") {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[90] p-4">
      <div className="mx-auto w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.2)]">
        <div className="flex flex-col gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">Este site usa cookies</p>
            <p className="mt-1 text-sm text-slate-600">
              Usamos cookies para melhorar sua experiência. Você pode aceitar todos ou escolher
              quais categorias deseja permitir.{" "}
              <Link href="/termos-e-privacidade" className="font-semibold text-slate-800 underline">
                Saiba mais
              </Link>
              .
            </p>
          </div>

          {showCustomize ? (
            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <label className="flex items-center justify-between gap-3 text-sm text-slate-800">
                <span>
                  <b>Necessários</b> (sempre ativos)
                </span>
                <input type="checkbox" checked disabled />
              </label>
              <label className="flex items-center justify-between gap-3 text-sm text-slate-800">
                <span>Preferências</span>
                <input
                  type="checkbox"
                  checked={prefs.preferences}
                  onChange={() => togglePreference("preferences")}
                />
              </label>
              <label className="flex items-center justify-between gap-3 text-sm text-slate-800">
                <span>Analytics</span>
                <input
                  type="checkbox"
                  checked={prefs.analytics}
                  onChange={() => togglePreference("analytics")}
                />
              </label>
              <label className="flex items-center justify-between gap-3 text-sm text-slate-800">
                <span>Marketing</span>
                <input
                  type="checkbox"
                  checked={prefs.marketing}
                  onChange={() => togglePreference("marketing")}
                />
              </label>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleRejectOptional}
              className="h-10 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Recusar opcionais
            </button>
            <button
              type="button"
              onClick={() => setShowCustomize((prev) => !prev)}
              className="h-10 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {showCustomize ? "Fechar seleção" : "Selecionar cookies"}
            </button>
            {showCustomize ? (
              <button
                type="button"
                onClick={handleSaveSelection}
                className="h-10 rounded-xl border border-slate-900 bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Salvar seleção
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleAcceptAll}
              className="cta-primary h-10 rounded-xl px-4 text-sm font-semibold"
            >
              Aceitar tudo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
