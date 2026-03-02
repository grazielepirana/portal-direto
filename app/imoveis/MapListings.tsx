"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type MapListing = {
  id: string;
  title: string;
  price: number | null;
  city?: string | null;
  neighborhood?: string | null;
  address?: string | null;
  addressNumber?: string | null;
  cep?: string | null;
};

type MarkerPoint = {
  listing: MapListing;
  lat: number;
  lon: number;
};

type GroupedPoint = {
  lat: number;
  lon: number;
  listings: MapListing[];
};

type LeafletMap = {
  setView: (coords: [number, number], zoom: number) => LeafletMap;
  fitBounds: (bounds: LeafletBounds) => void;
};

type LeafletBounds = {
  extend: (coords: [number, number]) => void;
  pad: (ratio: number) => LeafletBounds;
};

type LeafletLayerGroup = {
  addTo: (map: LeafletMap) => LeafletLayerGroup;
  clearLayers: () => void;
};

type LeafletCircleMarker = {
  addTo: (layer: LeafletLayerGroup) => LeafletCircleMarker;
  bindPopup: (html: string) => void;
};

type LeafletMarker = {
  addTo: (layer: LeafletLayerGroup) => LeafletMarker;
  bindPopup: (html: string) => void;
};

type LeafletStatic = {
  map: (container: HTMLDivElement) => LeafletMap;
  tileLayer: (url: string, options: { attribution: string }) => { addTo: (map: LeafletMap) => void };
  layerGroup: () => LeafletLayerGroup;
  latLngBounds: (_: []) => LeafletBounds;
  marker: (
    coords: [number, number],
    options: { icon: { html: string; className: string; iconSize: [number, number] } }
  ) => LeafletMarker;
  divIcon: (options: { html: string; className: string; iconSize: [number, number] }) => {
    html: string;
    className: string;
    iconSize: [number, number];
  };
  circleMarker: (
    coords: [number, number],
    options: { radius: number; color: string; fillColor: string; fillOpacity: number; weight: number }
  ) => LeafletCircleMarker;
};

declare global {
  interface Window {
    L?: LeafletStatic;
  }
}

const LEAFLET_CSS_ID = "leaflet-css-cdn";
const LEAFLET_JS_ID = "leaflet-js-cdn";
const GEO_CACHE_KEY = "portal_map_geocode_cache_v1";
const MAX_NEW_GEOCODES_PER_LOAD = 120;
const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  "sao paulo": { lat: -23.55052, lon: -46.633308 },
  "santo andre": { lat: -23.6639, lon: -46.5383 },
  "sao bernardo do campo": { lat: -23.6944, lon: -46.5654 },
  "sao caetano do sul": { lat: -23.6229, lon: -46.5548 },
  "diadema": { lat: -23.6861, lon: -46.6227 },
  "maua": { lat: -23.6677, lon: -46.4613 },
  "ribeirao pires": { lat: -23.7111, lon: -46.4136 },
  "rio grande da serra": { lat: -23.7437, lon: -46.398 },
  "rio de janeiro": { lat: -22.9068, lon: -43.1729 },
  "belo horizonte": { lat: -19.9167, lon: -43.9345 },
  "curitiba": { lat: -25.4284, lon: -49.2733 },
  "porto alegre": { lat: -30.0346, lon: -51.2177 },
  "salvador": { lat: -12.9714, lon: -38.5014 },
  "fortaleza": { lat: -3.7319, lon: -38.5267 },
  "brasilia": { lat: -15.7939, lon: -47.8828 },
  "recife": { lat: -8.0476, lon: -34.877 },
};

