"use client";

import Link from "next/link";
import { useState } from "react";
import {
  DEFAULT_COOKIE_CONSENT,
  type CookieConsent,
  isBrowser,
  readCookieConsent,
  saveCookieConsent,
} from "../lib/cookies";

export default function CookieBanner() {
  const [visible, setVisible] = useState(() => {
    if (!isBrowser()) return false;
    return !readCookieConsent();
  });
  const [showConfig, setShowConfig] = useState(false);
  const [consent, setConsent] = useState<CookieConsent>(() => {
    if (!isBrowser()) return DEFAULT_COOKIE_CONSENT;
    return readCookieConsent() ?? DEFAULT_COOKIE_CONSENT;
  });

  function acceptAll() {
    const next: CookieConsent = {
      essential: true,
      analytics: true,
      marketing: true,
    };
    saveCookieConsent(next);
    setVisible(false);
  }

  function rejectNonEssential() {
    const next: CookieConsent = {
      essential: true,
      analytics: false,
      marketing: false,
    };
    saveCookieConsent(next);
    setVisible(false);
  }

  function saveCustomConfig() {
    saveCookieConsent({
      essential: true,
      analytics: consent.analytics,
      marketing: consent.marketing,
    });
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] p-3 md:p-4">
      <div className="mx-auto w-full max-w-5xl rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_16px_36px_rgba(15,23,42,0.2)] md:p-5">
        <p className="text-sm leading-6 text-slate-700">
          Este site utiliza cookies e tecnologias semelhantes para melhorar sua experiência,
          garantir segurança e realizar análises estatísticas.
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          Ao clicar em &quot;Aceitar&quot;, você concorda com nossa{" "}
          <Link href="/termos-e-privacidade" className="font-semibold text-slate-900 underline">
            Política de Privacidade
          </Link>{" "}
          e{" "}
          <Link href="/politica-de-cookies" className="font-semibold text-slate-900 underline">
            Política de Cookies
          </Link>
          .
        </p>

        {showConfig ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <label className="flex items-center justify-between gap-3 py-1 text-sm text-slate-800">
              <span>Cookies essenciais (obrigatórios)</span>
              <input type="checkbox" checked disabled />
            </label>
            <label className="mt-2 flex items-center justify-between gap-3 py-1 text-sm text-slate-800">
              <span>Cookies de analytics</span>
              <input
                type="checkbox"
                checked={consent.analytics}
                onChange={(e) =>
                  setConsent((prev) => ({ ...prev, analytics: e.target.checked }))
                }
              />
            </label>
            <label className="mt-2 flex items-center justify-between gap-3 py-1 text-sm text-slate-800">
              <span>Cookies de marketing</span>
              <input
                type="checkbox"
                checked={consent.marketing}
                onChange={(e) =>
                  setConsent((prev) => ({ ...prev, marketing: e.target.checked }))
                }
              />
            </label>

            <button
              type="button"
              onClick={saveCustomConfig}
              className="mt-4 h-10 rounded-xl bg-[#0E9F6E] px-4 text-sm font-semibold text-white transition hover:bg-[#0A8A5E]"
            >
              Salvar configuração
            </button>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={acceptAll}
            className="h-10 rounded-xl bg-[#0E9F6E] px-4 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-[#0A8A5E] md:text-sm"
          >
            Aceitar todos
          </button>
          <button
            type="button"
            onClick={() => setShowConfig((prev) => !prev)}
            className="h-10 rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold uppercase tracking-wide text-slate-700 transition hover:bg-slate-50 md:text-sm"
          >
            Configurar cookies
          </button>
          <button
            type="button"
            onClick={rejectNonEssential}
            className="h-10 rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold uppercase tracking-wide text-slate-700 transition hover:bg-slate-50 md:text-sm"
          >
            Rejeitar não essenciais
          </button>
        </div>
      </div>
    </div>
  );
}
