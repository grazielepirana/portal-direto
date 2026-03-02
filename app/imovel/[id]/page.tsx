import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import FavoriteButton from "../../FavoriteButton";
import ShareListingButton from "./ShareListingButton";
import ImageGallery from "./ImageGallery";
import ContactOwnerCard from "./ContactOwnerCard";
import ReportListingButton from "./ReportListingButton";
import { formatTimeAgo } from "../../../lib/time-ago";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
);

function normalizeImageUrls(value: unknown): string[] {
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
      // Mantém fallback por quebra de linha/vírgula
    }

    return text
      .split(/\r?\n|,/)
      .map((v) => v.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeStringArray(value: unknown): string[] {
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

    return text
      .split(/\r?\n|,/)
      .map((v) => v.trim())
      .filter(Boolean);
  }

  return [];
}

function getFirstImageUrl(value: unknown) {
  return normalizeImageUrls(value)[0] ?? null;
}

export default async function ImovelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: listing, error } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-xl bg-white rounded-2xl shadow p-6">
          <p className="font-bold">Erro ao buscar imóvel</p>
          <p className="text-sm text-gray-600 mt-2">{error.message}</p>
          <p className="text-sm text-gray-600 mt-2">ID: {id}</p>
        </div>
      </main>
    );
  }

  if (!listing) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p>Imóvel não encontrado.</p>
      </main>
    );
  }

  const imageUrls = normalizeImageUrls(listing.image_urls);
  const condoAmenities = normalizeStringArray(listing.condo_amenities);
  const condoAmenitiesOther = String(listing.condo_amenities_other ?? "").trim();
  const shouldShowCondoAmenities =
    listing.condo_is_in === true || condoAmenities.length > 0 || condoAmenitiesOther.length > 0;
  const mapQuery = [
    listing.address,
    listing.address_number,
    listing.address_complement,
    listing.neighborhood,
    listing.city,
  ]
    .filter(Boolean)
    .join(", ");

  const { data: similarRaw } = await supabase
    .from("listings")
    .select("id,kind,property_type,listing_title,image_urls,price,city,neighborhood,created_at")
    .neq("id", id)
    .limit(20);

  const similarListings = ((similarRaw as Array<{
    id: string;
    kind: "venda" | "locacao";
    property_type: string;
    listing_title?: string | null;
    image_urls?: unknown;
    price?: number | null;
    city?: string | null;
    neighborhood?: string | null;
    created_at?: string | null;
  }> | null) ?? [])
    .map((item) => {
      let score = 0;
      if (item.kind === listing.kind) score += 4;
      if (item.property_type === listing.property_type) score += 3;
      if ((item.city ?? "").trim().toLowerCase() === (listing.city ?? "").trim().toLowerCase()) score += 2;
      if ((item.neighborhood ?? "").trim().toLowerCase() === (listing.neighborhood ?? "").trim().toLowerCase()) score += 1;
      return { ...item, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  let ownerPhone: string | null = null;
  try {
    const { data: ownerProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", listing.owner_id)
      .single();

    const row = ownerProfile as Record<string, unknown> | null;
    const canShowPhone = Boolean(row?.show_phone_on_listing);
    const phone = String(row?.phone ?? "").trim();
    if (canShowPhone && phone) {
      ownerPhone = phone;
    }
  } catch {
    ownerPhone = null;
  }

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <section className="lg:col-span-2 min-w-0">
            <div className="mb-8">
              <ImageGallery images={imageUrls} />
            </div>

            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold leading-tight break-words">
                  {listing.listing_title?.trim() ||
                    `${listing.property_type} • ${
                      listing.kind === "venda" ? "Venda" : "Locação"
                    }`}
                </h1>
                <p className="text-sm text-slate-600 mt-1">
                  {formatTimeAgo(listing.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <ShareListingButton
                  listingId={listing.id}
                  title={`${listing.property_type} • ${
                    listing.kind === "venda" ? "Venda" : "Locação"
                  }`}
                />
                <FavoriteButton listingId={listing.id} />
                <ReportListingButton
                  listingId={listing.id}
                  listingTitle={
                    listing.listing_title?.trim() ||
                    `${listing.property_type} • ${listing.kind === "venda" ? "Venda" : "Locação"}`
                  }
                />
              </div>
            </div>

            <p className="text-gray-600 mb-2">
              {listing.city} {listing.neighborhood && `- ${listing.neighborhood}`}
            </p>

            {(listing.address || listing.address_number || listing.address_complement) && (
              <p className="text-slate-700 text-lg mb-2">
                Endereço: {listing.address ?? ""}
                {listing.address_number ? `, ${listing.address_number}` : ""}
                {listing.address_complement ? ` - ${listing.address_complement}` : ""}
              </p>
            )}

            {(listing.bedrooms ||
              listing.bathrooms ||
              listing.suites ||
              listing.area_sqm ||
              listing.parking_spots) && (
              <div className="mb-3 flex flex-wrap gap-3">
                {listing.bedrooms ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-slate-800">
                    <span aria-hidden>🛏️</span>
                    {listing.bedrooms} dormitório(s)
                  </span>
                ) : null}
                {listing.bathrooms ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-slate-800">
                    <span aria-hidden>🚿</span>
                    {listing.bathrooms} banheiro(s)
                  </span>
                ) : null}
                {listing.suites ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-slate-800">
                    <span aria-hidden>🛌</span>
                    {listing.suites} suíte(s)
                  </span>
                ) : null}
                {listing.area_sqm ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-slate-800">
                    <span aria-hidden>📐</span>
                    {listing.area_sqm} m²
                  </span>
                ) : null}
                {listing.parking_spots ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-slate-800">
                    <span aria-hidden>🚗</span>
                    {listing.parking_spots} vaga(s)
                  </span>
                ) : null}
              </div>
            )}

            {listing.condo_name && (
              <p className="text-gray-600 mb-2">Condomínio: {listing.condo_name}</p>
            )}

            {shouldShowCondoAmenities ? (
              <div className="mb-3">
                <p className="text-slate-800 font-semibold mb-2">Lazer do condomínio</p>
                <div className="flex flex-wrap gap-2">
                  {condoAmenities.map((item) => (
                    <span key={item} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-800">
                      {item}
                    </span>
                  ))}
                  {condoAmenitiesOther ? (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-800">
                      {condoAmenitiesOther}
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}

            {listing.condo_fee != null && (
              <p className="text-gray-600 mb-2">
                Valor do condomínio: R$ {Number(listing.condo_fee).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            )}

            {listing.iptu_fee != null && (
              <p className="text-gray-600 mb-2">
                Valor do IPTU: R$ {Number(listing.iptu_fee).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            )}

            {listing.code && (
              <p className="text-gray-600 mb-2">Código: {listing.code}</p>
            )}

            {listing.description && (
              <div className="mt-8">
                <h2 className="text-xl font-bold mb-2">Descrição do imóvel</h2>
                <p className="text-gray-600 whitespace-pre-line">{listing.description}</p>
              </div>
            )}

            {mapQuery ? (
              <div className="mt-8">
                <h2 className="text-xl font-bold mb-3">Localização no mapa</h2>
                <div className="overflow-hidden rounded-xl border">
                  <iframe
                    title="Mapa de localização do imóvel"
                    src={`https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`}
                    width="100%"
                    height="320"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>
            ) : null}
          </section>

          <div className="lg:col-span-1">
            <ContactOwnerCard
              ownerId={listing.owner_id}
              listingId={listing.id}
              price={listing.price}
              condoFee={listing.condo_fee}
              iptuFee={listing.iptu_fee}
              ownerPhone={ownerPhone}
            />
          </div>
        </div>
        </div>

        {similarListings.length > 0 ? (
          <section className="mt-8 bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-slate-950 mb-4">Imóveis similares</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {similarListings.map((item) => {
                const photoUrl = getFirstImageUrl(item.image_urls);
                return (
                  <Link
                    key={item.id}
                    href={`/imovel/${item.id}`}
                    className="block rounded-[18px] border border-slate-200 overflow-hidden shadow-[0_6px_20px_rgba(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-[6px]"
                  >
                    {photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photoUrl}
                        alt={`Foto do imóvel ${item.property_type}`}
                        className="w-full h-[220px] object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-[220px] bg-slate-200 flex items-center justify-center text-slate-700 text-sm">
                        Sem foto
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="font-bold text-slate-900 line-clamp-2">
                        {item.listing_title?.trim() || `${item.property_type} • ${item.kind === "venda" ? "Venda" : "Locação"}`}
                      </h3>
                      <p className="text-sm text-slate-600 mt-1">
                        {[item.neighborhood, item.city].filter(Boolean).join(" - ")}
                      </p>
                      <p className="text-[28px] font-bold text-[#0F172A] mt-2">
                        {item.price != null ? `R$ ${Number(item.price).toLocaleString("pt-BR")}` : "Preço não informado"}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
