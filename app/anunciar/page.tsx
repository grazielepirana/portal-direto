"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";
import {
  DEFAULT_LISTING_PLANS,
  calculateActiveUntil,
  loadListingPlans,
  type ListingPlan,
} from "../../lib/listing-plans";
import {
  finalizeCurrencyInput,
  formatCurrencyInput,
  parseCurrencyInputToNumber,
} from "../../lib/currency-input";

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
    if (data?.publicUrl) {
      urls.push(data.publicUrl);
    }
  }

  return urls;
}

function AnunciarPageContent() {
  const searchParams = useSearchParams();
  const fieldClassName =
    "h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-900 placeholder:text-slate-500";

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
  const [bedrooms, setBedrooms] = useState<number>(1);
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
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [isDraggingPhotos, setIsDraggingPhotos] = useState(false);
  const [plans, setPlans] = useState<ListingPlan[]>(DEFAULT_LISTING_PLANS);
  const [selectedPlanId, setSelectedPlanId] = useState("free-120");
  const [hasPreviousListing, setHasPreviousListing] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showMobileSummary, setShowMobileSummary] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const availablePlans = useMemo(
    () =>
      hasPreviousListing
        ? plans.filter((plan) => plan.id !== "free-120")
        : plans,
    [hasPreviousListing, plans]
  );

  const steps = [
    { id: 1, title: "Tipo & Plano" },
    { id: 2, title: "Endereço" },
    { id: 3, title: "Valores & Detalhes" },
    { id: 4, title: "Fotos & Publicar" },
  ];

  useEffect(() => {
    if (availablePlans.length === 0) return;
    const exists = availablePlans.some((plan) => plan.id === selectedPlanId);
    if (!exists) setSelectedPlanId(availablePlans[0].id);
  }, [availablePlans, selectedPlanId]);

  useEffect(() => {
    loadListingPlans()
      .then((loaded) => setPlans(loaded))
      .catch(() => setPlans(DEFAULT_LISTING_PLANS));
  }, []);

  useEffect(() => {
    const planFromUrl = searchParams.get("plan");
    if (!planFromUrl || plans.length === 0) return;
    if (plans.some((plan) => plan.id === planFromUrl)) {
      setSelectedPlanId(planFromUrl);
    }
  }, [searchParams, plans]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (!userId) return;

      const { count } = await supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", userId);

      setHasPreviousListing((count ?? 0) > 0);
    })();
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

      if (data.erro) {
        setMsg("CEP não encontrado.");
        return;
      }

      if (data.logradouro) setAddress(data.logradouro);
      if (data.bairro) setNeighborhood(data.bairro);
      if (data.localidade) setCity(data.localidade);
    } catch {
      setMsg("Não foi possível consultar o CEP agora.");
    } finally {
      setLoadingCep(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    try {
      let successMessage: string | null = null;
      let photoWarning: string | null = null;

      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const user = userRes.user;
      if (!user) {
        setMsg("Você precisa estar logado para anunciar. Vá em /login.");
        return;
      }

      const priceNumber = parseCurrencyInputToNumber(price);

      if (!city || !propertyType || priceNumber == null) {
        setMsg("Preencha pelo menos: tipo, cidade e preço.");
        return;
      }

      if (photoFiles.length === 0) {
        setMsg("Adicione pelo menos 1 foto do imóvel para publicar o anúncio.");
        return;
      }

      const { count: listingCount } = await supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id);
      const alreadyHasListing = (listingCount ?? 0) > 0;
      setHasPreviousListing(alreadyHasListing);

      const usablePlans = alreadyHasListing
        ? plans.filter((plan) => plan.id !== "free-120")
        : plans;
      const chosenPlan =
        usablePlans.find((plan) => plan.id === selectedPlanId) ?? usablePlans[0];

      if (!chosenPlan) {
        setMsg("Nenhum plano disponível no momento.");
        return;
      }

      let images: string[] = [];
      if (photoFiles.length > 0) {
        try {
          images = await uploadListingImages(user.id, photoFiles);
        } catch {
          photoWarning =
            "As informações do imóvel foram salvas, mas as fotos não. Verifique o bucket/políticas do Supabase Storage (listing-images).";
        }
      }

      const payload = {
        owner_id: user.id,
        kind,
        property_type: propertyType,
        listing_title: listingTitle.trim() || null,
        plan_id: chosenPlan.id,
        plan_name: chosenPlan.name,
        plan_price: chosenPlan.price,
        plan_days: chosenPlan.days,
        is_featured: chosenPlan.is_featured,
        active_until: calculateActiveUntil(chosenPlan.days),
        city,
        neighborhood: neighborhood || null,
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
        bedrooms: bedrooms || null,
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
        code: code || null,
        price: priceNumber,
      };

      const payloadWithExtras = {
        ...payload,
        description: description.trim() || null,
        image_urls: images.length > 0 ? images : null,
      };

      let createdListingId: string | null = null;
      let error: { message?: string; details?: string; hint?: string } | null = null;
      const { error: insertError, data: insertedData } = await supabase
        .from("listings")
        .insert(payloadWithExtras)
        .select("id")
        .single();
      error = insertError;
      createdListingId = (insertedData as { id?: string } | null)?.id ?? null;

      // Fallback para bancos que ainda não tenham colunas novas.
      if (error) {
        const text = `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`.toLowerCase();
        const missingNewColumns =
          text.includes("description") ||
          text.includes("image_urls") ||
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

        if (missingNewColumns) {
          const fallbackPayload = {
            owner_id: user.id,
            kind,
            property_type: propertyType,
            listing_title: listingTitle.trim() || null,
            city,
            neighborhood: neighborhood || null,
            bedrooms: bedrooms || null,
            condo_name: condoName || null,
            code: code || null,
            price: priceNumber,
          };

          const retry = await supabase
            .from("listings")
            .insert(fallbackPayload)
            .select("id")
            .single();
          error = retry.error;
          createdListingId = (retry.data as { id?: string } | null)?.id ?? createdListingId;
          if (!error) {
            successMessage =
              "✅ Anúncio criado! Para salvar todos os novos campos, adicione as colunas listing_title, description, image_urls, cep, address, address_number, address_complement, bathrooms, area_sqm, parking_spots, condo_fee, iptu_fee, condo_is_in, condo_amenities, condo_amenities_other, plan_id, plan_name, plan_price, plan_days, is_featured e active_until na tabela listings.";
          }
        }
      }

      if (error) throw error;

      setMsg(
        `${successMessage ?? "✅ Anúncio criado! Ele fica ativo por 120 dias grátis."}${
          photoWarning ? ` ${photoWarning}` : ""
        }`
      );

      if ((chosenPlan.price ?? 0) > 0) {
        const params = new URLSearchParams();
        params.set("plan", chosenPlan.id);
        params.set("planName", chosenPlan.name);
        params.set("amount", String(chosenPlan.price));
        params.set("days", String(chosenPlan.days));
        if (createdListingId) params.set("listing", createdListingId);
        window.location.href = `/pagamento?${params.toString()}`;
        return;
      }

      setCity("");
      setNeighborhood("");
      setCep("");
      setAddress("");
      setAddressNumber("");
      setAddressComplement("");
      setCondoName("");
      setIsInCondo("nao");
      setCondoAmenities([]);
      setCondoAmenitiesOther("");
      setCondoFee("");
      setIptuFee("");
      setBedrooms(1);
      setBathrooms("");
      setSuites("");
      setAreaSqm("");
      setParkingSpots("");
      setCondoName("");
      setCode("");
      setPrice("");
      setListingTitle("");
      setDescription("");
      setPropertyDetails([]);
      setAcceptsTrade("nao");
      setTradeType("");
      setTradeValue("");
      setPhotoFiles([]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao criar anúncio.";
      setMsg(message);
    } finally {
      setLoading(false);
    }
  }

  function handlePhotoSelection(files: File[]) {
    if (files.length > MAX_PHOTOS) {
      setMsg(`Selecione no máximo ${MAX_PHOTOS} fotos.`);
      setPhotoFiles(files.slice(0, MAX_PHOTOS));
      return;
    }

    const tooLarge = files.find((file) => file.size > MAX_FILE_SIZE_BYTES);
    if (tooLarge) {
      setMsg(`A foto "${tooLarge.name}" ultrapassa 8MB.`);
      return;
    }

    setPhotoFiles(files);
  }

  function addPhotoFiles(newFiles: File[]) {
    if (newFiles.length === 0) return;
    const merged = [...photoFiles, ...newFiles];
    handlePhotoSelection(merged);
  }

  function removePhotoAt(index: number) {
    setPhotoFiles((current) => current.filter((_, i) => i !== index));
  }

  function setCoverPhoto(index: number) {
    setPhotoFiles((current) => {
      if (index <= 0 || index >= current.length) return current;
      const next = [...current];
      const [selected] = next.splice(index, 1);
      next.unshift(selected);
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
    if (currentStep === 1 && !selectedPlanId) {
      setMsg("Selecione um plano para continuar.");
      return;
    }
    if (currentStep === 2 && !city.trim()) {
      setMsg("Preencha a cidade para continuar.");
      return;
    }
    if (currentStep === 3 && parseCurrencyInputToNumber(price) == null) {
      setMsg("Preencha o preço para continuar.");
      return;
    }
    setMsg(null);
    setCurrentStep((prev) => Math.min(4, prev + 1));
  }

  function goToPreviousStep() {
    setCurrentStep((prev) => Math.max(1, prev - 1));
  }

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-8 lg:px-8">
      <div className="mx-auto w-full max-w-[1200px]">
        <div className="mb-6">
          <h1 className="text-4xl font-extrabold text-slate-900">Cadastrar Imóvel</h1>
          <p className="mt-2 text-sm text-slate-600">
            Publique seu anúncio por <b>120 dias grátis</b> (válido apenas para o primeiro anúncio).
          </p>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {steps.map((step) => (
              <div key={step.id} className="space-y-2">
                <div
                  className={`h-2 rounded-full ${
                    step.id <= currentStep ? "bg-[#0F172A]" : "bg-slate-200"
                  }`}
                />
                <p className="text-xs font-semibold text-slate-600">{step.id}. {step.title}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:hidden">
          <button
            type="button"
            onClick={() => setShowMobileSummary((prev) => !prev)}
            className="flex w-full items-center justify-between text-left"
          >
            <span className="text-sm font-bold text-slate-900">Resumo do anúncio</span>
            <span className="text-sm font-semibold text-slate-600">{showMobileSummary ? "Ocultar" : "Mostrar"}</span>
          </button>
          {showMobileSummary ? (
            <div className="mt-3 space-y-2 text-sm">
              <p><span className="font-semibold text-slate-800">Finalidade:</span> {kind === "venda" ? "Venda" : "Locação"}</p>
              <p><span className="font-semibold text-slate-800">Tipo:</span> {propertyType || "-"}</p>
              <p><span className="font-semibold text-slate-800">Cidade/Bairro:</span> {[city, neighborhood].filter(Boolean).join(" / ") || "-"}</p>
              <p><span className="font-semibold text-slate-800">Preço:</span> {price || "-"}</p>
              <p><span className="font-semibold text-slate-800">Título:</span> {listingTitle || "-"}</p>
              <p><span className="font-semibold text-slate-800">Fotos:</span> {photoFiles.length}</p>
            </div>
          ) : null}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,720px)_minmax(0,1fr)]">
            <div className="space-y-6">
              {currentStep === 1 ? (
                <section className="!mt-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-bold text-slate-900">Tipo e plano</h2>
                  <p className="mt-1 text-sm text-slate-600">Defina a categoria do imóvel e o plano do anúncio.</p>
                  <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-800">Finalidade</label>
                      <select
                        className={fieldClassName}
                        value={kind}
                        onChange={(e) => setKind(e.target.value as "venda" | "locacao")}
                      >
                        <option value="venda">Venda</option>
                        <option value="locacao">Locação</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-800">Tipo de imóvel</label>
                      <select
                        className={fieldClassName}
                        value={propertyType}
                        onChange={(e) => setPropertyType(e.target.value)}
                      >
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
                      <p className="mt-2 text-sm text-slate-600">
                        {hasPreviousListing
                          ? "O plano grátis é válido apenas para o primeiro anúncio."
                          : "Seu primeiro anúncio pode usar o plano grátis por 120 dias."}
                      </p>
                    </div>
                  </div>
                </section>
              ) : null}

              {currentStep === 2 ? (
                <>
                  <section className="!mt-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-xl font-bold text-slate-900">Endereço</h2>
                    <p className="mt-1 text-sm text-slate-600">Informe onde fica o imóvel.</p>
                    <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-800">Cidade *</label>
                        <input className={fieldClassName} value={city} onChange={(e) => setCity(e.target.value)} />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-800">Bairro</label>
                        <input className={fieldClassName} value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-800">CEP</label>
                        <input
                          className={fieldClassName}
                          value={cep}
                          onChange={(e) => setCep(formatCep(e.target.value))}
                          onBlur={autoFillFromCep}
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-800">Endereço</label>
                        <input className={fieldClassName} value={address} onChange={(e) => setAddress(e.target.value)} />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-800">Número</label>
                        <input className={fieldClassName} value={addressNumber} onChange={(e) => setAddressNumber(e.target.value)} />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-800">Complemento</label>
                        <input
                          className={fieldClassName}
                          value={addressComplement}
                          onChange={(e) => setAddressComplement(e.target.value)}
                        />
                      </div>
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
                        <>
                          <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-800">Nome do condomínio</label>
                            <input
                              className={fieldClassName}
                              value={condoName}
                              onChange={(e) => setCondoName(e.target.value)}
                            />
                          </div>
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
                                placeholder="Outros itens"
                                value={condoAmenitiesOther}
                                onChange={(e) => setCondoAmenitiesOther(e.target.value)}
                              />
                            ) : null}
                          </div>
                        </>
                      ) : null}
                      <p className="md:col-span-2 text-sm text-slate-600">
                        {loadingCep
                          ? "Consultando CEP..."
                          : "Ao preencher o CEP, o sistema preenche rua e bairro automaticamente."}
                      </p>
                    </div>
                  </section>

                </>
              ) : null}

              {currentStep === 3 ? (
                <section className="!mt-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-bold text-slate-900">Valores & Detalhes</h2>
                  <p className="mt-1 text-sm text-slate-600">Preencha valores e características do imóvel.</p>
                  <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-800">
                        {kind === "venda" ? "Preço de venda (R$) *" : "Aluguel (R$) *"}
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
                    {isInCondo === "sim" ? (
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-800">Valor do condomínio</label>
                        <input
                          className={fieldClassName}
                          type="text"
                          inputMode="numeric"
                          value={condoFee}
                          onChange={(e) => setCondoFee(formatCurrencyInput(e.target.value))}
                          onBlur={(e) => setCondoFee(finalizeCurrencyInput(e.target.value))}
                        />
                      </div>
                    ) : null}
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-800">Valor do IPTU</label>
                      <input
                        className={fieldClassName}
                        type="text"
                        inputMode="numeric"
                        value={iptuFee}
                        onChange={(e) => setIptuFee(formatCurrencyInput(e.target.value))}
                        onBlur={(e) => setIptuFee(finalizeCurrencyInput(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-800">Quartos</label>
                      <input className={fieldClassName} type="number" min={0} value={bedrooms} onChange={(e) => setBedrooms(Number(e.target.value))} />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-800">Banheiros</label>
                      <input className={fieldClassName} type="number" min={0} value={bathrooms} onChange={(e) => setBathrooms(e.target.value === "" ? "" : Number(e.target.value))} />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-800">Suítes</label>
                      <input className={fieldClassName} type="number" min={0} value={suites} onChange={(e) => setSuites(e.target.value === "" ? "" : Number(e.target.value))} />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-800">Área (m²)</label>
                      <input className={fieldClassName} type="number" min={0} step="0.01" value={areaSqm} onChange={(e) => setAreaSqm(e.target.value === "" ? "" : Number(e.target.value))} />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-800">Vagas de garagem</label>
                      <input className={fieldClassName} type="number" min={0} value={parkingSpots} onChange={(e) => setParkingSpots(e.target.value === "" ? "" : Number(e.target.value))} />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-800">Código do imóvel</label>
                      <input className={fieldClassName} value={code} onChange={(e) => setCode(e.target.value)} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm font-semibold text-slate-800">Título do imóvel</label>
                      <input className={fieldClassName} value={listingTitle} onChange={(e) => setListingTitle(e.target.value)} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm font-semibold text-slate-800">Descrição</label>
                      <textarea
                        className="min-h-32 w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900 placeholder:text-slate-500"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                      />
                    </div>

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
                  <h2 className="text-xl font-bold text-slate-900">Fotos e revisão</h2>
                  <p className="mt-1 text-sm text-slate-600">Adicione fotos e revise antes de publicar.</p>

                  <div className="mt-6 space-y-4">
                    <div
                      className={`rounded-2xl border-2 border-dashed p-6 text-center transition ${
                        isDraggingPhotos ? "border-slate-500 bg-slate-50" : "border-slate-300"
                      }`}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setIsDraggingPhotos(true);
                      }}
                      onDragLeave={(event) => {
                        event.preventDefault();
                        setIsDraggingPhotos(false);
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        setIsDraggingPhotos(false);
                        addPhotoFiles(Array.from(event.dataTransfer.files));
                      }}
                    >
                      <p className="text-sm font-semibold text-slate-900">Arraste as fotos aqui</p>
                      <p className="mt-1 text-sm text-slate-600">ou</p>
                      <label
                        htmlFor="photo-upload-input"
                        className="mt-3 inline-flex cursor-pointer items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                      >
                        Selecionar fotos
                      </label>
                      <input
                        id="photo-upload-input"
                        className="hidden"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => {
                          const files = Array.from(e.target.files ?? []);
                          addPhotoFiles(files);
                          e.currentTarget.value = "";
                        }}
                      />
                      <p className="mt-3 text-xs text-slate-500">
                        De 1 até {MAX_PHOTOS} fotos (máx. 8MB por arquivo)
                      </p>
                    </div>

                    {photoFiles.length > 0 ? (
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                        {photoFiles.map((file, index) => (
                          <div key={`${file.name}-${file.size}-${index}`} className="rounded-xl border border-slate-200 p-2">
                            <div className="relative h-24 w-full overflow-hidden rounded-lg bg-slate-100">
                              <img
                                src={URL.createObjectURL(file)}
                                alt={file.name}
                                className="h-full w-full object-cover"
                              />
                              {index === 0 ? (
                                <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-white">
                                  Capa
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-2 truncate text-xs text-slate-700">{file.name}</p>
                            <div className="mt-2 flex gap-2">
                              <button
                                type="button"
                                onClick={() => setCoverPhoto(index)}
                                className="flex-1 rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                Capa
                              </button>
                              <button
                                type="button"
                                onClick={() => removePhotoAt(index)}
                                className="flex-1 rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                Remover
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </section>
              ) : null}

              {msg ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">{msg}</div>
              ) : null}

              <div className="hidden items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex">
                <button
                  type="button"
                  onClick={goToPreviousStep}
                  disabled={currentStep === 1}
                  className="h-11 rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Voltar
                </button>
                {currentStep < 4 ? (
                  <button
                    type="button"
                    onClick={goToNextStep}
                    className="h-11 rounded-xl bg-[#0F172A] px-5 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    Próximo
                  </button>
                ) : (
                  <button
                    disabled={loading}
                    className="cta-primary h-11 rounded-xl px-5 text-sm font-semibold disabled:opacity-60"
                  >
                    {loading ? "Salvando..." : "Publicar anúncio"}
                  </button>
                )}
              </div>
            </div>

            <aside className="hidden lg:block">
              <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900">Resumo</h3>
                <div className="mt-4 space-y-3 text-sm">
                  <p><span className="font-semibold text-slate-800">Finalidade:</span> {kind === "venda" ? "Venda" : "Locação"}</p>
                  <p><span className="font-semibold text-slate-800">Tipo:</span> {propertyType || "-"}</p>
                  <p><span className="font-semibold text-slate-800">Cidade/Bairro:</span> {[city, neighborhood].filter(Boolean).join(" / ") || "-"}</p>
                  <p><span className="font-semibold text-slate-800">Preço:</span> {price || "-"}</p>
                  <p><span className="font-semibold text-slate-800">Título:</span> {listingTitle || "-"}</p>
                  <p><span className="font-semibold text-slate-800">Fotos:</span> {photoFiles.length}</p>
                </div>
              </div>
            </aside>
          </div>

          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white p-3 shadow-[0_-8px_20px_rgba(15,23,42,0.08)] md:hidden">
            <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3">
              <button
                type="button"
                onClick={goToPreviousStep}
                disabled={currentStep === 1}
                className="h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 disabled:opacity-50"
              >
                Voltar
              </button>
              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={goToNextStep}
                  className="h-11 flex-1 rounded-xl bg-[#0F172A] px-4 text-sm font-semibold text-white"
                >
                  Próximo
                </button>
              ) : (
                <button
                  disabled={loading}
                  className="cta-primary h-11 flex-1 rounded-xl px-4 text-sm font-semibold disabled:opacity-60"
                >
                  {loading ? "Salvando..." : "Publicar anúncio"}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}

export default function AnunciarPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-gray-100 p-8" />}>
      <AnunciarPageContent />
    </Suspense>
  );
}
