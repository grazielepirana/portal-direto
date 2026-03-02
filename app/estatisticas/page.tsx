"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type ListingStat = {
  id: string;
  kind: "venda" | "locacao" | string;
  price: number | null;
  created_at?: string | null;
  active_until?: string | null;
};

type ConversationStat = {
  id: string;
  user_a: string;
  user_b: string;
  last_message_at?: string | null;
};

function formatBRL(value: number) {
  return `R$ ${value.toLocaleString("pt-BR")}`;
}

function isActive(activeUntil?: string | null) {
  if (!activeUntil) return true;
  const date = new Date(activeUntil);
  if (Number.isNaN(date.getTime())) return true;
  return date >= new Date();
}

export default function EstatisticasPage() {
  const [loading, setLoading] = useState(true);
  const [logged, setLogged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listings, setListings] = useState<ListingStat[]>([]);
  const [conversations, setConversations] = useState<ConversationStat[]>([]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setError(null);
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        const user = userData.user ?? null;

        if (!user) {
          if (!mounted) return;
          setLogged(false);
          return;
        }

        if (!mounted) return;
        setLogged(true);

        const listingsQuery = await supabase
          .from("listings")
          .select("id,kind,price,created_at,active_until")
          .eq("owner_id", user.id);

        if (!mounted) return;
        if (listingsQuery.error) {
          const retry = await supabase
            .from("listings")
            .select("id,kind,price,created_at")
            .eq("owner_id", user.id);
          if (retry.error) {
            setError(`Não foi possível carregar estatísticas: ${retry.error.message}`);
          } else {
            setListings((retry.data as ListingStat[]) ?? []);
          }
        } else {
          setListings((listingsQuery.data as ListingStat[]) ?? []);
        }

        const convQuery = await supabase
          .from("conversations")
          .select("id,user_a,user_b,last_message_at")
          .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);

        if (!mounted) return;
        if (!convQuery.error) {
          setConversations((convQuery.data as ConversationStat[]) ?? []);
        }
      } catch (err: unknown) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Erro inesperado.");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const total = listings.length;
    const active = listings.filter((item) => isActive(item.active_until)).length;
    const ended = Math.max(0, total - active);
    const sales = listings.filter((item) => item.kind === "venda").length;
    const rents = listings.filter((item) => item.kind === "locacao").length;
    const prices = listings.map((item) => item.price).filter((value): value is number => typeof value === "number");
    const avgPrice = prices.length > 0 ? prices.reduce((acc, value) => acc + value, 0) / prices.length : 0;
    const newestDate = listings
      .map((item) => item.created_at)
      .filter(Boolean)
      .sort()
      .reverse()[0];

    return {
      total,
      active,
      ended,
      sales,
      rents,
      avgPrice,
      conversations: conversations.length,
      newestDate: newestDate ? new Date(newestDate).toLocaleDateString("pt-BR") : "-",
    };
  }, [conversations.length, listings]);

  if (loading) {
    return <main className="min-h-screen p-8">Carregando estatísticas...</main>;
  }

  if (!logged) {
    return (
      <main className="min-h-screen p-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="font-bold text-slate-900">Você precisa estar logado para acessar estatísticas.</p>
          <Link className="mt-2 inline-flex font-semibold text-slate-700 hover:text-slate-900" href="/login">
            Ir para login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto w-full max-w-6xl">
        <header className="!mt-0 mb-6">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-950">Estatísticas</h1>
          <p className="mt-2 text-sm text-slate-600">
            Acompanhe o desempenho dos seus anúncios e conversas no Portal Direto.
          </p>
        </header>

        {error ? (
          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
            {error}
          </div>
        ) : null}

        <section className="!mt-0 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total de anúncios", value: String(stats.total) },
            { label: "Anúncios ativos", value: String(stats.active) },
            { label: "Anúncios encerrados", value: String(stats.ended) },
            { label: "Conversas no chat", value: String(stats.conversations) },
          ].map((item) => (
            <article
              key={item.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm font-semibold text-slate-600">{item.label}</p>
              <p className="mt-2 text-3xl font-extrabold text-slate-950">{item.value}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Distribuição por finalidade</h2>
            <div className="mt-4 space-y-4">
              <div>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-700">Venda</span>
                  <span className="text-slate-500">{stats.sales}</span>
                </div>
                <div className="h-3 rounded-full bg-slate-100">
                  <div
                    className="h-3 rounded-full bg-slate-900"
                    style={{ width: `${stats.total > 0 ? (stats.sales / stats.total) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-700">Locação</span>
                  <span className="text-slate-500">{stats.rents}</span>
                </div>
                <div className="h-3 rounded-full bg-slate-100">
                  <div
                    className="h-3 rounded-full bg-red-500"
                    style={{ width: `${stats.total > 0 ? (stats.rents / stats.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Resumo financeiro</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <p className="flex items-center justify-between">
                <span>Preço médio dos anúncios</span>
                <span className="font-bold text-slate-900">
                  {stats.avgPrice > 0 ? formatBRL(Math.round(stats.avgPrice)) : "-"}
                </span>
              </p>
              <p className="flex items-center justify-between">
                <span>Último anúncio publicado</span>
                <span className="font-bold text-slate-900">{stats.newestDate}</span>
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/meus-imoveis"
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Ver meus imóveis
              </Link>
              <Link href="/anunciar" className="cta-primary rounded-xl px-4 py-2 text-sm font-semibold">
                Cadastrar imóvel
              </Link>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
