"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { formatTimeAgo } from "../../lib/time-ago";

type Listing = {
  id: string;
  listing_title?: string | null;
  property_type: string;
  kind: "venda" | "locacao";
  image_urls?: unknown;
  city: string | null;
  neighborhood: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  parking_spots?: number | null;
  area_sqm?: number | null;
  active_until?: string | null;
  price: number | null;
  created_at?: string | null;
};

type ListingFilter = "todos" | "ativos" | "pausados" | "encerrados";
type ClosedReason = "paused" | "sold";

function getFirstImageUrl(value: unknown): string | null {
  if (!value) return null;
  if (Array.isArray(value)) {
    const first = value.find((item) => String(item).trim().length > 0);
    return first ? String(first).trim() : null;
  }
  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return null;
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        const first = parsed.find((item) => String(item).trim().length > 0);
        return first ? String(first).trim() : null;
      }
    } catch {
      // fallback
    }
    const first = text.split(/\r?\n|,/).map((item) => item.trim()).find(Boolean);
    return first ?? null;
  }
  return null;
}

function listingStatus(item: Listing): ListingFilter {
  if (!item.active_until) return "ativos";
  const until = new Date(item.active_until);
  if (Number.isNaN(until.getTime())) return "ativos";
  return until >= new Date() ? "ativos" : "encerrados";
}

function cacheKeyForUser(userId: string) {
  return `portal_my_listings_cache_v1:${userId}`;
}

function closedReasonKeyForUser(userId: string) {
  return `portal_my_listings_closed_reason_v1:${userId}`;
}