function normalizeKey(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function hashToUnit(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return ((hash % 1000) + 1000) % 1000;
}

function fallbackCoordsForListing(item: MapListing): { lat: number; lon: number } | null {
  const cityKey = normalizeKey(item.city);
  const direct = CITY_COORDS[cityKey];
  const fuzzy =
    direct ??
    Object.entries(CITY_COORDS).find(([key]) => cityKey.includes(key) || key.includes(cityKey))?.[1] ??
    { lat: -23.55052, lon: -46.633308 };

  const noiseSeed = `${item.id}-${normalizeKey(item.neighborhood)}-${normalizeKey(item.address)}`;
  const unitA = hashToUnit(noiseSeed) / 1000;
  const unitB = hashToUnit(`${noiseSeed}-b`) / 1000;

  // Deslocamento pequeno para evitar sobreposição exata quando faltam coordenadas.
  const latOffset = (unitA - 0.5) * 0.06;
  const lonOffset = (unitB - 0.5) * 0.06;
  return {
    lat: fuzzy.lat + latOffset,
    lon: fuzzy.lon + lonOffset,
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function ensureLeafletLoaded() {
  if (typeof window === "undefined") return false;
  if (window.L) return true;

  if (!document.getElementById(LEAFLET_CSS_ID)) {
    const link = document.createElement("link");
    link.id = LEAFLET_CSS_ID;
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
  }

  if (!document.getElementById(LEAFLET_JS_ID)) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.id = LEAFLET_JS_ID;
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Falha ao carregar Leaflet."));
      document.body.appendChild(script);
    });
  } else {
    await new Promise<void>((resolve) => {
      const tryResolve = () => {
        if (window.L) resolve();
        else setTimeout(tryResolve, 50);
      };
      tryResolve();
    });
  }

  return Boolean(window.L);
}

async function geocodeAddress(query: string) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
    query
  )}`;
  try {
    const response = await fetch(url, {
      headers: {
        "Accept-Language": "pt-BR",
      },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as Array<{ lat: string; lon: string }>;
    if (!data[0]) return null;
    return {
      lat: Number(data[0].lat),
      lon: Number(data[0].lon),
    };
  } catch {
    return null;
  }
}

function buildQueries(item: MapListing): string[] {
  const address = item.address?.trim();
  const addressNumber = item.addressNumber?.trim();
  const cep = item.cep?.replace(/\D/g, "").trim();
  const neighborhood = item.neighborhood?.trim();
  const city = item.city?.trim();
  const queries = [
    [address, addressNumber, neighborhood, city, "Brasil"].filter(Boolean).join(", "),
    [address, addressNumber, city, "Brasil"].filter(Boolean).join(", "),
    [address, neighborhood, city, "Brasil"].filter(Boolean).join(", "),
    [neighborhood, city, "Brasil"].filter(Boolean).join(", "),
    [city, "Brasil"].filter(Boolean).join(", "),
    [cep, "Brasil"].filter(Boolean).join(", "),
  ];

  return Array.from(new Set(queries.filter((q) => q.trim().length > 0)));
}

function formatCompactPrice(value: number | null) {
  if (value == null || Number.isNaN(value)) return "R$ ?";
  if (value >= 1_000_000) {
    const mi = value / 1_000_000;
    return `R$ ${mi.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  }
  if (value >= 1_000) {
    const mil = Math.round(value / 1_000);
    return `R$ ${mil.toLocaleString("pt-BR")} mil`;
  }
  return `R$ ${Math.round(value).toLocaleString("pt-BR")}`;
}

function loadStoredGeocodeCache() {
  if (typeof window === "undefined") return new Map<string, { lat: number; lon: number } | null>();
  const raw = window.localStorage.getItem(GEO_CACHE_KEY);
  if (!raw) return new Map<string, { lat: number; lon: number } | null>();

  try {
    const parsed = JSON.parse(raw) as Record<string, { lat: number; lon: number } | null>;
    return new Map<string, { lat: number; lon: number } | null>(Object.entries(parsed));
  } catch {
    return new Map<string, { lat: number; lon: number } | null>();
  }
}

function saveStoredGeocodeCache(cache: Map<string, { lat: number; lon: number } | null>) {
  if (typeof window === "undefined") return;
  const payload: Record<string, { lat: number; lon: number } | null> = {};
  for (const [key, value] of cache.entries()) {
    payload[key] = value;
  }
  window.localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(payload));
}

