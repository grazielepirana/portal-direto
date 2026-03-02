"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { DEFAULT_SITE_SETTINGS, loadSiteSettings } from "../../lib/site-settings";

const FAQ_ITEMS = [
  {
    question: "O portal é só com proprietário?",
    answer:
      "Nosso foco é aproximar pessoas e facilitar negociação direta. Sempre recomendamos validar documentos e informações do imóvel antes de fechar negócio.",
  },
  {
    question: "Como funciona o chat?",
    answer:
      "Ao abrir um anúncio, você pode iniciar conversa direta com o anunciante dentro do portal, com histórico organizado por imóvel.",
  },
  {
    question: "Tem custo para anunciar?",
    answer:
      "O primeiro anúncio pode ter condição promocional e também existem planos com mais visibilidade para acelerar contatos.",
  },
  {
    question: "Como funciona o plano destaque?",
    answer:
      "Planos de destaque aumentam a visibilidade do anúncio nas listagens e melhoram o alcance para quem está buscando imóvel.",
  },
  {
    question: "Posso editar meu anúncio?",
    answer:
      "Sim. Na área de 'Meus imóveis' você pode editar título, descrição, fotos, valores e demais detalhes sempre que precisar.",
  },
  {
    question: "Como denunciar anúncio?",
    answer:
      "Use as opções de denúncia disponíveis na plataforma ou entre em contato com a Central de ajuda para análise da equipe.",
  },
];

