"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DEFAULT_SITE_SETTINGS, loadSiteSettings } from "../lib/site-settings";
import { supabase } from "../lib/supabase";
import { loadLocationOptions } from "../lib/location-options";
import { normalizeText } from "../lib/text-normalize";
import {
  finalizeCurrencyInput,
  formatCurrencyInput,
  parseCurrencyInputToNumber,
} from "../lib/currency-input";

type FeaturedListing = {
  id: string;
  kind?: "venda" | "locacao" | null;
  listing_title?: string | null;
  property_type?: string | null;
  price?: number | null;
  bathrooms?: number | null;
  bedrooms?: number | null;
  parking_spots?: number | null;
  area_sqm?: number | null;
  city?: string | null;
  neighborhood?: string | null;
  image_urls?: unknown;
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
      // fallback para lista em texto
    }

    return text.split(/\r?\n|,/).map((v) => v.trim()).filter(Boolean);
  }
  return [];
}

function getFirstImageUrl(value: unknown): string | null {
  return getImageUrls(value)[0] ?? null;
}

const HOME_FEATURED_CACHE_KEY = "portal_home_featured_cache_v1";
const HOME_LOCATION_CACHE_KEY = "portal_home_locations_cache_v1";

function dedupeFeaturedById(items: FeaturedListing[]) {
  const seen = new Set<string>();
  const unique: FeaturedListing[] = [];
  for (const item of items) {
    if (!item) continue;
    const image = getFirstImageUrl(item.image_urls) ?? "";
    const fingerprint = [
      String(item.listing_title ?? "").trim().toLowerCase(),
      String(item.property_type ?? "").trim().toLowerCase(),
      String(item.kind ?? "").trim().toLowerCase(),
      String(item.price ?? ""),
      String(item.city ?? "").trim().toLowerCase(),
      String(item.neighborhood ?? "").trim().toLowerCase(),
      image.trim().toLowerCase(),
    ].join("|");
    if (seen.has(fingerprint)) continue;
    seen.add(fingerprint);
    unique.push(item);
  }
  return unique;
}