export default function MapListings({ listings }: { listings: MapListing[] }) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersLayerRef = useRef<LeafletLayerGroup | null>(null);
  const [ready, setReady] = useState(false);
  const [loadingPoints, setLoadingPoints] = useState(false);
  const [points, setPoints] = useState<MarkerPoint[]>([]);

  const normalizedListings = useMemo(
    () =>
      listings
        .slice(0, 120)
        .map((item) => ({
          ...item,
          queries: buildQueries(item),
        })),
    [listings]
  );

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const ok = await ensureLeafletLoaded();
        if (mounted) setReady(ok);
      } catch {
        if (mounted) setReady(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!ready || !mapContainerRef.current || mapRef.current) return;
    const L = window.L;
    if (!L) return;

    const map = L.map(mapContainerRef.current).setView([-23.55052, -46.633308], 11);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png", {
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png", {
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
  }, [ready]);

  useEffect(() => {
    let cancelled = false;
    if (!ready) {
      return;
    }
    if (normalizedListings.length === 0) {
      const timer = window.setTimeout(() => {
        if (!cancelled) setLoadingPoints(false);
      }, 0);
      return () => {
        cancelled = true;
        window.clearTimeout(timer);
      };
    }

    const resetTimer = window.setTimeout(() => {
      if (!cancelled) {
        setPoints([]);
        setLoadingPoints(true);
      }
    }, 0);

    const startTimer = window.setTimeout(() => {
      if (!cancelled) setLoadingPoints(true);
    }, 0);

    (async () => {
      const nextPoints: MarkerPoint[] = [];
      const cache = loadStoredGeocodeCache();
      let newGeocodeCalls = 0;
      let cacheChanged = false;

      for (const item of normalizedListings) {
        if (cancelled) return;
        let coords: { lat: number; lon: number } | null = null;

        for (const query of item.queries) {
          const cached = cache.get(query);

          if (cached !== undefined) {
            if (cached && !Number.isNaN(cached.lat) && !Number.isNaN(cached.lon)) {
              coords = cached;
              break;
            }
            continue;
          }

          if (newGeocodeCalls >= MAX_NEW_GEOCODES_PER_LOAD) continue;

          const fetched = await geocodeAddress(query);
          cache.set(query, fetched ?? null);
          cacheChanged = true;
          newGeocodeCalls += 1;

          if (fetched && !Number.isNaN(fetched.lat) && !Number.isNaN(fetched.lon)) {
            coords = fetched;
            break;
          }

          await new Promise((resolve) => setTimeout(resolve, 90));
        }

        if (coords && !Number.isNaN(coords.lat) && !Number.isNaN(coords.lon)) {
          nextPoints.push({
            listing: {
              id: item.id,
              title: item.title,
              price: item.price,
              city: item.city,
              neighborhood: item.neighborhood,
              address: item.address,
              addressNumber: item.addressNumber,
              cep: item.cep,
            },
            lat: coords.lat,
            lon: coords.lon,
          });
        } else {
          const fallbackCoords = fallbackCoordsForListing(item);
          if (fallbackCoords) {
            nextPoints.push({
              listing: {
                id: item.id,
                title: item.title,
                price: item.price,
                city: item.city,
                neighborhood: item.neighborhood,
                address: item.address,
                addressNumber: item.addressNumber,
                cep: item.cep,
              },
              lat: fallbackCoords.lat,
              lon: fallbackCoords.lon,
            });
          }
        }
      }

      if (cacheChanged) saveStoredGeocodeCache(cache);

      if (!cancelled) {
        setPoints(nextPoints);
        setLoadingPoints(false);
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(resetTimer);
      window.clearTimeout(startTimer);
    };
  }, [ready, normalizedListings]);

  const visiblePoints = useMemo(
    () => (normalizedListings.length === 0 ? [] : points),
    [normalizedListings.length, points]
  );

  const groupedPoints = useMemo(() => {
    const groups = new Map<string, GroupedPoint>();

    for (const point of visiblePoints) {
      const key = `${point.lat.toFixed(5)},${point.lon.toFixed(5)}`;
      const current = groups.get(key);
      if (!current) {
        groups.set(key, {
          lat: point.lat,
          lon: point.lon,
          listings: [point.listing],
        });
      } else {
        current.listings.push(point.listing);
      }
    }

    return Array.from(groups.values());
  }, [visiblePoints]);

  useEffect(() => {
    const L = window.L;
    const map = mapRef.current;
    const layer = markersLayerRef.current;
    if (!L || !map || !layer) return;

    layer.clearLayers();

    if (groupedPoints.length === 0) return;

    const bounds = L.latLngBounds([]);

    for (const group of groupedPoints) {
      const isMultiple = group.listings.length > 1;
      const label = isMultiple
        ? `${group.listings.length} unidades`
        : formatCompactPrice(group.listings[0]?.price ?? null);

      const marker = L.marker([group.lat, group.lon], {
        icon: L.divIcon({
          className: "listing-price-marker",
          html: `<div style="
            background:#111827;
            color:#fff;
            border:1px solid #0f172a;
            border-radius:999px;
            padding:4px 10px;
            font-size:12px;
            font-weight:700;
            white-space:nowrap;
            box-shadow:0 2px 8px rgba(15,23,42,0.25);
          ">${escapeHtml(label)}</div>`,
          iconSize: [90, 30],
        }),
      });
      marker.addTo(layer);

      bounds.extend([group.lat, group.lon]);

      if (isMultiple) {
        const itemsHtml = group.listings
          .slice(0, 8)
          .map((item) => {
            const title = escapeHtml(item.title);
            const price = escapeHtml(
              item.price != null
                ? `R$ ${Number(item.price).toLocaleString("pt-BR")}`
                : "Preço não informado"
            );
            return `<li style="margin-bottom:6px">
              <a href="/imovel/${item.id}" style="text-decoration:underline;font-weight:600">${title}</a>
              <div style="font-size:12px;color:#475569">${price}</div>
            </li>`;
          })
          .join("");
        marker.bindPopup(
          `<div style="min-width:240px">
            <div style="font-weight:700;margin-bottom:8px">${group.listings.length} unidades neste local</div>
            <ul style="padding-left:18px;margin:0">${itemsHtml}</ul>
          </div>`
        );
      } else {
        const only = group.listings[0];
        const title = escapeHtml(only.title);
        const place = escapeHtml([only.neighborhood, only.city].filter(Boolean).join(" - "));
        const priceText =
          only.price != null
            ? `R$ ${Number(only.price).toLocaleString("pt-BR")}`
            : "Preço não informado";
        marker.bindPopup(
          `<div style="min-width:220px">
            <div style="font-weight:700;margin-bottom:6px">${title}</div>
            <div style="font-size:12px;color:#475569;margin-bottom:4px">${place}</div>
            <div style="font-size:13px;font-weight:700;margin-bottom:8px">${escapeHtml(priceText)}</div>
            <a href="/imovel/${only.id}" style="text-decoration:underline;font-weight:600">Ver anúncio</a>
          </div>`
        );
      }
    }

    map.fitBounds(bounds.pad(0.2));
  }, [groupedPoints]);

  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <h3 className="text-xl font-bold text-slate-950 mb-2">Mapa dos anúncios</h3>
      <p className="text-sm text-slate-700 mb-3">
        Clique nos pontos para abrir cada anúncio.
      </p>
      <div ref={mapContainerRef} className="w-full h-[420px] rounded-xl border border-slate-300" />
      {loadingPoints ? (
        <p className="text-sm text-slate-600 mt-3">Carregando posições dos anúncios no mapa...</p>
      ) : groupedPoints.length === 0 ? (
        <p className="text-sm text-slate-600 mt-3">
          Não foi possível localizar os anúncios no mapa para este filtro.
        </p>
      ) : (
        <p className="text-sm text-slate-600 mt-3">{visiblePoints.length} anúncio(s) com posição no mapa.</p>
      )}
    </div>
  );
}
