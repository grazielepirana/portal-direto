"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { loadFavoriteListingIds } from "../../lib/favorites";
import FavoriteButton from "../FavoriteButton";
import { formatTimeAgo } from "../../lib/time-ago";
import { normalizeText } from "../../lib/text-normalize";
import MapListings from "./MapListings";
import ShareListingButton from "../imovel/[id]/ShareListingButton";
import ContactOwnerCard from "../imovel/[id]/ContactOwnerCard";
import {
  finalizeCurrencyInput,
  formatCurrencyInput,
  parseCurrencyInputToNumber,
} from "../../lib/currency-input";

type Listing = {
  id: string;
  owner_id?: string | null;
  kind: "venda" | "locacao";
  property_type: string;
  listing_title?: string | null;
  image_urls?: unknown;
  price: number | null;
  city?: string | null;
  neighborhood?: string | null;
  address?: string | null;
  address_number?: string | null;
  address_complement?: string | null;
  cep?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  suites?: number | null;
  area_sqm?: number | null;
  parking_spots?: number | null;
  condo_name?: string | null;
  condo_is_in?: boolean | null;
  condo_amenities?: unknown;
  condo_amenities_other?: string | null;
  condo_fee?: number | null;
  iptu_fee?: number | null;
  code?: string | null;
  description?: string | null;
  is_featured?: boolean | null;
  active_until?: string | null;
  created_at?: string | null;
};

function getImageUrls(value: unknown): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return [];

    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed.map((v) => String(v).trim()).filter(Boolean);
      }
    } catch {
      // fallback
    }

    return text.split(/\r?\n|,/).map((v) => v.trim()).filter(Boolean);
  }

  return [];
}

function getFirstImageUrl(value: unknown): string | null {
  return getImageUrls(value)[0] ?? null;
}

function getStringArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return [];
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed.map((v) => String(v).trim()).filter(Boolean);
    } catch {
      // fallback
    }
    return text.split(/\r?\n|,/).map((v) => v.trim()).filter(Boolean);
  }
  return [];
}

export default function ImoveisPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-gray-100 p-6" />}>
      <ImoveisPageEntry />
    </Suspense>
  );
}

function ImoveisPageEntry() {
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  return <ImoveisPageContent key={searchKey} searchParams={searchParams} />;
}

