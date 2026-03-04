"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

export default function Home() {
  const router = useRouter();
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [heroHeightPx, setHeroHeightPx] = useState(DEFAULT_SITE_SETTINGS.hero_height_px);
  const [heroImageFit, setHeroImageFit] = useState<"cover" | "contain">(
    DEFAULT_SITE_SETTINGS.hero_image_fit
  );
  const [heroPositionX, setHeroPositionX] = useState(DEFAULT_SITE_SETTINGS.hero_image_position_x);
  const [heroPositionY, setHeroPositionY] = useState(DEFAULT_SITE_SETTINGS.hero_image_position_y);
  const [infoBlock1BgUrl, setInfoBlock1BgUrl] = useState("");
  const [infoBlock2BgUrl, setInfoBlock2BgUrl] = useState("");
  const [infoBlocksHeightPx, setInfoBlocksHeightPx] = useState(
    DEFAULT_SITE_SETTINGS.home_info_blocks_height_px
  );
  const [infoBlocksImageFit, setInfoBlocksImageFit] = useState<"cover" | "contain">(
    DEFAULT_SITE_SETTINGS.home_info_blocks_image_fit
  );

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

  function applyQuickFilter(next: {
    kind?: "" | "venda" | "locacao";
    propertyType?: string;
    bedrooms?: "" | "1" | "2" | "3" | "4";
  }) {
    if (next.kind !== undefined) setKind(next.kind);
    if (next.propertyType !== undefined) setPropertyType(next.propertyType);
    if (next.bedrooms !== undefined) setBedrooms(next.bedrooms);
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
        setInfoBlock1BgUrl(settings.home_info_block_1_bg_url || "");
        setInfoBlock2BgUrl(settings.home_info_block_2_bg_url || "");
        setInfoBlocksHeightPx(
          Number(settings.home_info_blocks_height_px) > 0
            ? Number(settings.home_info_blocks_height_px)
            : DEFAULT_SITE_SETTINGS.home_info_blocks_height_px
        );
        setInfoBlocksImageFit(
          settings.home_info_blocks_image_fit === "contain" ? "contain" : "cover"
        );
      })
      .catch(() => {
        setHeroImageUrl("");
        setHeroHeightPx(DEFAULT_SITE_SETTINGS.hero_height_px);
        setHeroImageFit(DEFAULT_SITE_SETTINGS.hero_image_fit);
        setHeroPositionX(DEFAULT_SITE_SETTINGS.hero_image_position_x);
        setHeroPositionY(DEFAULT_SITE_SETTINGS.hero_image_position_y);
        setInfoBlock1BgUrl("");
        setInfoBlock2BgUrl("");
        setInfoBlocksHeightPx(DEFAULT_SITE_SETTINGS.home_info_blocks_height_px);
        setInfoBlocksImageFit(DEFAULT_SITE_SETTINGS.home_info_blocks_image_fit);
      });

    (async () => {
      const fromBase = await loadLocationOptions();
      if (fromBase.length > 0) {
        setLocationSuggestions(fromBase.slice(0, 500));
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

      setLocationSuggestions(Array.from(values).slice(0, 80));
    })();

    (async () => {
      const { data } = await supabase
        .from("listings")
        .select(
          "id,kind,listing_title,property_type,price,bedrooms,parking_spots,area_sqm,city,neighborhood,image_urls,is_featured,active_until,created_at"
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
      setFeaturedListings(valid);
    })();
  }, []);

  const visibleFeaturedListings = featuredListings.filter((item) => {
    if (featuredKindFilter === "todos") return true;
    return item.kind === featuredKindFilter;
  });

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
                <button
                  type="button"
                  onClick={() => router.push("/anunciar")}
                  className="cta-primary h-12 w-full rounded-xl px-5 text-sm font-extrabold tracking-wide transition sm:w-auto"
                >
                  ANUNCIAR GRÁTIS
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/imoveis")}
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 sm:w-auto"
                >
                  BUSCAR IMÓVEIS
                </button>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <span className="rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-slate-800">
                Negociação direta
              </span>
              <span className="rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-slate-800">
                Busca inteligente
              </span>
              <span className="rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-slate-800">
                Anúncios verificados
              </span>
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

            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
                Filtros rápidos
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => applyQuickFilter({ kind: "venda" })}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                >
                  Comprar
                </button>
                <button
                  type="button"
                  onClick={() => applyQuickFilter({ kind: "locacao" })}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                >
                  Alugar
                </button>
                <button
                  type="button"
                  onClick={() => applyQuickFilter({ propertyType: "Apartamento" })}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                >
                  Apartamento
                </button>
                <button
                  type="button"
                  onClick={() => applyQuickFilter({ propertyType: "Casa" })}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                >
                  Casa
                </button>
                <button
                  type="button"
                  onClick={() => applyQuickFilter({ bedrooms: "2" })}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                >
                  2+ quartos
                </button>
              </div>
            </div>
          </section>
          </div>
        </div>

        <section className="!mt-0 rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-[1.2fr_1fr] md:items-start">
            <div>
              <h2 className="text-2xl font-bold text-slate-950">Por que anunciar no Portal Direto?</h2>
              <ul className="mt-4 space-y-2 text-sm leading-7 text-slate-700">
                <li>• Publicação rápida</li>
                <li>• Negociação direta entre as partes</li>
                <li>• Autonomia na condução da venda</li>
                <li>• Planos acessíveis</li>
                <li>• Opção gratuita para começar</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm leading-7 text-slate-700">
                A legislação permite que o proprietário negocie diretamente seu imóvel. Nossa plataforma
                facilita essa conexão digital entre as partes, com mais autonomia e transparência.
              </p>
            </div>
          </div>
        </section>

        {featuredListings.length > 0 ? (
          <section id="highlights" className="!mt-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">Imóveis em destaque</h2>
              <div className="flex items-center gap-2">
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
                  className="text-sm font-semibold text-slate-700 hover:text-slate-900 ml-2"
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
                    onClick={() => router.push(`/imovel/${item.id}`)}
                    className="group text-left bg-white border border-slate-200 rounded-[18px] overflow-hidden shadow-[0_6px_20px_rgba(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-[6px]"
                  >
                    <div className="relative overflow-hidden">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={title}
                          className="w-full h-[220px] object-cover bg-slate-100 transition-transform duration-500 group-hover:scale-[1.04]"
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
                    </div>
                    <div className="p-5">
                      <h3 className="text-[22px] font-semibold leading-tight text-slate-900 line-clamp-2 min-h-[3.4rem]">{title}</h3>
                      <p className="text-[32px] font-extrabold text-[#0F172A] mt-2 leading-none">
                        {(item.price ?? 0).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                          minimumFractionDigits: 0,
                        })}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.bedrooms ? (
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            {item.bedrooms} qtos
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
                      {locationText ? (
                        <p className="text-sm text-slate-600 mt-3 line-clamp-1">{locationText}</p>
                      ) : null}
                    </div>
                  </button>
                );
              })}

              {visibleFeaturedListings.length < 4 ? (
                <article className="rounded-[18px] border border-slate-200 bg-white p-6 shadow-[0_6px_20px_rgba(0,0,0,0.08)] flex flex-col justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                      Para proprietários
                    </p>
                    <h3 className="text-2xl font-bold text-slate-900 leading-tight">
                      Anuncie seu imóvel em 2 minutos
                    </h3>
                    <p className="text-sm text-slate-600 mt-3">
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
              <p className="text-sm text-slate-600 mt-3">
                Não há imóveis em destaque para este tipo no momento.
              </p>
            ) : null}
          </section>
        ) : null}

        <section className="!mt-0 grid grid-cols-1 md:grid-cols-2 gap-6">
          <article
            className="rounded-[20px] shadow border border-slate-200 bg-center bg-no-repeat overflow-hidden"
            style={
              infoBlock1BgUrl
                ? {
                    backgroundImage: `url(${infoBlock1BgUrl})`,
                    backgroundSize: infoBlocksImageFit,
                    minHeight: `${infoBlocksHeightPx}px`,
                  }
                : { minHeight: `${infoBlocksHeightPx}px` }
            }
          >
            <div
              className={`${infoBlock1BgUrl ? "bg-black/50" : "bg-white"} p-6`}
              style={{ minHeight: `${infoBlocksHeightPx}px` }}
            >
              <div className="flex items-start gap-3">
                <span className={`text-2xl ${infoBlock1BgUrl ? "text-white" : "text-slate-900"}`} aria-hidden>
                  🤝
                </span>
                <div>
                  <h2 className={`text-2xl font-bold mb-2 ${infoBlock1BgUrl ? "text-white" : "text-slate-950"}`}>
                    Negociação direta
                  </h2>
                  <ul className={`space-y-1 text-sm ${infoBlock1BgUrl ? "text-slate-100" : "text-slate-700"}`}>
                    <li>• Contato sem intermediários</li>
                    <li>• Chat rápido entre comprador e proprietário</li>
                    <li>• Mais transparência na negociação</li>
                  </ul>
                  <button
                    type="button"
                    onClick={() => router.push("/sobre-nos")}
                    className={`mt-4 text-sm font-semibold ${infoBlock1BgUrl ? "text-white" : "text-slate-900"} hover:opacity-80`}
                  >
                    Saiba mais →
                  </button>
                </div>
              </div>
            </div>
          </article>

          <article
            className="rounded-[20px] shadow border border-slate-200 bg-center bg-no-repeat overflow-hidden"
            style={
              infoBlock2BgUrl
                ? {
                    backgroundImage: `url(${infoBlock2BgUrl})`,
                    backgroundSize: infoBlocksImageFit,
                    minHeight: `${infoBlocksHeightPx}px`,
                  }
                : { minHeight: `${infoBlocksHeightPx}px` }
            }
          >
            <div
              className={`${infoBlock2BgUrl ? "bg-black/50" : "bg-white"} p-6`}
              style={{ minHeight: `${infoBlocksHeightPx}px` }}
            >
              <div className="flex items-start gap-3">
                <span className={`text-2xl ${infoBlock2BgUrl ? "text-white" : "text-slate-900"}`} aria-hidden>
                  🏠
                </span>
                <div>
                  <h2 className={`text-2xl font-bold mb-2 ${infoBlock2BgUrl ? "text-white" : "text-slate-950"}`}>
                    Busca simples e anúncios completos
                  </h2>
                  <ul className={`space-y-1 text-sm ${infoBlock2BgUrl ? "text-slate-100" : "text-slate-700"}`}>
                    <li>• Filtros rápidos de localização e preço</li>
                    <li>• Fotos e detalhes completos do imóvel</li>
                    <li>• Navegação fluida no desktop e no celular</li>
                  </ul>
                  <button
                    type="button"
                    onClick={() => router.push("/imoveis")}
                    className={`mt-4 text-sm font-semibold ${infoBlock2BgUrl ? "text-white" : "text-slate-900"} hover:opacity-80`}
                  >
                    Saiba mais →
                  </button>
                </div>
              </div>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