export default function SobreNosPage() {
  const [settings, setSettings] = useState(DEFAULT_SITE_SETTINGS);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [stats, setStats] = useState({
    listings: "Em atualização",
    conversations: "Em atualização",
    cities: "Em atualização",
    responseTime: "Até 24h",
  });

  useEffect(() => {
    loadSiteSettings()
      .then((loaded) => setSettings(loaded))
      .catch(() => setSettings(DEFAULT_SITE_SETTINGS));

    (async () => {
      const [listingsCount, conversationsCount, citiesCount] = await Promise.all([
        supabase.from("listings").select("id", { count: "exact", head: true }),
        supabase.from("conversations").select("id", { count: "exact", head: true }),
        supabase
          .from("location_options")
          .select("city", { count: "exact", head: true })
          .eq("active", true),
      ]);

      setStats({
        listings:
          listingsCount.error || listingsCount.count == null
            ? "Em atualização"
            : listingsCount.count.toLocaleString("pt-BR"),
        conversations:
          conversationsCount.error || conversationsCount.count == null
            ? "Em atualização"
            : conversationsCount.count.toLocaleString("pt-BR"),
        cities:
          citiesCount.error || citiesCount.count == null
            ? "Em atualização"
            : citiesCount.count.toLocaleString("pt-BR"),
        responseTime: "Até 24h",
      });
    })();
  }, []);

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <section className="!mt-0 relative overflow-hidden rounded-3xl border border-slate-200">
          {settings.hero_image_url ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={settings.hero_image_url}
                alt="Portal Direto"
                className="h-[220px] w-full object-cover md:h-[320px]"
                style={{
                  objectPosition: `${settings.hero_image_position_x}% ${settings.hero_image_position_y}%`,
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/75 via-slate-900/45 to-slate-900/20" />
            </>
          ) : (
            <div className="h-[220px] w-full bg-gradient-to-r from-slate-900 to-slate-700 md:h-[320px]" />
          )}

          <div className="absolute inset-0 flex items-center p-6 md:p-10">
            <div className="max-w-2xl">
              <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-5xl">
                Negociação direta, com mais transparência.
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-100 md:text-base">
                O Portal Direto conecta proprietários e interessados para uma experiência mais
                simples, rápida e segura na compra e locação de imóveis.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/anunciar"
                  className="cta-primary inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold"
                >
                  Cadastrar imóvel
                </Link>
                <Link
                  href="/imoveis"
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-white/50 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur hover:bg-white/20"
                >
                  Ver imóveis
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="!mt-0 grid grid-cols-1 gap-3 md:grid-cols-3">
          {[
            { icon: "◎", title: "Sem intermediários", text: "Contato direto entre quem anuncia e quem busca imóvel." },
            { icon: "✦", title: "Chat direto no portal", text: "Conversa organizada para acelerar negociação." },
            { icon: "✓", title: "Anúncios com qualidade", text: "Informações claras, filtros úteis e experiência objetiva." },
          ].map((item) => (
            <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-lg font-bold text-slate-800">{item.icon}</p>
              <h2 className="mt-2 text-base font-bold text-slate-950">{item.title}</h2>
              <p className="mt-1 text-sm text-slate-600">{item.text}</p>
            </article>
          ))}
        </section>

        <section className="!mt-0 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-950">Nossa missão</h2>
            <p className="mt-3 text-sm leading-7 text-slate-700">
              Tornar a jornada de compra e locação mais transparente, com menos ruído e mais
              autonomia para proprietários e interessados.
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-700">
              Acreditamos que informação clara e comunicação direta reduzem tempo de negociação e
              melhoram a experiência para todos os lados.
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-700">
              {settings.about_text || DEFAULT_SITE_SETTINGS.about_text}
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-950">Como funciona</h2>
            <div className="mt-4 space-y-3">
              {[
                { step: "1", title: "Proprietário anuncia", text: "Publica o imóvel com fotos, título e detalhes essenciais." },
                { step: "2", title: "Interessado encontra e chama no chat", text: "Busca com filtros e fala direto no portal." },
                { step: "3", title: "Negociação direta e segura", text: "As partes combinam visitas e condições com mais agilidade." },
              ].map((item) => (
                <div key={item.step} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Passo {item.step}</p>
                  <h3 className="mt-1 text-base font-bold text-slate-900">{item.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{item.text}</p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="!mt-0">
          <h2 className="text-3xl font-bold tracking-tight text-slate-950">Por que Portal Direto?</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[
              { icon: "◻", title: "Mais controle do anúncio", text: "Você gerencia conteúdo, fotos e preço com autonomia." },
              { icon: "◻", title: "Mais velocidade de resposta", text: "Chat direto para reduzir tempo entre interesse e contato." },
              { icon: "◻", title: "Filtro inteligente", text: "Busca por cidade, bairro e tipo para achar o imóvel ideal." },
              { icon: "◻", title: "Favoritos e alertas", text: "Organize imóveis preferidos para comparar com facilidade." },
              { icon: "◻", title: "Planos de destaque", text: "Ganhe mais visibilidade quando quiser acelerar resultados." },
              { icon: "◻", title: "Suporte", text: "Equipe pronta para ajudar em cada etapa da jornada." },
            ].map((item) => (
              <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-slate-500">{item.icon}</p>
                <h3 className="mt-2 text-base font-bold text-slate-900">{item.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="!mt-0 rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-950">Nossos números</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Imóveis cadastrados", value: stats.listings, hint: "Base atual do portal" },
              { label: "Conversas iniciadas", value: stats.conversations, hint: "Histórico total" },
              { label: "Cidades atendidas", value: stats.cities, hint: "Cobertura cadastrada" },
              { label: "Tempo médio de resposta", value: stats.responseTime, hint: "Suporte e contato" },
            ].map((item) => (
              <article key={item.label} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
                <p className="mt-2 text-3xl font-extrabold text-slate-950">{item.value}</p>
                <p className="text-xs text-slate-500">{item.hint}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="!mt-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-950">Perguntas frequentes</h2>
          <div className="mt-4 space-y-2">
            {FAQ_ITEMS.map((item, index) => {
              const isOpen = openFaq === index;
              return (
                <div key={item.question} className="rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setOpenFaq((prev) => (prev === index ? null : index))}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                    aria-expanded={isOpen}
                    aria-controls={`faq-${index}`}
                  >
                    <span className="text-sm font-semibold text-slate-900">{item.question}</span>
                    <span className="text-slate-500" aria-hidden>{isOpen ? "−" : "+"}</span>
                  </button>
                  {isOpen ? (
                    <div id={`faq-${index}`} className="border-t border-slate-100 px-4 py-3 text-sm leading-7 text-slate-700">
                      {item.answer}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>

        <section className="!mt-0 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <h2 className="text-3xl font-bold tracking-tight text-slate-950">
            Pronto para anunciar sem dor de cabeça?
          </h2>
          <p className="mt-2 text-sm text-slate-600 md:text-base">
            Crie seu anúncio em poucos minutos e fale direto com interessados reais.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/anunciar"
              className="cta-primary inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold"
            >
              Cadastrar imóvel
            </Link>
            <Link
              href="/central-de-ajuda"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Falar com suporte
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
