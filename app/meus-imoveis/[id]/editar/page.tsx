"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../../lib/supabase";
import {
  DEFAULT_LISTING_PLANS,
  calculateActiveUntil,
  loadListingPlans,
  type ListingPlan,
} from "../../../../lib/listing-plans";
import {
  finalizeCurrencyInput,
  formatCurrencyFromNumber,
  formatCurrencyInput,
  parseCurrencyInputToNumber,
} from "../../../../lib/currency-input";

const MAX_PHOTOS = 10;
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;
const CONDO_AMENITY_OPTIONS = [
  "Piscina",
  "Churrasqueira",
  "Quadra",
  "Salão de festas",
  "Piscina aquecida",
  "Área pet",
  "Brinquedoteca",
  "Portaria 24h",
  "Outros",
];

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatCep(value: string) {
  const digits = onlyDigits(value).slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function normalizeImageUrls(value: unknown): string[] {
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

function normalizeStringArray(value: unknown): string[] {
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

async function uploadListingImages(userId: string, files: File[]) {
  const urls: string[] = [];

  for (const file of files) {
    const safeName = sanitizeFileName(file.name);
    const path = `listings/${userId}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("listing-images")
      .upload(path, file, { upsert: false, cacheControl: "3600" });

    if (uploadError) {
      throw new Error(
        "Não foi possível enviar as fotos. Verifique se o bucket 'listing-images' existe e permite upload."
      );
    }

    const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
    if (data?.publicUrl) urls.push(data.publicUrl);
  }

  return urls;
}

type PhotoItem = {
  id: string;
  kind: "existing" | "new";
  url: string;
  file?: File;
};

type Listing = {
  id: string;
  owner_id: string;
  kind: "venda" | "locacao";
  property_type: string;
  listing_title?: string | null;
  city: string | null;
  neighborhood: string | null;
  cep?: string | null;
  address?: string | null;
  address_number?: string | null;
  address_complement?: string | null;
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
  price?: number | null;
  description?: string | null;
  image_urls?: unknown;
  plan_id?: string | null;
};

export default function EditarImovelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const fieldClassName =
    "border border-slate-400 text-slate-950 placeholder:text-slate-700 p-3 rounded-lg";

  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingCep, setLoadingCep] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [listingId, setListingId] = useState<string>("");
  const [ownerId, setOwnerId] = useState<string>("");
  const [authorized, setAuthorized] = useState(false);

  const [kind, setKind] = useState<"venda" | "locacao">("venda");
  const [propertyType, setPropertyType] = useState("Apartamento");
  const [listingTitle, setListingTitle] = useState("");
  const [city, setCity] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [cep, setCep] = useState("");
  const [address, setAddress] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [addressComplement, setAddressComplement] = useState("");
  const [condoName, setCondoName] = useState("");
  const [isInCondo, setIsInCondo] = useState<"sim" | "nao">("nao");
  const [condoAmenities, setCondoAmenities] = useState<string[]>([]);
  const [condoAmenitiesOther, setCondoAmenitiesOther] = useState("");
  const [condoFee, setCondoFee] = useState("");
  const [iptuFee, setIptuFee] = useState("");
  const [bedrooms, setBedrooms] = useState<number | "">("");
  const [bathrooms, setBathrooms] = useState<number | "">("");
  const [suites, setSuites] = useState<number | "">("");
  const [areaSqm, setAreaSqm] = useState<number | "">("");
  const [parkingSpots, setParkingSpots] = useState<number | "">("");
  const [code, setCode] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [photoItems, setPhotoItems] = useState<PhotoItem[]>([]);
  const [plans, setPlans] = useState<ListingPlan[]>(DEFAULT_LISTING_PLANS);
  const [selectedPlanId, setSelectedPlanId] = useState("free-120");
  const createdPreviewUrlsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const { id } = await params;
      setListingId(id);

      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      if (!user) {
        setMsg("Você precisa estar logado para editar anúncio.");
        setLoadingPage(false);
        return;
      }

      const { data, error } = await supabase.from("listings").select("*").eq("id", id).single();
      if (error || !data) {
        setMsg("Anúncio não encontrado.");
        setLoadingPage(false);
        return;
      }

      const listing = data as Listing;
      if (listing.owner_id !== user.id) {
        setMsg("Você não tem permissão para editar este anúncio.");
        setLoadingPage(false);
        return;
      }

      setOwnerId(user.id);
      setAuthorized(true);
      setKind(listing.kind ?? "venda");
      setPropertyType(listing.property_type ?? "Apartamento");
      setListingTitle(listing.listing_title ?? "");
      setCity(listing.city ?? "");
      setNeighborhood(listing.neighborhood ?? "");
      setCep(formatCep(listing.cep ?? ""));
      setAddress(listing.address ?? "");
      setAddressNumber(listing.address_number ?? "");
      setAddressComplement(listing.address_complement ?? "");
      setCondoName(listing.condo_name ?? "");
      setIsInCondo(
        listing.condo_is_in === true ||
          Boolean((listing.condo_name ?? "").trim()) ||
          listing.condo_fee != null
          ? "sim"
          : "nao"
      );
      setCondoAmenities(normalizeStringArray(listing.condo_amenities));
      setCondoAmenitiesOther(listing.condo_amenities_other ?? "");
      setCondoFee(formatCurrencyFromNumber(listing.condo_fee));
      setIptuFee(formatCurrencyFromNumber(listing.iptu_fee));
      setBedrooms(listing.bedrooms ?? "");
      setBathrooms(listing.bathrooms ?? "");
      setSuites(listing.suites ?? "");
      setAreaSqm(listing.area_sqm ?? "");
      setParkingSpots(listing.parking_spots ?? "");
      setCode(listing.code ?? "");
      setPrice(formatCurrencyFromNumber(listing.price));
      setDescription(listing.description ?? "");
      const existingUrls = normalizeImageUrls(listing.image_urls);
      setPhotoItems(
        existingUrls.map((url, index) => ({
          id: `existing-${index}-${crypto.randomUUID()}`,
          kind: "existing",
          url,
        }))
      );
      setSelectedPlanId(listing.plan_id ?? "free-120");
      setLoadingPage(false);
    })();
  }, [params]);

  useEffect(() => {
    loadListingPlans()
      .then((loaded) => setPlans(loaded))
      .catch(() => setPlans(DEFAULT_LISTING_PLANS));
  }, []);

  useEffect(() => {
    const previewUrls = createdPreviewUrlsRef.current;
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
      previewUrls.clear();
    };
  }, []);

  async function autoFillFromCep() {
    const cleanCep = onlyDigits(cep);
    if (cleanCep.length !== 8) return;

    try {
      setLoadingCep(true);
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = (await response.json()) as {
        erro?: boolean;
        logradouro?: string;
        bairro?: string;
        localidade?: string;
      };

      if (data.erro) return;
      if (data.logradouro) setAddress(data.logradouro);
      if (data.bairro) setNeighborhood(data.bairro);
      if (data.localidade) setCity(data.localidade);
    } finally {
      setLoadingCep(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setSaving(true);

    try {
      if (!authorized || !listingId) {
        setMsg("Não autorizado.");
        return;
      }

      const existingImageUrls = photoItems
        .filter((item) => item.kind === "existing")
        .map((item) => item.url);
      const newImagesInOrder = photoItems
        .filter((item) => item.kind === "new")
        .map((item) => item.file)
        .filter((file): file is File => Boolean(file));

      let imageUrls = existingImageUrls;
      let photoWarning: string | null = null;
      let schemaWarning: string | null = null;
      const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) ?? plans[0];
      if (!selectedPlan) {
        setMsg("Nenhum plano disponível para atualização.");
        return;
      }
      if (newImagesInOrder.length > 0) {
        try {
          const uploadedUrls = await uploadListingImages(ownerId, newImagesInOrder);
          imageUrls = [...existingImageUrls, ...uploadedUrls];
        } catch {
          photoWarning =
            "As alterações do anúncio foram salvas, mas as novas fotos não. Verifique o bucket/políticas do Supabase Storage (listing-images).";
        }
      }

      const basePayload = {
        kind,
        property_type: propertyType,
        city,
        neighborhood: neighborhood || null,
        bedrooms: typeof bedrooms === "number" ? bedrooms : null,
        condo_name: condoName || null,
        code: code || null,
        price: parseCurrencyInputToNumber(price),
      };

      const fullPayload = {
        ...basePayload,
        cep: onlyDigits(cep) || null,
        address: address.trim() || null,
        address_number: addressNumber.trim() || null,
        address_complement: addressComplement.trim() || null,
        condo_is_in: isInCondo === "sim",
        condo_amenities:
          isInCondo === "sim"
            ? condoAmenities.filter((item) => item !== "Outros")
            : null,
        condo_amenities_other:
          isInCondo === "sim" && condoAmenities.includes("Outros")
            ? condoAmenitiesOther.trim() || null
            : null,
        listing_title: listingTitle.trim() || null,
        plan_id: selectedPlan.id,
        plan_name: selectedPlan.name,
        plan_price: selectedPlan.price,
        plan_days: selectedPlan.days,
        is_featured: selectedPlan.is_featured,
        active_until: calculateActiveUntil(selectedPlan.days),
        bathrooms: typeof bathrooms === "number" ? bathrooms : null,
        suites: typeof suites === "number" ? suites : null,
        area_sqm: typeof areaSqm === "number" ? areaSqm : null,
        parking_spots: typeof parkingSpots === "number" ? parkingSpots : null,
        condo_name: isInCondo === "sim" ? condoName || null : null,
        condo_fee: isInCondo === "sim" ? parseCurrencyInputToNumber(condoFee) : null,
        iptu_fee: parseCurrencyInputToNumber(iptuFee),
        description: description.trim() || null,
        image_urls: imageUrls.length > 0 ? imageUrls : null,
      };

      let { error } = await supabase
        .from("listings")
        .update(fullPayload)
        .eq("id", listingId)
        .eq("owner_id", ownerId);

      if (error) {
        const text = `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`.toLowerCase();
        const maybeMissingColumns =
          text.includes("cep") ||
          text.includes("address") ||
          text.includes("address_number") ||
          text.includes("address_complement") ||
          text.includes("bathrooms") ||
          text.includes("suites") ||
          text.includes("area_sqm") ||
          text.includes("parking_spots") ||
          text.includes("condo_fee") ||
          text.includes("iptu_fee") ||
          text.includes("description") ||
          text.includes("image_urls") ||
          text.includes("listing_title") ||
          text.includes("plan_id") ||
          text.includes("plan_name") ||
          text.includes("plan_price") ||
          text.includes("plan_days") ||
          text.includes("is_featured") ||
          text.includes("active_until") ||
          text.includes("condo_is_in") ||
          text.includes("condo_amenities") ||
          text.includes("condo_amenities_other");

        if (maybeMissingColumns) {
          const retry = await supabase
            .from("listings")
            .update(basePayload)
            .eq("id", listingId)
            .eq("owner_id", ownerId);
          error = retry.error;
          if (!error) {
            schemaWarning =
              "Alguns campos novos não foram salvos porque as colunas ainda não existem na tabela listings.";
          }
        }
      }

      if (error) {
        const hint = error.hint ? ` (${error.hint})` : "";
        throw new Error(`${error.message}${hint}`);
      }

      createdPreviewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      createdPreviewUrlsRef.current.clear();

      setPhotoItems(
        imageUrls.map((url, index) => ({
          id: `existing-${index}-${crypto.randomUUID()}`,
          kind: "existing",
          url,
        }))
      );
      setMsg(
        `✅ Anúncio atualizado com sucesso.${
          schemaWarning ? ` ${schemaWarning}` : ""
        }${photoWarning ? ` ${photoWarning}` : ""}`
      );
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Erro ao atualizar anúncio.");
    } finally {
      setSaving(false);
    }
  }

  function handleAddNewPhotos(files: File[]) {
    const remaining = MAX_PHOTOS - photoItems.length;
    if (remaining <= 0) {
      setMsg(`Limite máximo de ${MAX_PHOTOS} fotos atingido.`);
      return;
    }

    const selected = files.slice(0, remaining);
    if (files.length > remaining) {
      setMsg(`Você pode adicionar no máximo ${MAX_PHOTOS} fotos no total.`);
    }

    const tooLarge = selected.find((file) => file.size > MAX_FILE_SIZE_BYTES);
    if (tooLarge) {
      setMsg(`A foto "${tooLarge.name}" ultrapassa 8MB.`);
      return;
    }

    const newItems: PhotoItem[] = selected.map((file) => {
      const previewUrl = URL.createObjectURL(file);
      createdPreviewUrlsRef.current.add(previewUrl);
      return {
        id: `new-${crypto.randomUUID()}`,
        kind: "new",
        url: previewUrl,
        file,
      };
    });

    setPhotoItems((current) => [...current, ...newItems]);
  }

  function handleRemovePhoto(photoId: string) {
    setPhotoItems((current) => {
      const target = current.find((item) => item.id === photoId);
      if (target?.kind === "new") {
        URL.revokeObjectURL(target.url);
        createdPreviewUrlsRef.current.delete(target.url);
      }
      return current.filter((item) => item.id !== photoId);
    });
  }

  function movePhoto(photoId: string, direction: "left" | "right") {
    setPhotoItems((current) => {
      const index = current.findIndex((item) => item.id === photoId);
      if (index < 0) return current;
      const targetIndex = direction === "left" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= current.length) return current;

      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(targetIndex, 0, item);
      return next;
    });
  }

  function setAsPrimary(photoId: string) {
    setPhotoItems((current) => {
      const index = current.findIndex((item) => item.id === photoId);
      if (index <= 0) return current;
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.unshift(item);
      return next;
    });
  }

  function toggleCondoAmenity(value: string) {
    setCondoAmenities((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    );
  }

  if (loadingPage) {
    return <main className="min-h-screen p-8">Carregando anúncio...</main>;
  }

  if (!authorized) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow p-6">
          <p className="font-bold">{msg ?? "Acesso negado."}</p>
          <Link className="underline font-semibold" href="/meus-imoveis">
            Voltar para Meus imóveis
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="w-full max-w-3xl mx-auto bg-white rounded-2xl shadow-lg p-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold">Editar anúncio</h1>
          <Link className="underline font-semibold" href="/meus-imoveis">
            Voltar
          </Link>
        </div>

        <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select className={fieldClassName} value={kind} onChange={(e) => setKind(e.target.value as "venda" | "locacao")}>
            <option value="venda">Venda</option>
            <option value="locacao">Locação</option>
          </select>

          <select className={fieldClassName} value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>
            <option>Apartamento</option>
            <option>Casa</option>
            <option>Terreno</option>
            <option>Comercial</option>
          </select>

          <div className="md:col-span-2 border border-slate-300 rounded-xl p-3">
            <label className="block font-semibold mb-2">Plano do anúncio</label>
            <select
              className={`${fieldClassName} w-full`}
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
            >
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} - R$ {Number(plan.price).toLocaleString("pt-BR")} - {plan.days} dias
                  {plan.is_featured ? " - Destaque" : ""}
                </option>
              ))}
            </select>
          </div>

          <input className={fieldClassName} placeholder="Cidade *" value={city} onChange={(e) => setCity(e.target.value)} />
          <input className={fieldClassName} placeholder="Bairro" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} />
          <input
            className={fieldClassName}
            placeholder="CEP"
            value={cep}
            onChange={(e) => setCep(formatCep(e.target.value))}
            onBlur={autoFillFromCep}
          />
          <input className={fieldClassName} placeholder="Endereço" value={address} onChange={(e) => setAddress(e.target.value)} />
          <input className={fieldClassName} placeholder="Número" value={addressNumber} onChange={(e) => setAddressNumber(e.target.value)} />
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1">Fica em condomínio?</label>
            <select
              className={fieldClassName}
              value={isInCondo}
              onChange={(e) => {
                const next = e.target.value as "sim" | "nao";
                setIsInCondo(next);
                if (next === "nao") {
                  setCondoName("");
                  setCondoFee("");
                  setCondoAmenities([]);
                  setCondoAmenitiesOther("");
                }
              }}
            >
              <option value="nao">Não</option>
              <option value="sim">Sim</option>
            </select>
          </div>
          {isInCondo === "sim" ? (
            <input
              className={fieldClassName}
              placeholder="Nome do condomínio"
              value={condoName}
              onChange={(e) => setCondoName(e.target.value)}
            />
          ) : null}
          <input
            className={`${fieldClassName} md:col-span-2`}
            placeholder="Complemento (bloco, apartamento, etc.)"
            value={addressComplement}
            onChange={(e) => setAddressComplement(e.target.value)}
          />
          {isInCondo === "sim" ? (
            <div className="md:col-span-2 rounded-lg border border-slate-300 p-3">
              <p className="text-sm font-semibold text-slate-900 mb-2">Lazer/estrutura do condomínio</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {CONDO_AMENITY_OPTIONS.map((option) => (
                  <label key={option} className="flex items-center gap-2 text-sm text-slate-800">
                    <input
                      type="checkbox"
                      checked={condoAmenities.includes(option)}
                      onChange={() => toggleCondoAmenity(option)}
                    />
                    {option}
                  </label>
                ))}
              </div>
              {condoAmenities.includes("Outros") ? (
                <input
                  className={`${fieldClassName} mt-3`}
                  placeholder="Outros itens do condomínio"
                  value={condoAmenitiesOther}
                  onChange={(e) => setCondoAmenitiesOther(e.target.value)}
                />
              ) : null}
            </div>
          ) : null}
          {isInCondo === "sim" ? (
            <input
              className={fieldClassName}
              type="text"
              inputMode="numeric"
              placeholder="Valor do condomínio"
              value={condoFee}
              onChange={(e) => setCondoFee(formatCurrencyInput(e.target.value))}
              onBlur={(e) => setCondoFee(finalizeCurrencyInput(e.target.value))}
            />
          ) : null}
          <input
            className={fieldClassName}
            type="text"
            inputMode="numeric"
            placeholder="Valor do IPTU"
            value={iptuFee}
            onChange={(e) => setIptuFee(formatCurrencyInput(e.target.value))}
            onBlur={(e) => setIptuFee(finalizeCurrencyInput(e.target.value))}
          />
          <div className="md:col-span-2 -mt-2 text-sm text-gray-600">
            {loadingCep
              ? "Consultando CEP..."
              : "Ao preencher o CEP, o sistema preenche rua e bairro automaticamente."}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1">Quartos</label>
            <input
              className={fieldClassName}
              type="number"
              min={0}
              value={bedrooms}
              onChange={(e) => setBedrooms(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1">Banheiros</label>
            <input
              className={fieldClassName}
              type="number"
              min={0}
              value={bathrooms}
              onChange={(e) => setBathrooms(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1">Suítes</label>
            <input
              className={fieldClassName}
              type="number"
              min={0}
              value={suites}
              onChange={(e) => setSuites(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>

          <input
            className={fieldClassName}
            type="number"
            min={0}
            step="0.01"
            placeholder="Área (m²)"
            value={areaSqm}
            onChange={(e) => setAreaSqm(e.target.value === "" ? "" : Number(e.target.value))}
          />

          <input
            className={fieldClassName}
            type="number"
            min={0}
            placeholder="Vagas de garagem"
            value={parkingSpots}
            onChange={(e) => setParkingSpots(e.target.value === "" ? "" : Number(e.target.value))}
          />

          <input className={fieldClassName} placeholder="Código do imóvel" value={code} onChange={(e) => setCode(e.target.value)} />

          <input
            className={fieldClassName}
            type="text"
            inputMode="numeric"
            placeholder={kind === "venda" ? "Preço de venda (R$)" : "Aluguel (R$)"}
            value={price}
            onChange={(e) => setPrice(formatCurrencyInput(e.target.value))}
            onBlur={(e) => setPrice(finalizeCurrencyInput(e.target.value))}
          />

          <input
            className={`${fieldClassName} md:col-span-2`}
            placeholder="Título do imóvel"
            value={listingTitle}
            onChange={(e) => setListingTitle(e.target.value)}
          />

          <textarea
            className={`${fieldClassName} md:col-span-2 min-h-28`}
            placeholder="Descrição do imóvel"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="md:col-span-2 border border-slate-400 rounded-lg p-3">
            <label className="block font-semibold mb-2">
              Fotos do imóvel (principal + miniaturas)
            </label>
            <label
              htmlFor="edit-photo-upload-input"
              className="inline-flex cursor-pointer items-center rounded-xl bg-black px-4 py-2 font-semibold text-white hover:bg-gray-800 transition"
            >
              Adicionar fotos
            </label>
            <input
              id="edit-photo-upload-input"
              className="mt-3 block w-full rounded-lg border border-slate-300 p-2"
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length === 0) return;
                handleAddNewPhotos(files);
                e.currentTarget.value = "";
              }}
            />
            <p className="text-sm text-gray-600 mt-2">
              Adicione novas fotos sem perder as antigas. Você pode escolher a foto
              principal, mover ordem e excluir miniaturas.
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Total: {photoItems.length}/{MAX_PHOTOS}
            </p>

            {photoItems.length > 0 ? (
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {photoItems.map((photo, index) => (
                  <div
                    key={photo.id}
                    className="border rounded-xl p-2 bg-white flex flex-col gap-2"
                  >
                    <img
                      src={photo.url}
                      alt={`Foto ${index + 1}`}
                      className="w-full h-24 object-cover rounded-md"
                    />
                    <div className="text-xs text-slate-700">
                      {index === 0 ? "Foto principal" : `Foto ${index + 1}`}
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        className="text-xs border rounded px-2 py-1 hover:bg-gray-50"
                        onClick={() => setAsPrimary(photo.id)}
                        disabled={index === 0}
                      >
                        Principal
                      </button>
                      <button
                        type="button"
                        className="text-xs border rounded px-2 py-1 hover:bg-red-50 text-red-700"
                        onClick={() => handleRemovePhoto(photo.id)}
                      >
                        Excluir
                      </button>
                      <button
                        type="button"
                        className="text-xs border rounded px-2 py-1 hover:bg-gray-50"
                        onClick={() => movePhoto(photo.id, "left")}
                        disabled={index === 0}
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        className="text-xs border rounded px-2 py-1 hover:bg-gray-50"
                        onClick={() => movePhoto(photo.id, "right")}
                        disabled={index === photoItems.length - 1}
                      >
                        →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600 mt-3">Nenhuma foto selecionada.</p>
            )}
          </div>

          <button
            disabled={saving}
            className="cta-primary md:col-span-2 px-6 py-3 rounded-xl transition disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </form>

        {msg && <div className="mt-4 text-sm rounded-lg border p-3 bg-gray-50">{msg}</div>}
      </div>
    </main>
  );
}
