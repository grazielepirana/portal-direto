"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import { loadProfilesMap } from "../../../lib/profiles";

type Msg = {
  id: string;
  conversation_id: string;
  sender_id: string;
  created_at: string;
  text: string;
};

type Conversation = {
  id: string;
  user_a: string;
  user_b: string;
  listing_id: string | null;
  last_message_text: string | null;
  last_message_at: string | null;
};

type Listing = {
  id: string;
  listing_title?: string | null;
  image_urls?: unknown;
  price?: number | null;
  property_type: string | null;
  kind: string | null; // "venda" | "locacao"
  address?: string | null;
  address_number?: string | null;
  city: string | null;
  neighborhood: string | null;
  code: string | null;

  // opcional (só aparece se existir na sua tabela)
  owner_phone?: string | null;
};

const CHAT_LAST_SEEN_KEY = "portal_chat_last_seen_v1";

function readLastSeenMap(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(CHAT_LAST_SEEN_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function markConversationSeen(conversationId: string) {
  if (typeof window === "undefined" || !conversationId) return;
  const next = { ...readLastSeenMap(), [conversationId]: new Date().toISOString() };
  window.localStorage.setItem(CHAT_LAST_SEEN_KEY, JSON.stringify(next));
}

function getFirstImageUrl(value: unknown): string | null {
  if (!value) return null;
  if (Array.isArray(value)) {
    const first = value.map((item) => String(item).trim()).find(Boolean);
    return first ?? null;
  }
  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return null;
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        const first = parsed.map((item) => String(item).trim()).find(Boolean);
        return first ?? null;
      }
    } catch {
      // fallback
    }
    return text.split(/\r?\n|,/).map((item) => item.trim()).find(Boolean) ?? null;
  }
  return null;
}