export default function Home() {
  const router = useRouter();
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [heroHeightPx, setHeroHeightPx] = useState(DEFAULT_SITE_SETTINGS.hero_height_px);
  const [heroImageFit, setHeroImageFit] = useState<"cover" | "contain">(
    DEFAULT_SITE_SETTINGS.hero_image_fit
  );
  const [heroPositionX, setHeroPositionX] = useState(DEFAULT_SITE_SETTINGS.hero_image_position_x);
  const [heroPositionY, setHeroPositionY] = useState(DEFAULT_SITE_SETTINGS.hero_image_position_y);

  const [kind, setKind] = useState<"" | "venda" | "locacao">("");
  const [propertyType, setPropertyType] = useState("");
  const [location, setLocation] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [bedrooms, setBedrooms] = useState<"" | "1" | "2" | "3" | "4">("");
  const [condoOrCode, setCondoOrCode] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [featuredListings, setFeaturedListings] = useState<FeaturedListing[]>([]);
  const [featuredKindFilter, setFeaturedKindFilter] = useState<"todos" | "venda" | "locacao">(
    "todos"
  );

  const fieldClassName =
    "h-14 rounded-[14px] border border-[#E2E8F0] px-4 text-slate-950 placeholder:text-slate-700 transition-colors hover:border-[#0F172A] focus:border-[#0F172A] focus:outline-none";

  function clearFilters() {
    setKind("");
    setPropertyType("");
    setLocation("");
    setMinPrice("");
    setMaxPrice("");
    setBedrooms("");
    setCondoOrCode("");
  }

  function handleSearch() {
    const params = new URLSearchParams();
    const minPriceNumber = parseCurrencyInputToNumber(minPrice);
    const maxPriceNumber = parseCurrencyInputToNumber(maxPrice);
    if (kind) params.set("kind", kind);
    if (propertyType) params.set("propertyType", propertyType);
    if (location) params.set("location", location);
    if (minPriceNumber != null) params.set("minPrice", String(minPriceNumber));
    if (maxPriceNumber != null) params.set("maxPrice", String(maxPriceNumber));
    if (bedrooms) params.set("bedrooms", bedrooms);
    if (condoOrCode) params.set("condoOrCode", condoOrCode);

    router.push(`/imoveis${params.toString() ? `?${params.toString()}` : ""}`);
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const cachedFeatured = window.sessionStorage.getItem(HOME_FEATURED_CACHE_KEY);
        if (cachedFeatured) {
          const parsed = JSON.parse(cachedFeatured) as FeaturedListing[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            setFeaturedListings(dedupeFeaturedById(parsed));
          }
        }

        const cachedLocations = window.sessionStorage.getItem(HOME_LOCATION_CACHE_KEY);
        if (cachedLocations) {
          const parsed = JSON.parse(cachedLocations) as string[];
          if (Array.isArray(parsed) && parsed.length > 0) setLocationSuggestions(parsed.slice(0, 500));
        }
      } catch {
        // ignore cache parse errors
      }
    }

    loadSiteSettings()
      .then((settings) => {
        setHeroImageUrl(settings.hero_image_url || "");
        setHeroHeightPx(
          Number(settings.hero_height_px) > 0
            ? Number(settings.hero_height_px)
            : DEFAULT_SITE_SETTINGS.hero_height_px
        );
        setHeroImageFit(settings.hero_image_fit === "contain" ? "contain" : "cover");
        setHeroPositionX(
          Number(settings.hero_image_position_x) >= 0 && Number(settings.hero_image_position_x) <= 100
            ? Number(settings.hero_image_position_x)
            : DEFAULT_SITE_SETTINGS.hero_image_position_x
        );
        setHeroPositionY(
          Number(settings.hero_image_position_y) >= 0 && Number(settings.hero_image_position_y) <= 100
            ? Number(settings.hero_image_position_y)
            : DEFAULT_SITE_SETTINGS.hero_image_position_y
        );
      })
      .catch(() => {
        setHeroImageUrl("");
        setHeroHeightPx(DEFAULT_SITE_SETTINGS.hero_height_px);
        setHeroImageFit(DEFAULT_SITE_SETTINGS.hero_image_fit);
        setHeroPositionX(DEFAULT_SITE_SETTINGS.hero_image_position_x);
        setHeroPositionY(DEFAULT_SITE_SETTINGS.hero_image_position_y);
      });

    (async () => {
      const fromBase = await loadLocationOptions();
      if (fromBase.length > 0) {
        setLocationSuggestions(fromBase.slice(0, 500));
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(HOME_LOCATION_CACHE_KEY, JSON.stringify(fromBase.slice(0, 500)));
        }
        return;
      }

      // Fallback: caso a tabela base ainda não exista/preenchida, usa anúncios.
      const { data } = await supabase
        .from("listings")
        .select("address,neighborhood,city")
        .order("created_at", { ascending: false })
        .limit(400);

      const values = new Set<string>();
      for (const row of (data as Array<{ address?: string | null; neighborhood?: string | null; city?: string | null }>) ?? []) {
        const address = String(row.address ?? "").trim();
        const neighborhood = String(row.neighborhood ?? "").trim();
        const city = String(row.city ?? "").trim();

        if (address) values.add(address);
        if (neighborhood) values.add(neighborhood);
        if (city) values.add(city);
      }

      const fallbackLocations = Array.from(values).slice(0, 80);
      setLocationSuggestions(fallbackLocations);
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(HOME_LOCATION_CACHE_KEY, JSON.stringify(fallbackLocations));
      }
    })();

    (async () => {
      const { data } = await supabase
        .from("listings")
        .select(
          "id,kind,listing_title,property_type,price,bathrooms,bedrooms,parking_spots,area_sqm,city,neighborhood,image_urls,is_featured,active_until,created_at"
        )
        .eq("is_featured", true)
        .order("created_at", { ascending: false })
        .limit(8);

      const now = new Date();
      const valid = ((data as FeaturedListing[]) ?? []).filter((item) => {
        if (!item.active_until) return true;
        const untilDate = new Date(item.active_until);
        if (Number.isNaN(untilDate.getTime())) return true;
        return untilDate >= now;
      });
      const uniqueValid = dedupeFeaturedById(valid);
      setFeaturedListings(uniqueValid);
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(HOME_FEATURED_CACHE_KEY, JSON.stringify(uniqueValid));
      }
    })();
  }, []);

  const visibleFeaturedListings = featuredListings.filter((item) => {
    if (featuredKindFilter === "todos") return true;
    return item.kind === featuredKindFilter;
  });

  const exploreTypes = [
    { id: "apartamentos", label: "Apartamentos", value: "Apartamento" },
    { id: "casas", label: "Casas", value: "Casa" },
    { id: "coberturas", label: "Coberturas", value: "Cobertura" },
    { id: "casas-condominio", label: "Casa em condomínio", value: "Casa em condomínio" },
    { id: "terrenos", label: "Terrenos", value: "Terreno" },
    { id: "comercial", label: "Comercial", value: "Comercial" },
  ];

  function renderExploreIcon(typeId: string) {
    switch (typeId) {
      case "apartamentos":
        return (
          <svg viewBox="0 0 56 48" className="h-12 w-12" aria-hidden>
            <rect x="4" y="8" width="48" height="32" rx="9" fill="#EAF8F2" />
            <rect x="16" y="14" width="20" height="22" rx="2" fill="#82C1A2" />
            <path d="M20 19h3M26 19h3M20 24h3M26 24h3M20 29h3M26 29h3" stroke="#EAF0ED" strokeWidth="1.8" strokeLinecap="round" />
            <rect x="38" y="18" width="6" height="16" rx="1.5" fill="#D3D8D9" />
          </svg>
        );
      case "casas":
        return (
          <svg viewBox="0 0 56 48" className="h-12 w-12" aria-hidden>
            <rect x="4" y="8" width="48" height="32" rx="9" fill="#EAF8F2" />
            <path d="M12 24 28 12l16 12" fill="#82C1A2" />
            <rect x="14" y="24" width="28" height="13" rx="2" fill="#82C1A2" />
            <rect x="25" y="27" width="6" height="10" rx="1.2" fill="#EAF0ED" />
          </svg>
        );
      case "coberturas":
        return (
          <svg viewBox="0 0 56 48" className="h-12 w-12" aria-hidden>
            <rect x="4" y="8" width="48" height="32" rx="9" fill="#EAF8F2" />
            <path d="M10 25 28 12l18 13" fill="#0E9F6E" opacity="0.85" />
            <rect x="11" y="25" width="34" height="12" rx="2" fill="#82C1A2" />
            <rect x="34" y="17" width="8" height="7" rx="1.5" fill="#EAF0ED" />
          </svg>
        );
      case "casas-condominio":
        return (
          <svg viewBox="0 0 56 48" className="h-12 w-12" aria-hidden>
            <rect x="4" y="8" width="48" height="32" rx="9" fill="#EAF8F2" />
            <path d="M10 26 23 16l13 10v11H10z" fill="#82C1A2" />
            <path d="M38 15v16" stroke="#82C1A2" strokeWidth="2" />
            <circle cx="38" cy="14" r="2.2" fill="#82C1A2" />
            <path d="M39 15h6" stroke="#82C1A2" strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case "comercial":
        return (
          <svg viewBox="0 0 56 48" className="h-12 w-12" aria-hidden>
            <rect x="4" y="8" width="48" height="32" rx="9" fill="#EAF8F2" />
            <rect x="18" y="12" width="20" height="24" rx="2" fill="#82C1A2" />
            <path d="M22 18h3M27 18h3M32 18h2M22 23h3M27 23h3M32 23h2M22 28h3M27 28h3M32 28h2" stroke="#EAF0ED" strokeWidth="1.6" strokeLinecap="round" />
            <rect x="26" y="30" width="4" height="6" rx="1" fill="#EAF0ED" />
          </svg>
        );
      default:
        return (
          <svg viewBox="0 0 56 48" className="h-12 w-12" aria-hidden>
            <rect x="4" y="8" width="48" height="32" rx="9" fill="#EAF8F2" />
            <ellipse cx="21" cy="26" rx="9" ry="6" fill="#82C1A2" />
            <ellipse cx="31" cy="23" rx="10" ry="7" fill="#B6DFC8" />
            <path d="M11 33c4-2 8-2 12 0 3-1 7-1 10 0 3-1 6-1 9 0" stroke="#82C1A2" strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
    }
  }

  const filteredLocationSuggestions = locationSuggestions
    .filter((item) => normalizeText(item).includes(normalizeText(location)))
    .slice(0, 8);

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 pb-8 pt-0 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1200px] space-y-10">
        <div
          className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden"
          style={{ minHeight: `${Math.max(420, Math.min(heroHeightPx + 240, 760))}px` }}
        >
          {heroImageUrl ? (
            <>
              <img
                src={heroImageUrl}
                alt="Imagem de fundo do topo"
                className="absolute inset-0 z-0 h-full w-full"
                loading="eager"
                fetchPriority="high"
                style={{
                  objectFit: heroImageFit,
                  objectPosition: `${heroPositionX}% ${heroPositionY}%`,
                }}
              />
              <div className="pointer-events-none absolute inset-0 z-10 bg-slate-900/38" />
            </>
          ) : null}
          <div className="pointer-events-none absolute -top-16 -left-20 z-10 h-64 w-64 rounded-full bg-gradient-to-br from-sky-200/55 to-transparent blur-2xl" />
          <div className="pointer-events-none absolute -bottom-20 -right-12 z-10 h-72 w-72 rounded-full bg-gradient-to-tr from-indigo-200/45 to-transparent blur-2xl" />
          <div className="relative z-20 mx-auto grid w-full max-w-[1200px] grid-cols-1 items-stretch gap-8 px-4 pt-4 sm:px-6 sm:pt-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:px-8">
          <section
            className="!mt-0 h-full rounded-[24px] p-8 sm:p-10 flex flex-col justify-between"
          >
            <div>
              <h1 className="text-[40px] md:text-[50px] lg:text-[56px] leading-[1.05] font-extrabold tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]">
                Venda ou compre imóvel direto com o proprietário
              </h1>
              <p className="mt-5 text-lg text-slate-100 max-w-xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]">
                Mais autonomia na negociação. Mais transparência na escolha.
              </p>
              <p className="mt-3 text-sm font-medium text-slate-200 drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]">
                Plataforma digital para conexão direta entre interessados.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/anunciar"
                  className="cta-primary inline-flex h-12 w-full items-center justify-center rounded-xl px-5 text-sm font-extrabold tracking-wide transition sm:w-auto"
                >
                  ANUNCIAR GRÁTIS
                </Link>
                <Link
                  href="/imoveis"
                  className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 sm:w-auto"
                >
                  BUSCAR IMÓVEIS
                </Link>
              </div>
            </div>

          </section>

          <section
            id="home-search"
            className="!mt-0 h-full w-full rounded-[24px] bg-white/95 p-6 backdrop-blur-sm"
            style={{ boxShadow: "0 12px 40px rgba(15,23,42,0.08)" }}
          >
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Busque por localização, tipo e preço</h2>
            <p className="text-slate-600 mb-6">Resultados rápidos com filtros completos.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select className={fieldClassName} value={kind} onChange={(e) => setKind(e.target.value as "" | "venda" | "locacao")}>
                <option value="">Comprar ou Alugar</option>
                <option value="venda">Comprar</option>
                <option value="locacao">Alugar</option>
              </select>

              <select className={fieldClassName} value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>
                <option value="">Tipo de imóvel</option>
                <option value="Apartamento">Apartamento</option>
                <option value="Casa">Casa</option>
                <option value="Casa em condomínio">Casa em condomínio</option>
                <option value="Cobertura">Cobertura</option>
                <option value="Terreno">Terreno</option>
                <option value="Comercial">Comercial</option>
              </select>

              <div className="relative md:col-span-2">
                <input
                  type="text"
                  placeholder="Endereço, Bairro ou Cidade"
                  className={`${fieldClassName} w-full`}
                  value={location}
                  onFocus={() => setShowLocationSuggestions(true)}
                  onBlur={() => {
                    setTimeout(() => setShowLocationSuggestions(false), 120);
                  }}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    setShowLocationSuggestions(true);
                  }}
                />
                {showLocationSuggestions && location.trim().length > 0 && filteredLocationSuggestions.length > 0 ? (
                  <div className="absolute z-20 mt-1 w-full rounded-[14px] border border-slate-200 bg-white shadow-lg max-h-56 overflow-auto">
                    {filteredLocationSuggestions.map((item) => (
                      <button
                        key={item}
                        type="button"
                        className="block w-full text-left px-3 py-2 text-slate-800 hover:bg-slate-100"
                        onClick={() => {
                          setLocation(item);
                          setShowLocationSuggestions(false);
                        }}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <input
                type="text"
                inputMode="numeric"
                placeholder="Valor mínimo"
                className={fieldClassName}
                value={minPrice}
                onChange={(e) => setMinPrice(formatCurrencyInput(e.target.value))}
                onBlur={(e) => setMinPrice(finalizeCurrencyInput(e.target.value))}
              />

              <input
                type="text"
                inputMode="numeric"
                placeholder="Valor máximo"
                className={fieldClassName}
                value={maxPrice}
                onChange={(e) => setMaxPrice(formatCurrencyInput(e.target.value))}
                onBlur={(e) => setMaxPrice(finalizeCurrencyInput(e.target.value))}
              />

              <select
                className={fieldClassName}
                value={bedrooms}
                onChange={(e) => setBedrooms(e.target.value as "" | "1" | "2" | "3" | "4")}
              >
                <option value="">Quartos (mín.)</option>
                <option value="1">1+</option>
                <option value="2">2+</option>
                <option value="3">3+</option>
                <option value="4">4+</option>
              </select>

              <input
                type="text"
                placeholder="Condomínio ou Código"
                className={fieldClassName}
                value={condoOrCode}
                onChange={(e) => setCondoOrCode(e.target.value)}
              />
            </div>

            <div className="mt-4 flex gap-3">
              <button
                onClick={clearFilters}
                className="w-full h-14 rounded-[14px] border border-slate-200 px-4 font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Limpar
              </button>
              <button
                onClick={handleSearch}
                className="cta-primary w-full h-14 rounded-[14px] px-4 text-base font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.15)]"
              >
                Buscar imóveis
              </button>
            </div>

          </section>
          </div>
        </div>

        <section className="!mt-0 p-0">
          <h2 className="text-lg font-bold leading-none text-[#19191D] md:text-2xl">Como funciona</h2>
          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <article className="rounded-2xl border border-slate-200 bg-[#EAF0ED] px-6 py-7">
              <div className="grid grid-cols-[32px_1fr] items-center gap-3">
                <span
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-base font-bold text-white"
                  style={{ backgroundColor: "#82C1A2" }}
                >
                  1
                </span>
                <h3 className="text-sm font-semibold leading-none text-[#19191D] md:text-lg">Anuncie seu imóvel</h3>
              </div>
              <div className="mt-5 grid grid-cols-[32px_1fr] items-start gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center text-[#82C1A2]">
                  <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
                    <path d="M3 11.5L12 4l9 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M6 10.5V20h12v-9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M10 20v-5h4v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <p className="text-sm leading-tight text-[#19191D] md:text-base">
                  Publique seu imóvel em
                  <br />
                  poucos minutos.
                </p>
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-[#FAFAFA] px-6 py-7">
              <div className="grid grid-cols-[32px_1fr] items-center gap-3">
                <span
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-base font-bold text-white"
                  style={{ backgroundColor: "#82C1A2" }}
                >
                  2
                </span>
                <h3 className="text-sm font-semibold leading-none text-[#19191D] md:text-lg">Receba contatos</h3>
              </div>
              <div className="mt-5 grid grid-cols-[32px_1fr] items-start gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center text-[#82C1A2]">
                  <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
                    <path d="M20 14a6 6 0 0 1-6 6H7l-3 2v-8a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <p className="text-sm leading-tight text-[#19191D] md:text-base">
                  Interessados entram em contato
                  <br />
                  diretamente pela plataforma.
                </p>
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-[#EAF0ED] px-6 py-7">
              <div className="grid grid-cols-[32px_1fr] items-center gap-3">
                <span
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-base font-bold text-white"
                  style={{ backgroundColor: "#82C1A2" }}
                >
                  3
                </span>
                <h3 className="text-sm font-semibold leading-none text-[#19191D] md:text-lg">Negocie diretamente</h3>
              </div>
              <div className="mt-5 grid grid-cols-[32px_1fr] items-start gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center text-[#82C1A2]">
                  <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
                    <path d="M8.5 12.5 11 15a2 2 0 0 0 2.8 0l3.2-3.2a2 2 0 0 0 0-2.8L15.5 7.5a2 2 0 0 0-2.8 0L10.5 9.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M5 14.5 2.8 12.3a2 2 0 0 1 0-2.8L5 7.3a2 2 0 0 1 2.8 0L10 9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M19 9.5 21.2 11.7a2 2 0 0 1 0 2.8L19 16.7a2 2 0 0 1-2.8 0L14 14.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <p className="text-sm leading-tight text-[#19191D] md:text-base">
                  Comprador e proprietário
                  <br />
                  conversam diretamente.
                </p>
              </div>
            </article>
          </div>
        </section>

        {featuredListings.length > 0 ? (
          <section id="highlights" className="!mt-0">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-3xl font-bold tracking-tight text-[#19191D]">Imóveis recentes</h2>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFeaturedKindFilter("todos")}
                  className={`rounded-full px-4 py-2 text-sm font-semibold border transition ${
                    featuredKindFilter === "todos"
                      ? "bg-[#0F172A] text-white border-[#0F172A]"
                      : "bg-white text-slate-800 border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setFeaturedKindFilter("venda")}
                  className={`rounded-full px-4 py-2 text-sm font-semibold border transition ${
                    featuredKindFilter === "venda"
                      ? "bg-[#0F172A] text-white border-[#0F172A]"
                      : "bg-white text-slate-800 border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  Venda
                </button>
                <button
                  type="button"
                  onClick={() => setFeaturedKindFilter("locacao")}
                  className={`rounded-full px-4 py-2 text-sm font-semibold border transition ${
                    featuredKindFilter === "locacao"
                      ? "bg-[#0F172A] text-white border-[#0F172A]"
                      : "bg-white text-slate-800 border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  Locação
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/imoveis")}
                  className="ml-0 text-sm font-semibold text-[#19191D] hover:opacity-80 sm:ml-2"
                >
                  Ver todos
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {visibleFeaturedListings.map((item) => {
                const imageUrl = getFirstImageUrl(item.image_urls);
                const title = item.listing_title?.trim() || item.property_type || "Imóvel";
                const locationText = [item.neighborhood, item.city].filter(Boolean).join(" - ");

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => router.push(`/imoveis?open=${item.id}`)}
                    className="group text-left bg-white border border-slate-200 rounded-[12px] overflow-hidden shadow-[0_6px_20px_rgba(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-[6px]"
                  >
                    <div className="relative overflow-hidden">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={title}
                          className="w-full h-[220px] object-cover bg-slate-100 transition-transform duration-500 group-hover:scale-[1.04]"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-[220px] bg-slate-200" />
                      )}
                      <div className="absolute top-3 left-3 flex items-center gap-2">
                        <span className="rounded-full bg-[#0F172A]/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
                          Destaque
                        </span>
                        {item.kind ? (
                          <span className="rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-800 shadow-sm">
                            {item.kind === "venda" ? "Venda" : "Locação"}
                          </span>
                        ) : null}
                      </div>
                      <span
                        aria-hidden
                        className="absolute top-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-sm transition group-hover:scale-105"
                      >
                        ♡
                      </span>
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent px-4 pb-3 pt-7">
                        <p className="text-left text-2xl font-bold leading-none text-white drop-shadow-sm">
                          {(item.price ?? 0).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                            minimumFractionDigits: 0,
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="p-3.5">
                      <h3 className="line-clamp-2 text-[15px] font-semibold leading-tight text-[#19191D]">{title}</h3>
                      {locationText ? (
                        <p className="mt-1 line-clamp-1 text-sm text-slate-600">{locationText}</p>
                      ) : null}
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                        {item.area_sqm ? (
                          <span className="inline-flex items-center gap-1">
                            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-slate-500" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                              <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            {item.area_sqm} m²
                          </span>
                        ) : null}
                        {item.bedrooms ? (
                          <span className="inline-flex items-center gap-1">
                            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-slate-500" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                              <path d="M3 11h18v7H3zM5 11V8h5v3M13 11V9h6v2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            {item.bedrooms}
                          </span>
                        ) : null}
                        {item.bathrooms ? (
                          <span className="inline-flex items-center gap-1">
                            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-slate-500" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                              <path d="M4 11h16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Zm3 2v3m10-3v3M8 11V8a2 2 0 1 1 4 0v3" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            {item.bathrooms}
                          </span>
                        ) : null}
                        {item.parking_spots ? (
                          <span className="inline-flex items-center gap-1">
                            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-slate-500" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                              <path d="M5 14h14l-1-4H6l-1 4Zm2 0v3m10-3v3M8 17a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm8 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            {item.parking_spots}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })}

              {visibleFeaturedListings.length < 4 ? (
                <article className="rounded-[12px] border border-slate-200 bg-white p-6 shadow-[0_6px_20px_rgba(0,0,0,0.08)] flex flex-col justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#19191D] mb-2">
                      Para proprietários
                    </p>
                    <h3 className="text-2xl font-bold text-[#19191D] leading-tight">
                      Anuncie seu imóvel em 2 minutos
                    </h3>
                    <p className="text-sm text-[#19191D] mt-3">
                      Crie seu anúncio, suba fotos e receba contatos diretos de interessados.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push("/anunciar")}
                    className="cta-primary mt-6 rounded-[14px] px-4 py-3 text-sm font-semibold transition"
                  >
                    Cadastrar imóvel
                  </button>
                </article>
              ) : null}
            </div>
            {visibleFeaturedListings.length === 0 ? (
              <p className="text-sm text-[#19191D] mt-3">
                Não há imóveis em destaque para este tipo no momento.
              </p>
            ) : null}
          </section>
        ) : null}

        <section className="!mt-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-[#19191D] md:text-[40px]">Explore por tipo de imóvel</h2>
              <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {exploreTypes.map((type) => (
                  <Link
                    key={type.label}
                    href={`/imoveis?propertyType=${encodeURIComponent(type.value)}`}
                    className="group flex min-h-[126px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-3 text-center text-sm font-medium text-[#19191D] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#BFC8CC] hover:bg-[#EEF2F3] hover:shadow-[0_8px_18px_rgba(15,23,42,0.10)]"
                  >
                    <span className="transition-transform duration-200 group-hover:scale-[1.03]">
                      {renderExploreIcon(type.id)}
                    </span>
                    <span className="text-[18px] leading-tight">{type.label}</span>
                  </Link>
                ))}
              </div>
            </div>

            <article className="relative overflow-hidden rounded-2xl border border-slate-200 bg-[#FAFAFA] p-6">
              <div className="relative z-10 max-w-[330px]">
                <h3 className="text-[22px] leading-tight font-semibold text-[#19191D] md:text-[26px]">
                  Quer vender ou alugar seu imóvel?
                </h3>
                <p className="mt-3 text-base leading-relaxed text-slate-700">
                  Anuncie gratuitamente e conecte-se diretamente com interessados.
                </p>
                <Link
                  href="/anunciar"
                  className="mt-6 inline-flex h-12 items-center justify-center rounded-xl bg-[#0E9F6E] px-6 text-base font-semibold text-white transition hover:bg-[#0A8A5E]"
                >
                  Anunciar imóvel
                </Link>
              </div>
              <div className="pointer-events-none absolute right-2 bottom-0 hidden lg:block">
                <svg viewBox="0 0 220 180" className="h-[170px] w-[210px]" aria-hidden>
                  <ellipse cx="92" cy="148" rx="74" ry="20" fill="#EAF0ED" />
                  <rect x="14" y="76" width="72" height="50" rx="10" fill="#82C1A2" />
                  <path d="M14 85 50 56l36 29" fill="#82C1A2" />
                  <rect x="41" y="96" width="18" height="30" rx="3" fill="#EAF0ED" />
                  <rect x="106" y="56" width="48" height="36" rx="8" fill="#D3D8D9" />
                  <path d="M106 62 130 44l24 18" fill="#D3D8D9" />
                  <circle cx="172" cy="82" r="22" fill="#EAF0ED" />
                  <rect x="164" y="96" width="34" height="48" rx="10" fill="#D3D8D9" />
                </svg>
              </div>
            </article>
          </div>
        </section>

      </div>
    </main>
  );
}