function readListingsCache() {
  if (typeof window === "undefined") return [] as Listing[];
  const raw = sessionStorage.getItem("portal_listings_cache_v1");
  if (!raw) return [] as Listing[];

  try {
    const parsed = JSON.parse(raw) as Listing[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function ImoveisPageContent({ searchParams }: { searchParams: ReturnType<typeof useSearchParams> }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [openListingId, setOpenListingId] = useState<string | null>(null);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [sortBy, setSortBy] = useState<"featured" | "price_asc" | "price_desc" | "recent">(
    "featured"
  );
  const [galleryStart, setGalleryStart] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const initialKind =
    searchParams.get("kind") === "venda" || searchParams.get("kind") === "locacao"
      ? (searchParams.get("kind") as "venda" | "locacao")
      : "";
  const initialBedrooms =
    searchParams.get("bedrooms") === "1" ||
    searchParams.get("bedrooms") === "2" ||
    searchParams.get("bedrooms") === "3" ||
    searchParams.get("bedrooms") === "4"
      ? (searchParams.get("bedrooms") as "1" | "2" | "3" | "4")
      : "";

  const [kind, setKind] = useState<"" | "venda" | "locacao">(initialKind);
  const [propertyType, setPropertyType] = useState(searchParams.get("propertyType") ?? "");
  const [location, setLocation] = useState(searchParams.get("location") ?? "");
  const [minPrice, setMinPrice] = useState(formatCurrencyInput(searchParams.get("minPrice") ?? ""));
  const [maxPrice, setMaxPrice] = useState(formatCurrencyInput(searchParams.get("maxPrice") ?? ""));
  const [bedrooms, setBedrooms] = useState<"" | "1" | "2" | "3" | "4">(initialBedrooms);
  const [bathrooms, setBathrooms] = useState<"" | "1" | "2" | "3" | "4">("");
  const [suites, setSuites] = useState<"" | "1" | "2" | "3" | "4">("");
  const [parkingSpots, setParkingSpots] = useState<"" | "1" | "2" | "3" | "4">("");
  const [minArea, setMinArea] = useState("");
  const [maxArea, setMaxArea] = useState("");
  const [condoOrCode, setCondoOrCode] = useState(searchParams.get("condoOrCode") ?? "");

  const filterFieldClassName =
    "w-full border border-slate-400 text-slate-950 placeholder:text-slate-700 p-3 rounded-lg";

  useEffect(() => {
    const cached = readListingsCache();
    if (cached.length > 0) {
      const timer = window.setTimeout(() => {
        setListings(cached);
        setLoading(false);
        setRefreshing(true);
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      const { data, error } = await supabase
        .from("listings")
        .select(
          "id,owner_id,kind,property_type,listing_title,image_urls,price,city,neighborhood,address,address_number,address_complement,cep,bedrooms,bathrooms,suites,area_sqm,parking_spots,condo_name,condo_is_in,condo_amenities,condo_amenities_other,condo_fee,iptu_fee,code,description,is_featured,active_until,created_at"
        )
        .order("created_at", { ascending: false })
        .limit(300);

      if (!isMounted) return;

      if (error) {
        setLoadError("Não foi possível carregar os imóveis agora.");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const nextListings = (data as Listing[]) ?? [];
      setListings(nextListings);
      sessionStorage.setItem("portal_listings_cache_v1", JSON.stringify(nextListings));
      setLoading(false);
      setRefreshing(false);
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const currentUserId = data.user?.id ?? null;
      setUserId(currentUserId);

      if (!currentUserId) {
        setFavoriteIds([]);
        return;
      }

      const ids = await loadFavoriteListingIds(currentUserId);
      setFavoriteIds(ids);
    })();

    const { data: authSub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUserId = session?.user?.id ?? null;
      setUserId(currentUserId);

      if (!currentUserId) {
        setFavoriteIds([]);
        return;
      }

      const ids = await loadFavoriteListingIds(currentUserId);
      setFavoriteIds(ids);
    });

    return () => {
      authSub.subscription.unsubscribe();
    };
  }, []);

  const filtered = useMemo(() => {
    const min = parseCurrencyInputToNumber(minPrice);
    const max = parseCurrencyInputToNumber(maxPrice);
    const areaMin = minArea ? Number(minArea) : null;
    const areaMax = maxArea ? Number(maxArea) : null;

    return listings.filter((it) => {
      if (kind && it.kind !== kind) return false;
      if (propertyType && it.property_type !== propertyType) return false;

      if (location) {
        const q = normalizeText(location);
        const city = normalizeText(it.city ?? "");
        const neigh = normalizeText(it.neighborhood ?? "");
        const address = normalizeText(it.address ?? "");
        if (!city.includes(q) && !neigh.includes(q) && !address.includes(q)) return false;
      }

      if (bedrooms) {
        const b = Number(bedrooms);
        if (!it.bedrooms || it.bedrooms < b) return false;
      }

      if (bathrooms) {
        const b = Number(bathrooms);
        if (!it.bathrooms || it.bathrooms < b) return false;
      }

      if (suites) {
        const s = Number(suites);
        if (!it.suites || it.suites < s) return false;
      }

      if (parkingSpots) {
        const p = Number(parkingSpots);
        if (!it.parking_spots || it.parking_spots < p) return false;
      }

      if (min !== null && (it.price ?? 0) < min) return false;
      if (max !== null && (it.price ?? 0) > max) return false;

      if (areaMin !== null && (it.area_sqm ?? 0) < areaMin) return false;
      if (areaMax !== null && (it.area_sqm ?? 0) > areaMax) return false;

      if (condoOrCode) {
        const q = normalizeText(condoOrCode);
        const condo = normalizeText(it.condo_name ?? "");
        const code = normalizeText(it.code ?? "");
        if (!condo.includes(q) && !code.includes(q)) return false;
      }

      if (it.active_until) {
        const untilDate = new Date(it.active_until);
        if (!Number.isNaN(untilDate.getTime()) && untilDate < new Date()) return false;
      }

      return true;
    });
  }, [
    listings,
    kind,
    propertyType,
    location,
    minPrice,
    maxPrice,
    bedrooms,
    bathrooms,
    suites,
    parkingSpots,
    minArea,
    maxArea,
    condoOrCode,
  ]);

  const sortedListings = useMemo(() => {
    const next = [...filtered];

    if (sortBy === "price_asc") {
      next.sort((a, b) => (a.price ?? Number.MAX_SAFE_INTEGER) - (b.price ?? Number.MAX_SAFE_INTEGER));
      return next;
    }

    if (sortBy === "price_desc") {
      next.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
      return next;
    }

    if (sortBy === "recent") {
      next.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });
      return next;
    }

    // Default visual/order behavior: featured first.
    next.sort((a, b) => Number(Boolean(b.is_featured)) - Number(Boolean(a.is_featured)));
    return next;
  }, [filtered, sortBy]);

  const selectedListing = useMemo(
    () => (openListingId ? listings.find((item) => item.id === openListingId) ?? null : null),
    [openListingId, listings]
  );

  const selectedImages = useMemo(
    () => (selectedListing ? getImageUrls(selectedListing.image_urls) : []),
    [selectedListing]
  );
  const selectedMapQuery = useMemo(
    () =>
      selectedListing
        ? [
            selectedListing.address,
            selectedListing.address_number,
            selectedListing.address_complement,
            selectedListing.neighborhood,
            selectedListing.city,
          ]
            .filter(Boolean)
            .join(", ")
        : "",
    [selectedListing]
  );
  const modalVisibleCount = 4;
  const modalMaxStart = Math.max(0, selectedImages.length - modalVisibleCount);
  const modalEffectiveStart = Math.min(galleryStart, modalMaxStart);
  const modalVisibleImages = selectedImages.slice(
    modalEffectiveStart,
    modalEffectiveStart + modalVisibleCount
  );

  useEffect(() => {
    if (!selectedListing) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [selectedListing]);

  function clearFilters() {
    setKind("");
    setPropertyType("");
    setLocation("");
    setMinPrice("");
    setMaxPrice("");
    setBedrooms("");
    setBathrooms("");
    setSuites("");
    setParkingSpots("");
    setMinArea("");
    setMaxArea("");
    setCondoOrCode("");
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6 pb-20">
      <div className="max-w-7xl mx-auto">
        <section className="bg-white rounded-2xl shadow p-5 mb-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h1 className="text-xl font-bold text-slate-950">Filtros</h1>
            <button
              type="button"
              className="border px-4 py-2 rounded-xl font-semibold hover:bg-gray-50 transition"
              onClick={() => setShowMoreFilters((prev) => !prev)}
            >
              {showMoreFilters ? "Ocultar filtros" : "Mais filtros"}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <select className={filterFieldClassName} value={kind} onChange={(e) => setKind(e.target.value as "" | "venda" | "locacao")}>
              <option value="">Comprar ou Alugar</option>
              <option value="venda">Comprar</option>
              <option value="locacao">Alugar</option>
            </select>

            <select className={filterFieldClassName} value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>
              <option value="">Tipo de imóvel</option>
              <option value="Apartamento">Apartamento</option>
              <option value="Casa">Casa</option>
              <option value="Terreno">Terreno</option>
              <option value="Comercial">Comercial</option>
            </select>

            <input className={filterFieldClassName} placeholder="Cidade ou Bairro" value={location} onChange={(e) => setLocation(e.target.value)} />
            <input
              className={filterFieldClassName}
              type="text"
              inputMode="numeric"
              placeholder="Valor mínimo"
              value={minPrice}
              onChange={(e) => setMinPrice(formatCurrencyInput(e.target.value))}
              onBlur={(e) => setMinPrice(finalizeCurrencyInput(e.target.value))}
            />
            <input
              className={filterFieldClassName}
              type="text"
              inputMode="numeric"
              placeholder="Valor máximo"
              value={maxPrice}
              onChange={(e) => setMaxPrice(formatCurrencyInput(e.target.value))}
              onBlur={(e) => setMaxPrice(finalizeCurrencyInput(e.target.value))}
            />

            <button onClick={clearFilters} className="w-full border px-4 py-3 rounded-xl hover:bg-gray-50 transition font-semibold">
              Limpar filtros
            </button>
          </div>

          {showMoreFilters ? (
            <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <select className={filterFieldClassName} value={bedrooms} onChange={(e) => setBedrooms(e.target.value as "" | "1" | "2" | "3" | "4")}>
                <option value="">Quartos (mín.)</option>
                <option value="1">1+</option>
                <option value="2">2+</option>
                <option value="3">3+</option>
                <option value="4">4+</option>
              </select>

              <select className={filterFieldClassName} value={bathrooms} onChange={(e) => setBathrooms(e.target.value as "" | "1" | "2" | "3" | "4")}>
                <option value="">Banheiros (mín.)</option>
                <option value="1">1+</option>
                <option value="2">2+</option>
                <option value="3">3+</option>
                <option value="4">4+</option>
              </select>

              <select className={filterFieldClassName} value={suites} onChange={(e) => setSuites(e.target.value as "" | "1" | "2" | "3" | "4")}>
                <option value="">Suítes (mín.)</option>
                <option value="1">1+</option>
                <option value="2">2+</option>
                <option value="3">3+</option>
                <option value="4">4+</option>
              </select>

              <select className={filterFieldClassName} value={parkingSpots} onChange={(e) => setParkingSpots(e.target.value as "" | "1" | "2" | "3" | "4")}>
                <option value="">Vagas (mín.)</option>
                <option value="1">1+</option>
                <option value="2">2+</option>
                <option value="3">3+</option>
                <option value="4">4+</option>
              </select>

              <input className={filterFieldClassName} type="number" placeholder="Área mínima (m²)" value={minArea} onChange={(e) => setMinArea(e.target.value)} />
              <input className={filterFieldClassName} type="number" placeholder="Área máxima (m²)" value={maxArea} onChange={(e) => setMaxArea(e.target.value)} />
              <input className={`${filterFieldClassName} sm:col-span-2 lg:col-span-2`} placeholder="Condomínio ou Código" value={condoOrCode} onChange={(e) => setCondoOrCode(e.target.value)} />
            </div>
          ) : null}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(300px,28%)] gap-6 items-start">
          <div>
            <div className="mb-6 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-[0_6px_20px_rgba(15,23,42,0.06)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-950">Resultados</h2>
                  <p className="text-sm text-slate-600 mt-1">
                    {loading
                      ? "Carregando imóveis..."
                      : refreshing
                        ? `${sortedListings.length} imóveis encontrados • atualizando`
                        : `${sortedListings.length} imóveis encontrados`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <label htmlFor="sort-results" className="text-sm font-medium text-slate-700">
                    Ordenar por:
                  </label>
                  <select
                    id="sort-results"
                    className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 focus:outline-none focus:border-slate-500"
                    value={sortBy}
                    onChange={(event) =>
                      setSortBy(
                        event.target.value as "featured" | "price_asc" | "price_desc" | "recent"
                      )
                    }
                  >
                    <option value="featured">Destaques primeiro</option>
                    <option value="recent">Mais recentes</option>
                    <option value="price_asc">Menor preço</option>
                    <option value="price_desc">Maior preço</option>
                  </select>
                </div>
              </div>
            </div>

            {loading ? (
              <p className="text-gray-600">Carregando imóveis...</p>
            ) : loadError ? (
              <p className="text-red-700">{loadError}</p>
            ) : filtered.length === 0 ? (
              <p className="text-gray-600">Nenhum imóvel encontrado com esses filtros.</p>
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                {sortedListings.map((item) => {
                  const photoUrl = getFirstImageUrl(item.image_urls);
                  const isFavorite = favoriteIds.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      className="group bg-white rounded-[18px] overflow-hidden cursor-pointer border border-slate-200 shadow-[0_8px_24px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-[6px]"
                      role="link"
                      tabIndex={0}
                      onClick={() => {
                        setGalleryStart(0);
                        setLightboxOpen(false);
                        setLightboxIndex(0);
                        setOpenListingId(item.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setGalleryStart(0);
                          setLightboxOpen(false);
                          setLightboxIndex(0);
                          setOpenListingId(item.id);
                        }
                      }}
                      >
                      <div className="relative overflow-hidden">
                        {photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={photoUrl}
                            alt={`Foto do imóvel ${item.property_type}`}
                            className="w-full h-[220px] object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-[220px] bg-gradient-to-br from-slate-200 to-slate-100 flex flex-col items-center justify-center text-slate-700">
                            <span className="text-sm font-semibold">Sem foto disponível</span>
                            <span className="text-xs text-slate-500 mt-1">Adicione imagens ao anúncio</span>
                          </div>
                        )}
                        {item.is_featured ? (
                          <span className="absolute top-3 left-3 inline-flex items-center rounded-full border border-amber-300/70 bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-900">
                            Destaque
                          </span>
                        ) : null}
                        <div className="absolute top-3 right-3">
                          <FavoriteButton
                            key={`${item.id}-${isFavorite ? "1" : "0"}`}
                            listingId={item.id}
                            userId={userId}
                            initialIsFavorite={isFavorite}
                            onChange={(next) => {
                              setFavoriteIds((current) => {
                                if (next) {
                                  if (current.includes(item.id)) return current;
                                  return [...current, item.id];
                                }
                                return current.filter((id) => id !== item.id);
                              });
                            }}
                          />
                        </div>
                      </div>

                      <div className="p-6">
                        <h3 className="text-xl font-bold text-slate-950 mb-2">
                          {item.listing_title?.trim() || `${item.property_type} • ${item.kind === "venda" ? "Venda" : "Locação"}`}
                        </h3>
                        <p className="text-[28px] font-bold text-[#0F172A] mt-2">
                          {item.price != null ? `R$ ${item.price.toLocaleString("pt-BR")}` : "Preço não informado"}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {item.bedrooms ? (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                              {item.bedrooms} quartos
                            </span>
                          ) : null}
                          {item.parking_spots ? (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                              {item.parking_spots} vagas
                            </span>
                          ) : null}
                          {item.area_sqm ? (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                              {item.area_sqm} m²
                            </span>
                          ) : null}
                        </div>
                        <p className="text-sm text-slate-600 mt-1">
                          {formatTimeAgo(item.created_at)}
                        </p>
                        <button
                          type="button"
                          className="inline-block mt-4 underline font-semibold"
                          onClick={(e) => {
                            e.stopPropagation();
                            setGalleryStart(0);
                            setLightboxOpen(false);
                            setLightboxIndex(0);
                            setOpenListingId(item.id);
                          }}
                        >
                          Ver detalhes
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="lg:sticky lg:top-24 self-start">
            {!loading && !loadError ? (
              <MapListings
                key={`map-${kind}-${propertyType}-${location}-${minPrice}-${maxPrice}-${bedrooms}-${bathrooms}-${suites}-${parkingSpots}-${minArea}-${maxArea}-${condoOrCode}`}
                listings={sortedListings.map((item) => ({
                  id: item.id,
                  title: item.listing_title?.trim() || `${item.property_type} • ${item.kind === "venda" ? "Venda" : "Locação"}`,
                  price: item.price,
                  city: item.city,
                  neighborhood: item.neighborhood,
                  address: item.address,
                  addressNumber: item.address_number,
                  cep: item.cep,
                }))}
              />
            ) : (
              <div className="bg-white rounded-2xl shadow p-4 text-sm text-slate-600">
                Carregando mapa...
              </div>
            )}
          </div>
        </section>
      </div>

      {selectedListing ? (
        <div
          className="fixed inset-0 z-50 bg-slate-900/55 p-3 sm:p-6"
          onClick={() => setOpenListingId(null)}
        >
          <div
            className="mx-auto flex h-[90vh] w-full max-w-[1180px] flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.28)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 border-b border-slate-200 px-5 py-4 sm:px-7">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-950 leading-tight">
                  {selectedListing.listing_title?.trim() ||
                    `${selectedListing.property_type} • ${selectedListing.kind === "venda" ? "Venda" : "Locação"}`}
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  {[selectedListing.neighborhood, selectedListing.city].filter(Boolean).join(" • ")}
                  {` • ${formatTimeAgo(selectedListing.created_at)}`}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <ShareListingButton
                  listingId={selectedListing.id}
                  title={selectedListing.listing_title?.trim() || `${selectedListing.property_type} • ${selectedListing.kind === "venda" ? "Venda" : "Locação"}`}
                />
                <FavoriteButton listingId={selectedListing.id} userId={userId} initialIsFavorite={favoriteIds.includes(selectedListing.id)} />
                <button
                  type="button"
                  className="inline-flex h-10 items-center rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={() => setOpenListingId(null)}
                >
                  Fechar
                </button>
              </div>
            </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,67%)_minmax(0,33%)]">
              <section className="min-w-0 space-y-6">
                {selectedImages.length > 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="relative">
                      <button
                        type="button"
                        className="block w-full overflow-hidden rounded-xl"
                        onClick={() => {
                          setLightboxIndex(modalEffectiveStart);
                          setLightboxOpen(true);
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={selectedImages[modalEffectiveStart]}
                          alt={`Foto ${modalEffectiveStart + 1}`}
                          className="h-[420px] md:h-[500px] w-full object-cover"
                          loading="lazy"
                        />
                      </button>

                      <div className="mt-3 grid grid-cols-4 gap-2">
                        {modalVisibleImages.map((url, index) => {
                          const absoluteIndex = modalEffectiveStart + index;
                          return (
                            <button
                              key={`${url}-${absoluteIndex}`}
                              type="button"
                              className={`overflow-hidden rounded-lg border ${
                                absoluteIndex === modalEffectiveStart
                                  ? "border-slate-900"
                                  : "border-slate-200"
                              }`}
                              onClick={() => {
                                setLightboxIndex(absoluteIndex);
                                setLightboxOpen(true);
                              }}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={url}
                                alt={`Miniatura ${absoluteIndex + 1}`}
                                className="h-20 w-full object-cover"
                                loading="lazy"
                              />
                            </button>
                          );
                        })}
                      </div>

                      {selectedImages.length > modalVisibleCount ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setGalleryStart((prev) => Math.max(0, prev - 1))}
                            disabled={modalEffectiveStart === 0}
                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/95 rounded-full h-10 w-10 border border-slate-300 shadow-sm disabled:opacity-40"
                            aria-label="Mostrar fotos anteriores"
                          >
                            ‹
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setGalleryStart((prev) => Math.min(modalMaxStart, prev + 1))
                            }
                            disabled={modalEffectiveStart >= modalMaxStart}
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/95 rounded-full h-10 w-10 border border-slate-300 shadow-sm disabled:opacity-40"
                            aria-label="Mostrar próximas fotos"
                          >
                            ›
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                <section className="!mt-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h4 className="text-base font-bold text-slate-950 mb-3">Detalhes</h4>
                {(selectedListing.address || selectedListing.address_number || selectedListing.address_complement) ? (
                  <p className="text-slate-700 text-base mb-3">
                    Endereço: {selectedListing.address ?? ""}
                    {selectedListing.address_number ? `, ${selectedListing.address_number}` : ""}
                    {selectedListing.address_complement ? ` - ${selectedListing.address_complement}` : ""}
                  </p>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  {selectedListing.bedrooms ? <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">{selectedListing.bedrooms} quartos</span> : null}
                  {selectedListing.bathrooms ? <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">{selectedListing.bathrooms} banheiros</span> : null}
                  {selectedListing.suites ? <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">{selectedListing.suites} suítes</span> : null}
                  {selectedListing.area_sqm ? <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">{selectedListing.area_sqm} m²</span> : null}
                  {selectedListing.parking_spots ? <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">{selectedListing.parking_spots} vagas</span> : null}
                </div>
                </section>

                <section className="!mt-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h4 className="font-bold text-slate-950 mb-2">Informações adicionais</h4>
                {selectedListing.condo_name ? <p className="text-slate-700 mb-1">Condomínio: {selectedListing.condo_name}</p> : null}
                {(() => {
                  const amenities = getStringArray(selectedListing.condo_amenities);
                  const otherAmenity = String(selectedListing.condo_amenities_other ?? "").trim();
                  const shouldShow =
                    selectedListing.condo_is_in === true ||
                    amenities.length > 0 ||
                    otherAmenity.length > 0;
                  if (!shouldShow) return null;

                  return (
                    <div className="mb-2">
                      <p className="text-slate-800 font-semibold mb-1">Lazer do condomínio</p>
                      <div className="flex flex-wrap gap-2">
                        {amenities.map((item) => (
                          <span key={item} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-800">
                            {item}
                          </span>
                        ))}
                        {otherAmenity ? (
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-800">
                            {otherAmenity}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })()}
                {selectedListing.condo_fee != null ? <p className="text-slate-700 mb-1">Valor do condomínio: R$ {Number(selectedListing.condo_fee).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p> : null}
                {selectedListing.iptu_fee != null ? <p className="text-slate-700 mb-1">Valor do IPTU: R$ {Number(selectedListing.iptu_fee).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p> : null}
                {selectedListing.code ? <p className="text-slate-700 mb-1">Código: {selectedListing.code}</p> : null}
                </section>

                {selectedListing.description ? (
                  <section className="!mt-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h4 className="font-bold text-slate-950 mb-2">Descrição</h4>
                    <p className="text-[15px] leading-7 text-slate-700 whitespace-pre-line max-w-[70ch]">{selectedListing.description}</p>
                  </section>
                ) : null}

                {selectedMapQuery ? (
                  <section className="!mt-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h4 className="font-bold text-slate-950 mb-2">Localização no mapa</h4>
                    <div className="overflow-hidden rounded-xl border border-slate-300 bg-white">
                      <iframe
                        title="Mapa de localização do imóvel"
                        src={`https://www.google.com/maps?q=${encodeURIComponent(selectedMapQuery)}&output=embed`}
                        width="100%"
                        height="320"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    </div>
                  </section>
                ) : null}
              </section>

              <aside className="lg:sticky lg:top-6 self-start space-y-4">
                {selectedListing.owner_id ? (
                  <ContactOwnerCard
                    ownerId={selectedListing.owner_id}
                    listingId={selectedListing.id}
                    price={selectedListing.price}
                    condoFee={selectedListing.condo_fee}
                    iptuFee={selectedListing.iptu_fee}
                  />
                ) : (
                  <div className="rounded-xl border border-slate-300 p-4 text-sm text-slate-700">
                    Contato do proprietário não disponível.
                  </div>
                )}
              </aside>
            </div>
            </div>

            {lightboxOpen && selectedImages.length > 0 ? (
              <div
                className="fixed inset-0 z-[60] bg-black/80 p-4 sm:p-8 flex items-center justify-center"
                onClick={() => setLightboxOpen(false)}
              >
                <div className="relative w-full max-w-6xl" onClick={(event) => event.stopPropagation()}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedImages[lightboxIndex]}
                    alt={`Foto ampliada ${lightboxIndex + 1}`}
                    className="w-full max-h-[82vh] object-contain bg-black"
                  />
                  <button
                    type="button"
                    onClick={() => setLightboxOpen(false)}
                    className="absolute top-3 right-3 bg-white/90 rounded-full h-10 w-10 text-xl"
                    aria-label="Fechar"
                  >
                    ×
                  </button>
                  {selectedImages.length > 1 ? (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setLightboxIndex(
                            (prev) => (prev - 1 + selectedImages.length) % selectedImages.length
                          )
                        }
                        className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 rounded-full h-10 w-10 text-xl"
                        aria-label="Foto anterior"
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        onClick={() => setLightboxIndex((prev) => (prev + 1) % selectedImages.length)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 rounded-full h-10 w-10 text-xl"
                        aria-label="Próxima foto"
                      >
                        ›
                      </button>
                    </>
                  ) : null}
                  <div className="mt-3 text-center text-white text-sm">
                    {lightboxIndex + 1} / {selectedImages.length}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}
