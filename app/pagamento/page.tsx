"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import {
  DEFAULT_SITE_SETTINGS,
  loadSiteSettings,
  type SiteSettings,
} from "../../lib/site-settings";

function PagamentoPageContent() {
  const searchParams = useSearchParams();
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [method, setMethod] = useState<"pix" | "card">("pix");
  const [processing, setProcessing] = useState(false);
  const [creatingMercadoCheckout, setCreatingMercadoCheckout] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [payerName, setPayerName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const planName = searchParams.get("planName") ?? "Plano selecionado";
  const amount = Number(searchParams.get("amount") ?? 0);
  const days = Number(searchParams.get("days") ?? 0);
  const listingId = searchParams.get("listing");
  const planId = searchParams.get("plan") ?? "";

  useEffect(() => {
    loadSiteSettings()
      .then((loaded) => setSettings(loaded))
      .catch(() => setSettings(DEFAULT_SITE_SETTINGS));
  }, []);

  const checkoutUrl = useMemo(() => {
    const template = settings.payment_link_template?.trim();
    if (!template) return "";

    return template
      .replaceAll("{PLAN_ID}", encodeURIComponent(planId))
      .replaceAll("{PLAN_NAME}", encodeURIComponent(planName))
      .replaceAll("{AMOUNT}", encodeURIComponent(String(amount)))
      .replaceAll("{DAYS}", encodeURIComponent(String(days)))
      .replaceAll("{LISTING_ID}", encodeURIComponent(listingId ?? ""));
  }, [settings.payment_link_template, planId, planName, amount, days, listingId]);

  const planBenefits = useMemo(() => {
    const items = [
      `Anúncio ativo por ${days > 0 ? `${days} dias` : "período do plano"}`,
      "Mais visibilidade para seu imóvel",
      "Contato direto com interessados",
    ];
    if (amount <= 0) {
      items[1] = "Publicação imediata no portal";
    }
    return items;
  }, [amount, days]);

  async function markListingAsPaid() {
    if (!listingId) return;

    const payload = {
      payment_status: "paid",
      paid_at: new Date().toISOString(),
      payment_method: method,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("listings").update(payload).eq("id", listingId);
    if (error) {
      // Bancos sem as colunas novas: ignora e segue.
    }
  }

  async function handleInternalPayment() {
    if (amount <= 0) {
      setStatusMessage("Plano gratuito não precisa de pagamento.");
      return;
    }

    if (method === "card") {
      if (!payerName.trim() || cardNumber.length < 12 || cardExpiry.length < 4 || cardCvv.length < 3) {
        setStatusMessage("Preencha os dados do cartão para continuar.");
        return;
      }
    }

    setProcessing(true);
    setStatusMessage(null);

    try {
      // Simula processamento interno (substituível por gateway real depois).
      await new Promise((resolve) => setTimeout(resolve, 1400));
      await markListingAsPaid();
      setStatusMessage("✅ Pagamento confirmado. Seu plano foi ativado com sucesso.");
    } catch {
      setStatusMessage("Não foi possível processar o pagamento agora.");
    } finally {
      setProcessing(false);
    }
  }

  async function handleMercadoPagoCheckout() {
    if (!listingId) {
      setStatusMessage("Anúncio inválido para pagamento.");
      return;
    }
    if (amount <= 0) {
      setStatusMessage("Plano gratuito não precisa de pagamento.");
      return;
    }

    setCreatingMercadoCheckout(true);
    setStatusMessage(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setStatusMessage("Faça login novamente para continuar o pagamento.");
        return;
      }

      const response = await fetch("/api/payments/mercado-pago/create-preference", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          listingId,
          planId,
          planName,
          amount,
          days,
        }),
      });

      const result = (await response.json()) as {
        ok?: boolean;
        checkoutUrl?: string;
        error?: string;
      };

      if (!response.ok || !result.ok || !result.checkoutUrl) {
        setStatusMessage(result.error ?? "Não foi possível iniciar o checkout do Mercado Pago.");
        return;
      }

      window.location.href = result.checkoutUrl;
    } catch {
      setStatusMessage("Não foi possível iniciar o checkout do Mercado Pago agora.");
    } finally {
      setCreatingMercadoCheckout(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-7">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 md:text-4xl">
            Finalizar pagamento
          </h1>
          <p className="mt-2 text-sm text-slate-600 md:text-base">
            Etapa final para ativar seu anúncio com segurança.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="!mt-0 space-y-5">
            <article className="!mt-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
              <h2 className="text-xl font-bold text-slate-950">Método de pagamento</h2>
              <p className="mt-1 text-sm text-slate-600">
                {settings.payment_help_text || DEFAULT_SITE_SETTINGS.payment_help_text}
              </p>

              {settings.payment_provider === "internal_checkout" || settings.payment_provider === "none" ? (
                <div className="mt-5 space-y-5">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setMethod("pix")}
                      className={`h-10 rounded-xl px-4 text-sm font-semibold border transition ${
                        method === "pix"
                          ? "cta-primary border-transparent"
                          : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      PIX
                    </button>
                    <button
                      type="button"
                      onClick={() => setMethod("card")}
                      className={`h-10 rounded-xl px-4 text-sm font-semibold border transition ${
                        method === "card"
                          ? "cta-primary border-transparent"
                          : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      Cartão
                    </button>
                  </div>

                  {method === "pix" ? (
                    <div className="space-y-3">
                      <p className="text-sm text-slate-700">
                        Use sua carteira bancária para pagar via PIX.
                      </p>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-[190px_minmax(0,1fr)]">
                        <div className="flex h-[190px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-center text-xs text-slate-500">
                          Área do QR Code
                        </div>
                        <div className="rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-sm break-all text-slate-800">
                          {settings.payment_pix_key || "Chave PIX disponível no momento da confirmação."}
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">
                        Após concluir o pagamento, clique em &quot;Confirmar pagamento&quot;.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <input
                        className="md:col-span-2 h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900"
                        placeholder="Nome no cartão"
                        value={payerName}
                        onChange={(e) => setPayerName(e.target.value)}
                      />
                      <input
                        className="md:col-span-2 h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900"
                        placeholder="Número do cartão"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, ""))}
                      />
                      <input
                        className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900"
                        placeholder="Validade (MM/AA)"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                      />
                      <input
                        className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900"
                        placeholder="CVV"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ""))}
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleInternalPayment}
                    disabled={processing}
                    className="cta-primary inline-flex h-12 w-full items-center justify-center rounded-xl px-5 text-sm font-bold transition disabled:opacity-60"
                  >
                    {processing ? "Processando..." : "Confirmar pagamento"}
                  </button>
                </div>
              ) : settings.payment_provider === "mercado_pago_link" ? (
                <div className="mt-5">
                  <p className="mb-3 text-sm text-slate-700">
                    Você será direcionado para o checkout seguro do Mercado Pago.
                  </p>
                  <button
                    type="button"
                    onClick={handleMercadoPagoCheckout}
                    disabled={creatingMercadoCheckout}
                    className="cta-primary inline-flex h-12 w-full items-center justify-center rounded-xl px-5 text-sm font-bold transition disabled:opacity-60"
                  >
                    {creatingMercadoCheckout ? "Gerando checkout..." : "Pagar com Mercado Pago"}
                  </button>
                </div>
              ) : checkoutUrl ? (
                <div className="mt-5">
                  <p className="mb-3 text-sm text-slate-700">
                    Você será direcionado para o checkout seguro do gateway selecionado.
                  </p>
                  <a
                    href={checkoutUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="cta-primary inline-flex h-12 w-full items-center justify-center rounded-xl px-5 text-sm font-bold transition"
                  >
                    Confirmar pagamento
                  </a>
                </div>
              ) : (
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Configure o link do gateway no Admin para habilitar o pagamento deste plano.
                </div>
              )}
            </article>

            {statusMessage ? (
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800">
                {statusMessage}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-4 text-sm">
              <Link
                href={listingId ? `/meus-imoveis/${listingId}/editar` : "/anunciar"}
                className="font-semibold text-slate-700 transition hover:text-slate-950"
              >
                Editar anúncio
              </Link>
              <Link
                href={listingId ? `/meus-imoveis/${listingId}/editar` : "/planos"}
                className="font-semibold text-slate-700 transition hover:text-slate-950"
              >
                Trocar plano
              </Link>
              <Link href="/meus-imoveis" className="font-semibold text-slate-700 transition hover:text-slate-950">
                Meus imóveis
              </Link>
            </div>
          </section>

          <aside className="!mt-0">
            <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Resumo do plano</p>
              <h3 className="mt-2 text-2xl font-bold text-slate-950">{planName}</h3>
              <p className="mt-3 text-4xl font-extrabold text-slate-950">
                {amount > 0 ? `R$ ${amount.toLocaleString("pt-BR")}` : "R$ 0,00"}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {amount > 0 ? "Pagamento único" : "Plano gratuito"}
              </p>
              <p className="mt-1 text-sm text-slate-600">Duração: {days > 0 ? `${days} dias` : "-"}</p>

              <ul className="mt-5 space-y-2">
                {planBenefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="mt-0.5 text-emerald-600">✓</span>
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>

              {listingId ? (
                <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  Anúncio vinculado: {listingId}
                </p>
              ) : null}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

export default function PagamentoPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-gray-100 p-6" />}>
      <PagamentoPageContent />
    </Suspense>
  );
}
