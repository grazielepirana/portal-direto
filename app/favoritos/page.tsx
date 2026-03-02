"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import FavoriteButton from "../FavoriteButton";
import { loadFavoriteListingIds } from "../../lib/favorites";
import { supabase } from "../../lib/supabase";
import { formatTimeAgo } from "../../lib/time-ago";

type Listing = {
  id: string;
  kind: "venda" | "locacao";
  property_type: string;
  listing_title?: string | null;
  image_urls?: unknown;
  price: number | null;
  city?: string | null;
  neighborhood?: string | null;
  created_at?: string;
};

function getFirstImageUrl(value: unknown): string | null {
  if (!value) return null;

  if (Array.isArray(value)) {
    const first = value.find((v) => String(v).trim().length > 0);
    return first ? String(first).trim() : null;
  }

  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return null;

    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        const first = parsed.find((v) => String(v).trim().length > 0);
        return first ? String(first).trim() : null;
      }
    } catch {
      // fallback
    }

    const first = text.split(/\r?\n|,/).map((v) => v.trim()).find(Boolean);
    return first ?? null;
  }

  return null;
}

export default function FavoritosPage() {
  const [loading, setLoading] = useState(true);
  const [logged, setLogged] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"recent" | "price_asc" | "price_desc">("recent");
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        setLogged(false);
        setLoading(false);
        return;
      }

      setLogged(true);
      setUserId(user.id);

      const favoriteIds = await loadFavoriteListingIds(user.id);
      if (favoriteIds.length === 0) {
        setListings([]);
        setLoading(false);
        return;
      }

      const { data: listingsData, error } = await supabase
        .from("listings")
        .select("id,kind,property_type,listing_title,image_urls,price,city,neighborhood,created_at")
        .in("id", favoriteIds)
        .order("created_at", { ascending: false });

      if (error) {
        setErrorMessage("Não foi possível carregar os favoritos.");
      } else {
        setListings((listingsData as Listing[]) ?? []);
      }
      setLoading(false);
    })();
  }, []);

  const visibleListings = useMemo(() => {
    const base = listings.filter((item) => item.id);
    const sorted = [...base];

    if (sortBy === "price_asc") {
      sorted.sort((a, b) => (a.price ?? Number.MAX_SAFE_INTEGER) - (b.price ?? Number.MAX_SAFE_INTEGER));
      return sorted;
    }

    if (sortBy === "price_desc") {
      sorted.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
      return sorted;
    }

    sorted.sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tb - ta;
    });
    return sorted;
  }, [listings, sortBy]);

  async function clearAllFavorites() {
    if (!userId || clearing || listings.length === 0) return;
    const confirmed = window.confirm("Tem certeza que deseja remover todos os favoritos?");
    if (!confirmed) return;

    try {
      setClearing(true);
      const { error } = await supabase.from("favorites").delete().eq("user_id", userId);
      if (error) {
        setErrorMessage("Não foi possível limpar seus favoritos agora.");
        return;
      }
      setListings([]);
    } finally {
      setClearing(false);
    }
  }

  if (loading) {
    return <main className="min-h-screen p-8">Carregando favoritos...</main>;
  }

  if (!logged) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow p-6">
          <p className="font-bold">Você precisa estar logado para ver seus favoritos.</p>
          <Link className="underline font-semibold" href="/login">
            Ir para login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6 lg:p-8">
      <div className="max-w-[1200px] mx-auto">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-950">Favoritos</h1>
            <p className="mt-1 text-sm text-slate-600">
              {visibleListings.length} {visibleListings.length === 1 ? "imóvel salvo" : "imóveis salvos"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900"
              value={sortBy}
              onChange={(event) =>
                setSortBy(event.target.value as "recent" | "price_asc" | "price_desc")
              }
            >
              <option value="recent">Mais recentes</option>
              <option value="price_asc">Menor preço</option>
              <option value="price_desc">Maior preço</option>
            </select>
            <button
              type="button"
              onClick={clearAllFavorites}
              disabled={clearing || visibleListings.length === 0}
              className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {clearing ? "Limpando..." : "Limpar favoritos"}
            </button>
          </div>
        </div>

        {errorMessage ? (
          <div className="bg-white rounded-2xl shadow p-6 text-red-700">
            {errorMessage}
          </div>
        ) : visibleListings.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <svg viewBox="0 0 24 24" className="h-7 w-7 text-slate-500" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 21s-6.7-4.3-9.2-8.1C.9 10 .9 6.8 3.2 4.8c2.3-2 5.4-1.3 7 1 1.6-2.3 4.7-3 7-1 2.3 2 2.3 5.2.4 8.1C18.7 16.7 12 21 12 21Z" />
              </svg>
            </div>
            <p className="text-xl font-bold text-slate-900">Você ainda não salvou nenhum imóvel</p>
            <p className="mt-2 text-sm text-slate-600">
              Explore os anúncios e salve seus favoritos para comparar depois.
            </p>
            <Link
              href="/imoveis"
              className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-[#dc2626] px-5 text-sm font-semibold text-white hover:bg-[#b91c1c]"
            >
              Explorar imóveis
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleListings.map((item) => {
              const photoUrl = getFirstImageUrl(item.image_urls);
              const place = [item.neighborhood, item.city].filter(Boolean).join(" • ");
              return (
                <article
                  key={item.id}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(15,23,42,0.12)]"
                >
                  <div className="relative aspect-video overflow-hidden bg-slate-100">
                    {photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photoUrl}
                        alt={`Foto do imóvel ${item.property_type}`}
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
                    <div className="absolute top-3 right-3">
                      <FavoriteButton
                        listingId={item.id}
                        userId={userId}
                        initialIsFavorite
                        onChange={(next) => {
                          if (!next) {
                            setListings((current) =>
                              current.filter((listing) => listing.id !== item.id)
                            );
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex h-[220px] flex-col p-5">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      {item.kind === "venda" ? "Venda" : "Locação"}
                      {place ? ` • ${place}` : ""}
                    </p>
                    <h2 className="mt-2 text-[18px] font-bold leading-snug text-slate-950 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden">
                      {item.listing_title?.trim() ||
                        `${item.property_type} • ${
                          item.kind === "venda" ? "Venda" : "Locação"
                        }`}
                    </h2>
                    <div className="mt-3">
                      <p className="text-2xl font-extrabold text-slate-950">
                        {item.price != null
                          ? `R$ ${item.price.toLocaleString("pt-BR")}`
                          : "Preço não informado"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">{formatTimeAgo(item.created_at)}</p>
                    </div>
                    <Link
                      href={`/imovel/${item.id}`}
                      className="mt-auto inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Ver detalhes
                    </Link>
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
