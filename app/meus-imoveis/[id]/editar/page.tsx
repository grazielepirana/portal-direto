"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  "Quadra poliesportiva",
  "Salão de jogos",
  "Playground",
  "Sauna",
  "Espaço gourmet",
  "Quadra de beach tênis",
  "Quadra de tênis",
  "Home cinema",
  "Sala de massagem",
  "Garage band",
  "Academia",
  "Hidromassagem",
  "Salão de festas",
  "Piscina aquecida",
  "Área pet",
  "Brinquedoteca",
  "Portaria 24h",
  "Outros",
];

const PROPERTY_DETAIL_OPTIONS = [
  "Ar condicionado",
  "Sol da manhã",
  "Sol da tarde",
  "Mobiliado",
  "Varanda gourmet",
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
  property_features?: unknown;
  accepts_trade?: boolean | null;
  trade_type?: string | null;
  trade_value?: number | null;
};

export default function EditarImovelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const fieldClassName =
    "h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-900 placeholder:text-slate-500";

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
  const [propertyDetails, setPropertyDetails] = useState<string[]>([]);
  const [acceptsTrade, setAcceptsTrade] = useState<"sim" | "nao">("nao");
  const [tradeType, setTradeType] = useState("");
  const [tradeValue, setTradeValue] = useState("");
  const [photoItems, setPhotoItems] = useState<PhotoItem[]>([]);
  const [plans, setPlans] = useState<ListingPlan[]>(DEFAULT_LISTING_PLANS);
  const [selectedPlanId, setSelectedPlanId] = useState("free-120");
  const [currentListingPlanId, setCurrentListingPlanId] = useState("");
  const [hasOtherFreeListing, setHasOtherFreeListing] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showMobileSummary, setShowMobileSummary] = useState(false);
  const createdPreviewUrlsRef = useRef<Set<string>>(new Set());

  const steps = [
    { id: 1, title: "Tipo & Plano" },
    { id: 2, title: "Endereço" },
    { id: 3, title: "Valores & Detalhes" },
    { id: 4, title: "Fotos & Salvar" },
  ];

  const canUseFreePlanInEdit = useMemo(
    () => currentListingPlanId === "free-120" || !hasOtherFreeListing,
    [currentListingPlanId, hasOtherFreeListing]
  );

  const availablePlans = useMemo(
    () =>
      plans.filter((plan) => plan.id !== "free-120" || canUseFreePlanInEdit),
    [plans, canUseFreePlanInEdit]
  );

  const selectedPlan =
    availablePlans.find((plan) => plan.id === selectedPlanId) ?? availablePlans[0];

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
      setPropertyDetails(normalizeStringArray(listing.property_features));
      setAcceptsTrade(listing.accepts_trade === true ? "sim" : "nao");
      setTradeType(listing.trade_type ?? "");
      setTradeValue(formatCurrencyFromNumber(listing.trade_value));
      const existingUrls = normalizeImageUrls(listing.image_urls);
      setPhotoItems(
        existingUrls.map((url, index) => ({
          id: `existing-${index}-${crypto.randomUUID()}`,
          kind: "existing",
          url,
        }))
      );
      const currentPlanId = listing.plan_id ?? "free-120";
      setCurrentListingPlanId(currentPlanId);
      setSelectedPlanId(currentPlanId);

      const { count: otherFreeCount } = await supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .eq("plan_id", "free-120")
        .neq("id", id);
      setHasOtherFreeListing((otherFreeCount ?? 0) > 0);
      setLoadingPage(false);
    })();
  }, [params]);

  useEffect(() => {
    loadListingPlans()
      .then((loaded) => setPlans(loaded))
      .catch(() => setPlans(DEFAULT_LISTING_PLANS));
  }, []);

  useEffect(() => {
    if (availablePlans.length === 0) return;
    const exists = availablePlans.some((plan) => plan.id === selectedPlanId);
    if (!exists) {
      setSelectedPlanId(availablePlans[0].id);
    }
  }, [availablePlans, selectedPlanId]);

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
      if (!canUseFreePlanInEdit && selectedPlanId === "free-120") {
        setMsg(
          "O plano grátis é permitido apenas para 1 anúncio por usuário. Escolha outro plano."
        );
        return;
      }
      const selectedPlan =
        availablePlans.find((plan) => plan.id === selectedPlanId) ?? availablePlans[0];
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
        property_features: propertyDetails.length > 0 ? propertyDetails : null,
        accepts_trade: acceptsTrade === "sim",
        trade_type: acceptsTrade === "sim" ? tradeType.trim() || null : null,
        trade_value:
          acceptsTrade === "sim" ? parseCurrencyInputToNumber(tradeValue) : null,
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
          text.includes("condo_amenities_other") ||
          text.includes("property_features") ||
          text.includes("accepts_trade") ||
          text.includes("trade_type") ||
          text.includes("trade_value");

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

  function togglePropertyDetail(value: string) {
    setPropertyDetails((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    );
  }

  function goToNextStep() {
    setMsg(null);
    setCurrentStep((prev) => Math.min(4, prev + 1));
  }

  function goToPreviousStep() {
    setCurrentStep((prev) => Math.max(1, prev - 1));
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
    <main className="min-h-screen bg-gray-100 px-4 py-8 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-950">Editar anúncio</h1>
            <p className="mt-1 text-sm text-slate-600">Atualize as informações do seu imóvel.</p>
          </div>
          <Link href="/meus-imoveis" className="rounded-xl border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50">
            Voltar
          </Link>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            {steps.map((step) => (
              <button
                key={step.id}
                type="button"
                onClick={() => setCurrentStep(step.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  currentStep === step.id
                    ? "bg-[#0F172A] text-white"
                    : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {step.id}. {step.title}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <form onSubmit={handleSave} className="space-y-6">
            {currentStep === 1 ? (
              <section className="!mt-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold text-slate-900">Tipo & Plano</h2>
                <p className="mt-1 text-sm text-slate-600">Defina finalidade, tipo e plano do anúncio.</p>
                <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-800">Finalidade</label>
                    <select className={fieldClassName} value={kind} onChange={(e) => setKind(e.target.value as "venda" | "locacao")}>
                      <option value="venda">Venda</option>
                      <option value="locacao">Locação</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-800">Tipo de imóvel</label>
                    <select className={fieldClassName} value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>
                      <option>Apartamento</option>
                      <option>Casa</option>
                      <option>Terreno</option>
                      <option>Comercial</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-slate-800">Plano do anúncio</label>
                    <select
                      className={fieldClassName}
                      value={selectedPlanId}
                      onChange={(e) => setSelectedPlanId(e.target.value)}
                    >
                      {availablePlans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name} - R$ {Number(plan.price).toLocaleString("pt-BR")} - {plan.days} dias
                          {plan.is_featured ? " - Destaque" : ""}
                        </option>
                      ))}
                    </select>
                    {!canUseFreePlanInEdit ? (
                      <p className="mt-2 text-xs text-slate-600">
                        O plano grátis é limitado a 1 anúncio por usuário.
                      </p>
                    ) : null}
                  </div>
                </div>
              </section>
            ) : null}

            {currentStep === 2 ? (
              <section className="!mt-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold text-slate-900">Endereço</h2>
                <p className="mt-1 text-sm text-slate-600">Atualize localização e informações de condomínio.</p>
                <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
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
                    <label className="mb-2 block text-sm font-semibold text-slate-800">Fica em condomínio?</label>
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
                    <div className="md:col-span-2 rounded-xl border border-slate-200 p-4">
                      <p className="mb-3 text-sm font-semibold text-slate-900">Lazer/estrutura do condomínio</p>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
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
                  <div className="md:col-span-2 text-sm text-slate-600">
                    {loadingCep
                      ? "Consultando CEP..."
                      : "Ao preencher o CEP, o sistema preenche rua e bairro automaticamente."}
                  </div>
                </div>
              </section>
            ) : null}

            {currentStep === 3 ? (
              <section className="!mt-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold text-slate-900">Valores & Detalhes</h2>
                <p className="mt-1 text-sm text-slate-600">Preencha dados e características do imóvel.</p>
                <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-800">Quartos</label>
                    <input
                      className={fieldClassName}
                      type="number"
                      min={0}
                      value={bedrooms}
                      onChange={(e) => setBedrooms(e.target.value === "" ? "" : Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-800">Banheiros</label>
                    <input
                      className={fieldClassName}
                      type="number"
                      min={0}
                      value={bathrooms}
                      onChange={(e) => setBathrooms(e.target.value === "" ? "" : Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-800">Suítes</label>
                    <input
                      className={fieldClassName}
                      type="number"
                      min={0}
                      value={suites}
                      onChange={(e) => setSuites(e.target.value === "" ? "" : Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-800">Área (m²)</label>
                    <input
                      className={fieldClassName}
                      type="number"
                      min={0}
                      step="0.01"
                      value={areaSqm}
                      onChange={(e) => setAreaSqm(e.target.value === "" ? "" : Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-800">Vagas de garagem</label>
                    <input
                      className={fieldClassName}
                      type="number"
                      min={0}
                      value={parkingSpots}
                      onChange={(e) => setParkingSpots(e.target.value === "" ? "" : Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-800">Código do imóvel</label>
                    <input className={fieldClassName} value={code} onChange={(e) => setCode(e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-800">
                      {kind === "venda" ? "Preço de venda (R$)" : "Aluguel (R$)"}
                    </label>
                    <input
                      className={fieldClassName}
                      type="text"
                      inputMode="numeric"
                      value={price}
                      onChange={(e) => setPrice(formatCurrencyInput(e.target.value))}
                      onBlur={(e) => setPrice(finalizeCurrencyInput(e.target.value))}
                    />
                  </div>
                  <input
                    className={`${fieldClassName} md:col-span-2`}
                    placeholder="Título do imóvel"
                    value={listingTitle}
                    onChange={(e) => setListingTitle(e.target.value)}
                  />
                  <textarea
                    className="min-h-32 w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900 placeholder:text-slate-500 md:col-span-2"
                    placeholder="Descrição do imóvel"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />

                  <div className="md:col-span-2 rounded-xl border border-slate-200 p-4">
                    <p className="mb-3 text-sm font-semibold text-slate-900">
                      Detalhes do imóvel
                    </p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                      {PROPERTY_DETAIL_OPTIONS.map((option) => (
                        <label key={option} className="flex items-center gap-2 text-sm text-slate-800">
                          <input
                            type="checkbox"
                            checked={propertyDetails.includes(option)}
                            onChange={() => togglePropertyDetail(option)}
                          />
                          {option}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-2 rounded-xl border border-slate-200 p-4">
                    <p className="mb-3 text-sm font-semibold text-slate-900">Permuta</p>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-800">
                          Aceita permuta?
                        </label>
                        <select
                          className={fieldClassName}
                          value={acceptsTrade}
                          onChange={(e) => {
                            const next = e.target.value as "sim" | "nao";
                            setAcceptsTrade(next);
                            if (next === "nao") {
                              setTradeType("");
                              setTradeValue("");
                            }
                          }}
                        >
                          <option value="nao">Não</option>
                          <option value="sim">Sim</option>
                        </select>
                      </div>
                      {acceptsTrade === "sim" ? (
                        <>
                          <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-800">
                              Tipo de permuta
                            </label>
                            <input
                              className={fieldClassName}
                              placeholder="Ex: carro, apartamento menor, terreno"
                              value={tradeType}
                              onChange={(e) => setTradeType(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-800">
                              Valor estimado da permuta
                            </label>
                            <input
                              className={fieldClassName}
                              type="text"
                              inputMode="numeric"
                              placeholder="R$ 0,00"
                              value={tradeValue}
                              onChange={(e) => setTradeValue(formatCurrencyInput(e.target.value))}
                              onBlur={(e) => setTradeValue(finalizeCurrencyInput(e.target.value))}
                            />
                          </div>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            {currentStep === 4 ? (
              <section className="!mt-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold text-slate-900">Fotos do imóvel</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Adicione novas fotos sem perder as antigas. Defina capa, mova e exclua miniaturas.
                </p>

                <div className="mt-6 rounded-xl border border-slate-300 p-4">
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
                  <p className="mt-2 text-sm text-slate-600">Total: {photoItems.length}/{MAX_PHOTOS}</p>

                  {photoItems.length > 0 ? (
                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                      {photoItems.map((photo, index) => (
                        <div key={photo.id} className="flex flex-col gap-2 rounded-xl border p-2 bg-white">
                          <img
                            src={photo.url}
                            alt={`Foto ${index + 1}`}
                            className="h-24 w-full rounded-md object-cover"
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
                              className="text-xs border rounded px-2 py-1 hover:bg-gray-50"
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
                    <p className="mt-3 text-sm text-slate-600">Nenhuma foto selecionada.</p>
                  )}
                </div>
              </section>
            ) : null}

            {msg ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">{msg}</div>
            ) : null}

            <div className="hidden items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex">
              <button
                type="button"
                onClick={() => setCurrentStep((step) => Math.max(1, step - 1))}
                disabled={currentStep === 1}
                className="h-11 rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Voltar
              </button>
              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep((step) => Math.min(4, step + 1))}
                  className="h-11 rounded-xl bg-[#0F172A] px-5 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Próximo
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={saving}
                  className="cta-primary h-11 rounded-xl px-5 text-sm font-semibold disabled:opacity-60"
                >
                  {saving ? "Salvando..." : "Salvar alterações"}
                </button>
              )}
            </div>
          </form>

          <aside className="space-y-4 self-start lg:sticky lg:top-24">
            <button
              type="button"
              onClick={() => setShowMobileSummary((prev) => !prev)}
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-left text-sm font-semibold text-slate-700 lg:hidden"
            >
              {showMobileSummary ? "Ocultar resumo" : "Mostrar resumo"}
            </button>

            <div className={`${showMobileSummary ? "block" : "hidden"} lg:block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm`}>
              <h3 className="text-base font-bold text-slate-900">Resumo do anúncio</h3>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <p><span className="font-semibold text-slate-800">Finalidade:</span> {kind === "venda" ? "Venda" : "Locação"}</p>
                <p><span className="font-semibold text-slate-800">Tipo:</span> {propertyType}</p>
                <p><span className="font-semibold text-slate-800">Cidade/Bairro:</span> {[city, neighborhood].filter(Boolean).join(" - ") || "-"}</p>
                <p><span className="font-semibold text-slate-800">Preço:</span> {price || "-"}</p>
                <p><span className="font-semibold text-slate-800">Título:</span> {listingTitle || "-"}</p>
                <p><span className="font-semibold text-slate-800">Fotos:</span> {photoItems.length}</p>
                {selectedPlan ? (
                  <p><span className="font-semibold text-slate-800">Plano:</span> {selectedPlan.name}</p>
                ) : null}
              </div>
            </div>
          </aside>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white p-3 md:hidden">
          <div className="mx-auto flex w-full max-w-7xl items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentStep((step) => Math.max(1, step - 1))}
              disabled={currentStep === 1}
              className="h-11 flex-1 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 disabled:opacity-50"
            >
              Voltar
            </button>
            {currentStep < 4 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((step) => Math.min(4, step + 1))}
                className="h-11 flex-1 rounded-xl bg-[#0F172A] px-4 text-sm font-semibold text-white"
              >
                Próximo
              </button>
            ) : (
              <button
                type="submit"
                onClick={(e) => {
                  (e.currentTarget.form as HTMLFormElement | null)?.requestSubmit();
                }}
                disabled={saving}
                className="cta-primary h-11 flex-1 rounded-xl px-4 text-sm font-semibold disabled:opacity-60"
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
