"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DEFAULT_SITE_SETTINGS, loadSiteSettings, type SiteSettings } from "../../lib/site-settings";

function phoneToTel(value: string) {
  return value.replace(/\D/g, "");
}

function phoneToWhatsApp(value: string) {
  const digits = phoneToTel(value);
  if (!digits) return "";
  return `https://wa.me/${digits}`;
}

export default function FalarComSuportePage() {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);

  useEffect(() => {
    loadSiteSettings()
      .then((loaded) => setSettings(loaded))
      .catch(() => setSettings(DEFAULT_SITE_SETTINGS));
  }, []);

  const contacts = useMemo(() => {
    return [settings.support_phone_1, settings.support_phone_2].map((phone) => phone.trim()).filter(Boolean);
  }, [settings.support_phone_1, settings.support_phone_2]);

  const hasAnyContact = contacts.length > 0 || Boolean(settings.support_email?.trim());

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto w-full max-w-5xl">
        <Link
          href="/configuracoes#ajuda"
          className="inline-flex items-center text-sm font-semibold text-slate-700 hover:text-slate-950"
        >
          ← Voltar para configurações
        </Link>

        <section className="!mt-0 mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">Falar com suporte</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Escolha um canal de contato para falar com nossa equipe. Você pode ligar direto,
            chamar no WhatsApp ou enviar e-mail.
          </p>

          {!hasAnyContact ? (
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              Ainda não há contatos cadastrados. Atualize no Admin em Configurações do site.
            </div>
          ) : null}

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            {contacts.map((phone) => (
              <article key={phone} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Telefone</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{phone}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <a
                    href={`tel:${phoneToTel(phone)}`}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Ligar agora
                  </a>
                  <a
                    href={phoneToWhatsApp(phone)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-[#dc2626] px-4 text-sm font-semibold text-white hover:bg-[#b91c1c]"
                  >
                    WhatsApp
                  </a>
                </div>
              </article>
            ))}

            {settings.support_email?.trim() ? (
              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">E-mail</p>
                <p className="mt-1 break-all text-lg font-bold text-slate-900">{settings.support_email}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <a
                    href={`mailto:${settings.support_email.trim()}`}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Enviar e-mail
                  </a>
                </div>
              </article>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
