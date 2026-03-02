"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  DEFAULT_LISTING_PLANS,
  loadListingPlans,
  type ListingPlan,
} from "../../lib/listing-plans";

function planBenefits(plan: ListingPlan) {
  const benefits = [`Anúncio ativo por ${plan.days} dias`];
  if (plan.is_featured) {
    benefits.push("Destaque na listagem de imóveis");
    benefits.push("Mais visibilidade para seu anúncio");
  } else {
    benefits.push("Publicação padrão no portal");
    benefits.push("Contato direto com interessados");
  }
  return benefits;
}

export default function PlanosPage() {
  const [plans, setPlans] = useState<ListingPlan[]>(DEFAULT_LISTING_PLANS);

  useEffect(() => {
    loadListingPlans()
      .then((loaded) => setPlans(loaded))
      .catch(() => setPlans(DEFAULT_LISTING_PLANS));
  }, []);

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-12 md:px-6 md:py-16">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mx-auto mb-10 max-w-3xl text-center md:mb-12">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-950 md:text-5xl">
            Planos para cadastrar imóveis
          </h1>
          <p className="mt-3 text-base text-slate-700 md:text-lg">
            Escolha o plano ideal e publique seu anúncio.
          </p>
          <p className="mt-3 text-sm font-medium text-slate-500">
            Você pode alterar ou impulsionar seu anúncio depois.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {plans.map((plan) => {
            const hasPremiumPlan = plans.some(
              (item) =>
                item.name.toLowerCase().includes("premium") ||
                item.id.toLowerCase().includes("premium")
            );
            const isPremiumPlan =
              plan.name.toLowerCase().includes("premium") ||
              plan.id.toLowerCase().includes("premium");
            const isRecommended = hasPremiumPlan ? isPremiumPlan : plan.is_featured;

            return (
              <article
                key={plan.id}
                className={`relative flex h-full flex-col rounded-[20px] border p-6 shadow-[0_8px_24px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_32px_rgba(15,23,42,0.14)] ${
                  isRecommended
                    ? "scale-[1.03] border-red-500 bg-white"
                    : "border-slate-200 bg-white"
                }`}
              >
                {isRecommended ? (
                  <span className="absolute -top-3 left-6 rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white shadow-sm">
                    🔥 Mais escolhido
                  </span>
                ) : null}

                <h2 className="text-xl font-bold text-slate-950">{plan.name}</h2>
                <div className="mt-4">
                  <p className="text-4xl font-extrabold leading-none text-slate-950">
                    {plan.price > 0
                      ? `R$ ${Number(plan.price).toLocaleString("pt-BR")}`
                      : "Grátis"}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    {plan.price > 0 ? "Pagamento único" : "Válido para primeiro anúncio"}
                  </p>
                </div>

                <ul className="mt-6 space-y-3 text-sm text-slate-800">
                  {planBenefits(plan).map((benefit) => (
                    <li key={`${plan.id}-${benefit}`} className="flex items-start gap-2">
                      <span className="mt-0.5 text-base leading-none text-emerald-600">✔</span>
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={`/anunciar?plan=${encodeURIComponent(plan.id)}`}
                  className={`mt-8 inline-flex h-12 items-center justify-center rounded-xl px-4 text-sm font-bold transition ${
                    plan.price > 0
                      ? "cta-primary shadow-sm hover:brightness-95"
                      : "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  {plan.price > 0 ? "Escolher plano" : "Cadastrar imóvel"}
                </Link>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