function readMyListingsCache(userId: string): Listing[] {
  if (typeof window === "undefined") return [];
  const raw = window.sessionStorage.getItem(cacheKeyForUser(userId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Listing[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readClosedReasonMap(userId: string): Record<string, ClosedReason> {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(closedReasonKeyForUser(userId));
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, ClosedReason>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export default function MeusImoveisPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [logged, setLogged] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<ListingFilter>("todos");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [closedReasonMap, setClosedReasonMap] = useState<Record<string, ClosedReason>>({});

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        setLoadError(null);

        // Primeiro tenta getUser direto para evitar depender de sessão em cache.
        const { data: userData, error: getUserError } = await supabase.auth.getUser();
        if (getUserError) throw getUserError;
        const user = userData.user ?? null;

        if (!user) {
          if (!isMounted) return;
          setLogged(false);
          setListings([]);
          return;
        }

        if (!isMounted) return;
        setLogged(true);
        setUserId(user.id);
        setClosedReasonMap(readClosedReasonMap(user.id));

        const cached = readMyListingsCache(user.id);
        if (cached.length > 0) {
          window.setTimeout(() => {
            if (!isMounted) return;
            setListings(cached);
            setLoading(false);
            setRefreshing(true);
          }, 0);
        }

        const { data, error } = await supabase
          .from("listings")
          .select(
            "id,listing_title,property_type,kind,image_urls,city,neighborhood,bedrooms,bathrooms,parking_spots,area_sqm,active_until,price,created_at"
          )
          .eq("owner_id", user.id)
          .order("created_at", { ascending: false });

        if (!isMounted) return;

        if (!error) {
          const next = (data as Listing[]) ?? [];
          setListings(next);
          if (typeof window !== "undefined") {
            window.sessionStorage.setItem(cacheKeyForUser(user.id), JSON.stringify(next));
          }
        } else {
          // fallback para ambientes com diferença de schema/políticas em colunas ordenadas
          const retry = await supabase
            .from("listings")
            .select("id,listing_title,property_type,kind,image_urls,city,neighborhood,price,created_at")
            .eq("owner_id", user.id);

          if (!isMounted) return;

          if (retry.error) {
            setLoadError(`Não foi possível carregar seus imóveis agora: ${retry.error.message}`);
          } else {
            const next = (retry.data as Listing[]) ?? [];
            setListings(next);
            if (typeof window !== "undefined") {
              window.sessionStorage.setItem(cacheKeyForUser(user.id), JSON.stringify(next));
            }
          }
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        const message =
          err instanceof Error ? err.message : "Erro inesperado ao carregar seus imóveis.";
        setLoadError(`Não foi possível carregar seus imóveis agora: ${message}`);
      } finally {
        if (!isMounted) return;
        setRefreshing(false);
        setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const visibleListings = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return listings.filter((item) => {
      const status = listingStatus(item);
      const closedReason = closedReasonMap[item.id];
      if (activeFilter === "ativos" && status !== "ativos") return false;
      if (activeFilter === "pausados") {
        if (status !== "encerrados") return false;
        return closedReason === "paused";
      }
      if (activeFilter === "encerrados") {
        if (status !== "encerrados") return false;
        return closedReason !== "paused";
      }

      if (!query) return true;
      const title =
        item.listing_title?.trim() || `${item.property_type} ${item.kind === "venda" ? "venda" : "locação"}`;
      return title.toLowerCase().includes(query);
    });
  }, [activeFilter, closedReasonMap, listings, searchQuery]);

  async function updateListingStatus(item: Listing, mode: "toggle-active" | "mark-closed") {
    if (!userId) return;

    setActionMessage(null);
    setActionLoadingId(item.id);
    setOpenMenuId(null);

    const currentlyActive = listingStatus(item) === "ativos";
    const shouldActivate = mode === "toggle-active" ? !currentlyActive : false;
    const nextActiveUntil = shouldActivate ? null : new Date(Date.now() - 60_000).toISOString();

    const firstTry = await supabase
      .from("listings")
      .update({
        active_until: nextActiveUntil,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id)
      .eq("owner_id", userId);

    let finalError = firstTry.error;

    // Fallback para bancos sem coluna updated_at.
    if (finalError && finalError.message.toLowerCase().includes("updated_at")) {
      const retry = await supabase
        .from("listings")
        .update({
          active_until: nextActiveUntil,
        })
        .eq("id", item.id)
        .eq("owner_id", userId);
      finalError = retry.error;
    }

    if (finalError) {
      setActionMessage(`Não foi possível atualizar o status do anúncio agora. (${finalError.message})`);
      setActionLoadingId(null);
      return;
    }

    setListings((prev) =>
      prev.map((row) => (row.id === item.id ? { ...row, active_until: nextActiveUntil } : row))
    );

    if (userId) {
      const nextClosedReasonMap = { ...closedReasonMap };
      if (shouldActivate) {
        delete nextClosedReasonMap[item.id];
      } else if (mode === "mark-closed") {
        nextClosedReasonMap[item.id] = "sold";
      } else {
        nextClosedReasonMap[item.id] = "paused";
      }
      setClosedReasonMap(nextClosedReasonMap);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          closedReasonKeyForUser(userId),
          JSON.stringify(nextClosedReasonMap)
        );
      }
    }

    setActionLoadingId(null);

    if (mode === "mark-closed") {
      setActionMessage(`Anúncio marcado como ${item.kind === "venda" ? "vendido" : "alugado"}.`);
    } else {
      setActionMessage(shouldActivate ? "Anúncio ativado com sucesso." : "Anúncio desativado com sucesso.");
    }
  }

  if (loading) {
    return <main className="min-h-screen p-8">Carregando imóveis...</main>;
  }

  if (!logged) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow p-6">
          <p className="font-bold">Você precisa estar logado.</p>
          <Link className="underline font-semibold" href="/login">
            Ir para login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] p-6 lg:p-8">
      <div className="max-w-[1200px] mx-auto">
        <div className="mb-6">
          <h1 className="text-4xl font-extrabold text-slate-950">Meus imóveis</h1>
          <p className="mt-1 text-sm text-slate-600">Gerencie, edite e acompanhe seus anúncios.</p>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Buscar imóvel pelo título"
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-500 lg:max-w-md"
            />
            <div className="flex flex-wrap gap-2">
              {[
                { id: "todos", label: "Todos" },
                { id: "ativos", label: "Ativos" },
                { id: "pausados", label: "Pausados" },
                { id: "encerrados", label: "Vendidos/Alugados" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveFilter(tab.id as ListingFilter)}
                  className={`h-9 rounded-full px-4 text-sm font-semibold transition ${
                    activeFilter === tab.id
                      ? "bg-[#0F172A] text-white"
                      : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {refreshing ? (
          <p className="text-sm text-slate-600 mb-3">Atualizando seus imóveis...</p>
        ) : null}

        {loadError ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 mb-4">
            {loadError}
          </div>
        ) : null}
        {actionMessage ? (
          <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
            {actionMessage}
          </div>
        ) : null}

        {visibleListings.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <svg viewBox="0 0 24 24" className="h-7 w-7 text-slate-500" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M3 11.5 12 4l9 7.5" />
                <path d="M5.5 10.8V20h13V10.8" />
              </svg>
            </div>
            <p className="text-xl font-bold text-slate-900">Você ainda não cadastrou nenhum imóvel.</p>
            <Link
              href="/anunciar"
              className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-[#dc2626] px-5 text-sm font-semibold text-white hover:bg-[#b91c1c]"
            >
              Cadastrar novo imóvel
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleListings.map((item) => {
              const photoUrl = getFirstImageUrl(item.image_urls);
              const title =
                item.listing_title?.trim() ||
                `${item.property_type} • ${item.kind === "venda" ? "Venda" : "Locação"}`;
              return (
              <article
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/imovel/${item.id}`)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    router.push(`/imovel/${item.id}`);
                  }
                }}
                className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(15,23,42,0.12)]"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                  <div className="h-[150px] w-full overflow-hidden rounded-xl bg-slate-100 lg:w-[220px] shrink-0">
                    {photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photoUrl}
                        alt={title}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-slate-100">
                        <svg viewBox="0 0 24 24" className="h-7 w-7 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <rect x="3" y="5" width="18" height="14" rx="2" />
                          <circle cx="8.5" cy="10" r="1.5" />
                          <path d="m21 15-4.5-4.5L8 19" />
                        </svg>
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h2 className="text-2xl font-bold text-slate-950 truncate">{title}</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {[item.city, item.neighborhood].filter(Boolean).join(" • ")}
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-700">
                      {item.property_type} • {item.kind === "venda" ? "Venda" : "Locação"}
                    </p>
                    <p className="mt-3 text-[30px] font-extrabold leading-none text-[#0F172A]">
                      {item.price != null
                        ? `R$ ${Number(item.price).toLocaleString("pt-BR")}`
                        : "Preço não informado"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{formatTimeAgo(item.created_at)}</p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.bedrooms ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">🛏 {item.bedrooms}</span> : null}
                      {item.bathrooms ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">🚿 {item.bathrooms}</span> : null}
                      {item.parking_spots ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">🚗 {item.parking_spots}</span> : null}
                      {item.area_sqm ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">📐 {item.area_sqm} m²</span> : null}
                    </div>
                  </div>

                  <div
                    className="relative flex shrink-0 flex-row gap-2 lg:w-[180px] lg:flex-col"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <Link
                      href={`/meus-imoveis/${item.id}/editar`}
                      className="inline-flex h-10 flex-1 items-center justify-center rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Editar anúncio
                    </Link>
                    <Link
                      href={`/imovel/${item.id}`}
                      className="inline-flex h-10 flex-1 items-center justify-center rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Ver anúncio
                    </Link>
                    <button
                      type="button"
                      onClick={() => setOpenMenuId((current) => (current === item.id ? null : item.id))}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 lg:w-full"
                      title="Mais opções"
                    >
                      ⋯
                    </button>
                    {openMenuId === item.id ? (
                      <div className="absolute right-0 top-12 z-20 w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-lg lg:right-auto lg:left-0 lg:top-auto lg:bottom-0 lg:translate-y-full">
                        <button
                          type="button"
                          disabled={actionLoadingId === item.id}
                          onClick={() => updateListingStatus(item, "toggle-active")}
                          className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                          {listingStatus(item) === "ativos" ? "Desativar anúncio" : "Ativar anúncio"}
                        </button>
                        <button
                          type="button"
                          disabled={actionLoadingId === item.id}
                          onClick={() => updateListingStatus(item, "mark-closed")}
                          className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                          {item.kind === "venda" ? "Marcar como vendido" : "Marcar como alugado"}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