export default function ChatRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [conversationId, setConversationId] = useState<string>("");
  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [listingTitles, setListingTitles] = useState<Record<string, string>>({});
  const [listingImages, setListingImages] = useState<Record<string, string>>({});
  const [profileNames, setProfileNames] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [activeChip, setActiveChip] = useState<"all" | "unread" | "archived">("all");
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  const [listing, setListing] = useState<Listing | null>(null);
  const [otherName, setOtherName] = useState<string>("");

  const bottomRef = useRef<HTMLDivElement | null>(null);

  // 1) carregar conversa + listing + mensagens
  useEffect(() => {
    (async () => {
      const { id } = await params;
      setConversationId(id);

      const { data: authData } = await supabase.auth.getUser();
      const uid = authData.user?.id ?? null;
      setUserId(uid);

      if (!uid) {
        setLoading(false);
        return;
      }

      // carrega outras conversas do usuário para mostrar na lateral
      const { data: convs } = await supabase
        .from("conversations")
        .select("id,user_a,user_b,listing_id,last_message_text,last_message_at,created_at")
        .or(`user_a.eq.${uid},user_b.eq.${uid}`)
        .order("last_message_at", { ascending: false })
        .order("created_at", { ascending: false });

      const nextConversations = (convs as Conversation[] | null) ?? [];
      setConversations(nextConversations);

      const otherUserIds = nextConversations.map((conversation) =>
        conversation.user_a === uid ? conversation.user_b : conversation.user_a
      );
      const namesMap = await loadProfilesMap(otherUserIds);
      setProfileNames(namesMap);

      const listingIds = Array.from(
        new Set(
          nextConversations
            .map((conversation) => conversation.listing_id)
            .filter((listingId): listingId is string => Boolean(listingId))
        )
      );
      if (listingIds.length > 0) {
        const { data: listings } = await supabase
          .from("listings")
          .select("id,listing_title,property_type,kind,image_urls")
          .in("id", listingIds);

        const titlesMap: Record<string, string> = {};
        const imagesMap: Record<string, string> = {};
        for (const item of listings ?? []) {
          const listingId = String(item.id);
          const fallback = `${item.property_type ?? "Imóvel"} • ${
            item.kind === "venda" ? "Venda" : "Locação"
          }`;
          titlesMap[listingId] = (item.listing_title as string | null)?.trim() || fallback;
          const firstImage = getFirstImageUrl(item.image_urls);
          if (firstImage) imagesMap[listingId] = firstImage;
        }
        setListingTitles(titlesMap);
        setListingImages(imagesMap);
      }

      const conversationIds = nextConversations.map((conversation) => conversation.id);
      if (conversationIds.length > 0) {
        const { data: messagesRaw } = await supabase
          .from("messages")
          .select("conversation_id,sender_id,created_at")
          .in("conversation_id", conversationIds)
          .order("created_at", { ascending: false });

        const lastSeenMap = readLastSeenMap();
        const counts: Record<string, number> = {};
        for (const conversationKey of conversationIds) counts[conversationKey] = 0;

        for (const msg of messagesRaw ?? []) {
          const conversationKey = String(msg.conversation_id ?? "");
          if (!conversationKey) continue;
          if (String(msg.sender_id ?? "") === uid) continue;

          const seenAt = lastSeenMap[conversationKey];
          if (!seenAt || new Date(String(msg.created_at ?? "")).getTime() > new Date(seenAt).getTime()) {
            counts[conversationKey] = (counts[conversationKey] ?? 0) + 1;
          }
        }
        setUnreadCounts(counts);
      }

      // pega listing_id da conversa
      const { data: conv, error: convErr } = await supabase
        .from("conversations")
        .select("listing_id,user_a,user_b")
        .eq("id", id)
        .single();

      if (!convErr && conv) {
        const otherUserId = conv.user_a === uid ? conv.user_b : conv.user_a;
        if (otherUserId) {
          const namesMap = await loadProfilesMap([otherUserId]);
          setOtherName(namesMap[otherUserId] ?? "");
        }
      }

      if (!convErr && conv?.listing_id) {
        // pega dados do imóvel
        const { data: lst, error: lstErr } = await supabase
          .from("listings")
          .select("id,listing_title,image_urls,price,property_type,kind,address,address_number,city,neighborhood,code,owner_phone")
          .eq("id", conv.listing_id)
          .single();

        if (!lstErr && lst) setListing(lst as Listing);
      }

      // mensagens
      const { data: msgs, error: msgErr } = await supabase
        .from("messages")
        .select("id,conversation_id,sender_id,created_at,text")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });

      if (!msgErr && msgs) setMessages(msgs as Msg[]);
      setLoading(false);
    })();
  }, [params]);

  // 2) realtime: quando entra msg nova
  useEffect(() => {
    if (!conversationId) return;
    markConversationSeen(conversationId);

    const channel = supabase
      .channel(`room:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Msg;
          setMessages((prev) => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // 3) auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // 4) título da conversa (com base no imóvel)
  const title = useMemo(() => {
    if (!listing) return "Conversa";

    const kindLabel =
      listing.kind === "venda"
        ? "Venda"
        : listing.kind === "locacao"
        ? "Locação"
        : "";

    const place = [listing.city, listing.neighborhood].filter(Boolean).join(" • ");
    const code = listing.code ? ` • Cód: ${listing.code}` : "";

    return `${listing.property_type ?? "Imóvel"}${
      kindLabel ? ` • ${kindLabel}` : ""
    }${place ? ` • ${place}` : ""}${code}`;
  }, [listing]);

  // 5) whatsapp (se existir owner_phone)
  const whatsappUrl = useMemo(() => {
    const phone = listing?.owner_phone?.replace(/\D/g, "") ?? "";
    if (!phone) return null;

    const msg = listing?.code
      ? `Olá! Vim pelo Portal Direto. Tenho interesse no imóvel código ${listing.code}.`
      : `Olá! Vim pelo Portal Direto. Tenho interesse no imóvel.`;

    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  }, [listing]);

  const filteredConversations = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    const byText = conversations.filter((conversation) => {
      const otherId = conversation.user_a === userId ? conversation.user_b : conversation.user_a;
      const listingTitle = conversation.listing_id
        ? listingTitles[conversation.listing_id] ?? "Conversa"
        : "Conversa";
      const preview = conversation.last_message_text ?? "";
      const profile = profileNames[otherId] ?? "";
      const haystack = `${listingTitle} ${preview} ${profile}`.toLowerCase();
      if (!normalized) return true;
      return haystack.includes(normalized);
    });

    if (activeChip === "archived") return [];

    if (activeChip === "unread") {
      return byText.filter(
        (conversation) =>
          (unreadCounts[conversation.id] ?? 0) > 0 && conversation.id !== conversationId
      );
    }

    return byText;
  }, [activeChip, conversationId, conversations, listingTitles, profileNames, query, unreadCounts, userId]);

  async function sendMessage() {
    if (!userId) {
      window.location.href = "/login";
      return;
    }
    if (!text.trim()) return;

    const msgText = text.trim();
    setText("");

    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: userId,
      text: msgText,
    });

    if (error) {
      alert(error.message);
      setText(msgText);
      return;
    }

    // preview da conversa
    await supabase
      .from("conversations")
      .update({
        last_message_text: msgText,
        last_message_at: new Date().toISOString(),
      })
      .eq("id", conversationId);
  }

  if (loading) {
    return (
      <main className="h-[calc(100vh-80px)] bg-gray-100 p-4 lg:p-6">
        <div className="max-w-5xl mx-auto">Carregando...</div>
      </main>
    );
  }

  if (!userId) {
    return (
      <main className="h-[calc(100vh-80px)] bg-gray-100 p-4 lg:p-6">
        <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow p-6">
          <p className="font-bold">Você precisa estar logado para acessar o chat.</p>
          <Link className="underline font-semibold" href="/login">
            Ir para login
          </Link>
        </div>
      </main>
    );
  }

  const listingThumb = getFirstImageUrl(listing?.image_urls);
  const listingMiniTitle =
    (listing?.listing_title ?? "").trim() ||
    `${listing?.property_type ?? "Imóvel"}${listing?.kind ? ` • ${listing.kind === "venda" ? "Venda" : "Locação"}` : ""}`;
  const listingAddress = [listing?.address, listing?.address_number, listing?.neighborhood, listing?.city]
    .filter(Boolean)
    .join(", ");

  return (
    <main className="h-[calc(100vh-80px)] bg-gray-100 p-4 lg:p-6 overflow-hidden">
      <div
        className="max-w-[1400px] mx-auto bg-white rounded-2xl border border-slate-200 shadow-[0_10px_30px_rgba(15,23,42,0.08)] overflow-hidden h-full grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)]"
      >
        <aside className="hidden lg:block border-r border-slate-200 bg-white h-full overflow-y-auto">
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur p-4 space-y-3">
            <p className="text-lg font-bold text-slate-900">Mensagens</p>
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar conversa..."
              className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-slate-500"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveChip("all")}
                className={`h-8 rounded-full px-3 text-xs font-semibold transition ${
                  activeChip === "all"
                    ? "bg-[#0F172A] text-white"
                    : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setActiveChip("unread")}
                className={`h-8 rounded-full px-3 text-xs font-semibold transition ${
                  activeChip === "unread"
                    ? "bg-[#0F172A] text-white"
                    : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                Não lidas
              </button>
              <button
                type="button"
                onClick={() => setActiveChip("archived")}
                className={`h-8 rounded-full px-3 text-xs font-semibold transition ${
                  activeChip === "archived"
                    ? "bg-[#0F172A] text-white"
                    : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                Arquivadas
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredConversations.map((conversation) => {
              const otherId = conversation.user_a === userId ? conversation.user_b : conversation.user_a;
              const rowTitle = conversation.listing_id
                ? listingTitles[conversation.listing_id] ?? "Conversa"
                : "Conversa";
              const rowThumb = conversation.listing_id ? listingImages[conversation.listing_id] : undefined;
              const isActive = conversation.id === conversationId;
              const unreadCount = unreadCounts[conversation.id] ?? 0;
              const hasUnread = unreadCount > 0 && !isActive;

              return (
                <Link
                  key={conversation.id}
                  href={`/chat/${conversation.id}?other=${otherId}`}
                  onClick={() => markConversationSeen(conversation.id)}
                  className={`flex items-start gap-3 border-l-2 px-4 py-3 transition ${
                    isActive
                      ? "bg-slate-100 border-l-slate-900"
                      : "border-l-transparent hover:bg-slate-100 hover:border-l-slate-500"
                  }`}
                >
                  {rowThumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={rowThumb}
                      alt={rowTitle}
                      className="h-12 w-12 shrink-0 rounded-xl object-cover border border-slate-200"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-12 w-12 shrink-0 rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-semibold">
                      IM
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-slate-900">{rowTitle}</p>
                      <span className="shrink-0 text-[11px] text-slate-500">
                        {conversation.last_message_at
                          ? new Date(conversation.last_message_at).toLocaleDateString("pt-BR")
                          : ""}
                      </span>
                    </div>
                    <p className="truncate text-xs text-slate-600 mt-0.5">
                      {profileNames[otherId] ? `Com ${profileNames[otherId]}` : "Conversa privada"}
                    </p>
                    <p className="truncate text-sm text-slate-600 mt-1">
                      {conversation.last_message_text ?? "Sem mensagens ainda."}
                    </p>
                  </div>
                  {hasUnread ? (
                    <span className="mt-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  ) : null}
                </Link>
              );
            })}
            {filteredConversations.length === 0 ? (
              <div className="px-4 py-8 text-sm text-slate-500">Nenhuma conversa encontrada.</div>
            ) : null}
          </div>
        </aside>

        <section className="min-w-0 !mt-0 flex flex-col h-full overflow-hidden">
          <div className="shrink-0 h-[72px] bg-white border-b border-slate-200 px-5 flex items-center justify-between gap-3">
            <div className="h-full min-w-0 flex items-center gap-3">
              {listingThumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={listingThumb}
                  alt={listingMiniTitle}
                  className="h-11 w-11 rounded-lg object-cover border border-slate-200"
                />
              ) : (
                <div className="h-11 w-11 rounded-lg border border-slate-200 bg-slate-100" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{listingMiniTitle || title}</p>
                <p className="text-xs text-slate-500 truncate">{listingAddress || (otherName ? `Conversa com ${otherName}` : "Conversa ativa")}</p>
              </div>
              {listing?.price != null || listing?.kind ? (
                <span className="hidden sm:inline text-xs font-semibold text-slate-700">
                  {listing?.price != null ? `R$ ${Number(listing.price).toLocaleString("pt-BR")}` : ""}
                  {listing?.kind ? ` • ${listing.kind === "venda" ? "Venda" : "Locação"}` : ""}
                </span>
              ) : null}
            </div>

            <div className="h-full flex items-center gap-2 shrink-0">
              <Link
                href="/chat"
                className="lg:hidden h-9 m-0 rounded-lg border border-slate-300 px-3 text-sm leading-none font-semibold text-slate-700 hover:bg-slate-50 inline-flex items-center self-center"
              >
                Voltar
              </Link>
              {listing?.id ? (
                <Link
                  href={`/imovel/${listing.id}`}
                  className="h-9 m-0 rounded-lg border border-slate-300 px-3 text-sm leading-none font-semibold text-slate-700 hover:bg-slate-50 inline-flex items-center self-center"
                >
                  Ver anúncio
                </Link>
              ) : null}
              <button
                type="button"
                onClick={() => setShowDetailsDrawer(true)}
                className="h-9 m-0 rounded-lg border border-slate-300 px-3 text-sm leading-none font-semibold text-slate-700 hover:bg-slate-50 inline-flex items-center self-center"
                aria-label="Abrir detalhes"
                title="Abrir detalhes"
              >
                Detalhes
              </button>
            </div>
          </div>

          <div
            className="flex-1 overflow-y-auto bg-slate-50 px-6 py-6 space-y-4"
            style={{
              backgroundImage:
                "radial-gradient(rgba(15,23,42,0.04) 0.8px, transparent 0.8px)",
              backgroundSize: "14px 14px",
            }}
          >
            {messages.length === 0 ? (
              <div className="text-slate-600">Sem mensagens ainda.</div>
            ) : (
              messages.map((m, index) => {
                const mine = m.sender_id === userId;
                const currentDate = new Date(m.created_at);
                const prevDate = index > 0 ? new Date(messages[index - 1].created_at) : null;
                const showDateSeparator =
                  !prevDate || currentDate.toDateString() !== prevDate.toDateString();

                return (
                  <div key={m.id}>
                    {showDateSeparator ? (
                      <div className="flex justify-center my-3">
                        <span className="rounded-full bg-white border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-500">
                          {currentDate.toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    ) : null}
                    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[520px] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                          mine
                            ? "bg-[#0F172A] text-white rounded-br-md"
                            : "bg-white text-slate-900 border border-slate-200 rounded-bl-md"
                        }`}
                      >
                        <div>{m.text}</div>
                        <div className={`mt-1 text-[10px] ${mine ? "text-gray-300" : "text-gray-500"}`}>
                          {new Date(m.created_at).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          <div className="shrink-0 h-[76px] bg-white border-t border-slate-200 px-4 flex items-center gap-3">
            <button
              type="button"
              className="h-11 w-11 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition"
              aria-label="Anexar arquivo"
              title="Anexar arquivo"
            >
              +
            </button>
            <input
              className="h-14 flex-1 border border-slate-300 px-4 rounded-2xl bg-white text-slate-900 placeholder:text-slate-500"
              placeholder="Digite sua mensagem..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendMessage();
              }}
            />
            <button
              onClick={sendMessage}
              className="h-11 bg-[#0F172A] text-white px-5 rounded-xl hover:bg-slate-800 transition font-semibold"
            >
              Enviar
            </button>
          </div>
        </section>

      </div>

      {showDetailsDrawer ? (
        <div className="fixed inset-0 z-[70] bg-black/30" onClick={() => setShowDetailsDrawer(false)}>
          <aside
            className="absolute right-0 top-0 h-full w-full max-w-[380px] bg-white border-l border-slate-200 shadow-2xl p-5 overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Detalhes do anúncio</h3>
              <button
                type="button"
                onClick={() => setShowDetailsDrawer(false)}
                className="h-9 w-9 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                aria-label="Fechar detalhes"
              >
                ×
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
              {listingThumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={listingThumb}
                  alt={listingMiniTitle || "Imóvel"}
                  className="h-40 w-full rounded-xl object-cover border border-slate-200"
                />
              ) : (
                <div className="h-40 rounded-xl bg-slate-200" />
              )}
              <h4 className="mt-4 text-lg font-bold text-slate-900">{listingMiniTitle || "Imóvel"}</h4>
              {listing?.price != null ? (
                <p className="text-base font-bold text-slate-900 mt-1">
                  R$ {Number(listing.price).toLocaleString("pt-BR")}
                </p>
              ) : null}
              {listingAddress ? <p className="text-sm text-slate-600 mt-1">{listingAddress}</p> : null}
              {listing?.kind ? (
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mt-2">
                  {listing.kind === "venda" ? "Venda" : "Locação"}
                </p>
              ) : null}
            </div>

            <div className="space-y-2 mt-4">
              {listing?.id ? (
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(`${window.location.origin}/imovel/${listing.id}`);
                  }}
                  className="w-full h-10 rounded-xl border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition"
                >
                  Copiar link
                </button>
              ) : null}
              <button
                type="button"
                className="w-full h-10 rounded-xl border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition"
              >
                Marcar como resolvida
              </button>
              <button
                type="button"
                className="w-full h-10 rounded-xl border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition"
              >
                Reportar/Bloquear
              </button>
            </div>

            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex mt-3 h-10 items-center justify-center rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                WhatsApp
              </a>
            ) : null}
          </aside>
        </div>
      ) : null}
    </main>
  );
}
