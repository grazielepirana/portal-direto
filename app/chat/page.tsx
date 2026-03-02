"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { loadProfilesMap } from "../../lib/profiles";

type Conversation = {
  id: string;
  user_a: string;
  user_b: string;
  listing_id: string | null;
  last_message_text: string | null;
  last_message_at: string | null;
};

type ListingMeta = {
  title: string;
  imageUrl: string | null;
  price: number | null;
  kind: string | null;
  address: string;
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

export default function ChatInboxPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [listingMetaMap, setListingMetaMap] = useState<Record<string, ListingMeta>>({});
  const [profileNames, setProfileNames] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [activeChip, setActiveChip] = useState<"all" | "unread" | "archived">("all");
  const [loading, setLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      setUserId(uid);

      if (!uid) {
        setLoading(false);
        return;
      }

      const { data: convs, error } = await supabase
        .from("conversations")
        .select("id,user_a,user_b,listing_id,last_message_text,last_message_at,created_at")
        .order("last_message_at", { ascending: false })
        .order("created_at", { ascending: false });

      if (!error && convs) {
        const nextConversations = convs as Conversation[];
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
              .filter((id): id is string => Boolean(id))
          )
        );

        if (listingIds.length > 0) {
          const { data: listings } = await supabase
            .from("listings")
            .select("id,listing_title,property_type,kind,image_urls,price,address,address_number,city,neighborhood")
            .in("id", listingIds);

          const nextMetaMap: Record<string, ListingMeta> = {};
          for (const listing of listings ?? []) {
            const id = String(listing.id);
            const fallback = `${listing.property_type ?? "Imóvel"} • ${
              listing.kind === "venda" ? "Venda" : "Locação"
            }`;
            const title = (listing.listing_title as string | null)?.trim() || fallback;
            const firstImage = getFirstImageUrl(listing.image_urls);
            const address = [
              String(listing.address ?? "").trim(),
              String(listing.address_number ?? "").trim(),
              String(listing.neighborhood ?? "").trim(),
              String(listing.city ?? "").trim(),
            ]
              .filter(Boolean)
              .join(", ");
            nextMetaMap[id] = {
              title,
              imageUrl: firstImage,
              price: typeof listing.price === "number" ? listing.price : null,
              kind: (listing.kind as string | null) ?? null,
              address,
            };
          }
          setListingMetaMap(nextMetaMap);
        }

        const conversationIds = nextConversations.map((conversation) => conversation.id);
        if (conversationIds.length > 0) {
          const { data: messages } = await supabase
            .from("messages")
            .select("conversation_id,sender_id,created_at")
            .in("conversation_id", conversationIds)
            .order("created_at", { ascending: false });

          const lastSeenMap = readLastSeenMap();
          const counts: Record<string, number> = {};
          for (const conversationId of conversationIds) counts[conversationId] = 0;

          for (const msg of messages ?? []) {
            const conversationId = String(msg.conversation_id ?? "");
            if (!conversationId) continue;
            if (String(msg.sender_id ?? "") === uid) continue;

            const seenAt = lastSeenMap[conversationId];
            if (!seenAt || new Date(String(msg.created_at ?? "")).getTime() > new Date(seenAt).getTime()) {
              counts[conversationId] = (counts[conversationId] ?? 0) + 1;
            }
          }
          setUnreadCounts(counts);
        }
      }
      setLoading(false);
    })();
  }, []);

  const filteredConversations = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    const byText = conversations.filter((conversation) => {
      const otherId = conversation.user_a === userId ? conversation.user_b : conversation.user_a;
      const title = conversation.listing_id
        ? listingMetaMap[conversation.listing_id]?.title ?? `Anúncio ${conversation.listing_id.slice(0, 6)}…`
        : "Conversa";
      const preview = conversation.last_message_text ?? "";
      const profile = profileNames[otherId] ?? "";
      const haystack = `${title} ${preview} ${profile}`.toLowerCase();
      if (!normalized) return true;
      return haystack.includes(normalized);
    });

    if (activeChip === "archived") return [];

    if (activeChip === "unread") {
      return byText.filter((conversation) => (unreadCounts[conversation.id] ?? 0) > 0);
    }

    return byText;
  }, [activeChip, conversations, listingMetaMap, profileNames, query, unreadCounts, userId]);

  if (loading) {
    return (
      <main className="h-[calc(100vh-80px)] bg-gray-100 p-6 lg:p-8">
        <div className="max-w-5xl mx-auto">Carregando...</div>
      </main>
    );
  }

  if (!userId) {
    return (
      <main className="h-[calc(100vh-80px)] bg-gray-100 p-6 lg:p-8">
        <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow p-6">
          <p className="font-bold">Você precisa estar logado para acessar o chat.</p>
          <Link className="underline font-semibold" href="/login">
            Ir para login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="h-[calc(100vh-80px)] bg-gray-100 p-4 lg:p-6 overflow-hidden">
      <div className="max-w-[1400px] mx-auto h-full">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_10px_30px_rgba(15,23,42,0.08)] overflow-hidden h-full grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="min-w-0 h-full overflow-y-auto border-r border-slate-200 bg-white">
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
                {filteredConversations.map((c) => {
                  const otherId = c.user_a === userId ? c.user_b : c.user_a;
                  const meta = c.listing_id ? listingMetaMap[c.listing_id] : undefined;
                  const title = meta?.title ?? "Conversa";
                  const thumb = meta?.imageUrl ?? undefined;
                  const unreadCount = unreadCounts[c.id] ?? 0;
                  const hasUnread = unreadCount > 0;
                  return (
                    <Link
                      key={c.id}
                      href={`/chat/${c.id}?other=${otherId}`}
                      onClick={() => {
                        const next = { ...readLastSeenMap(), [c.id]: new Date().toISOString() };
                        window.localStorage.setItem(CHAT_LAST_SEEN_KEY, JSON.stringify(next));
                      }}
                      className="flex items-start gap-3 border-l-2 border-l-transparent px-4 py-3 transition hover:bg-slate-100 hover:border-l-slate-500"
                    >
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumb}
                          alt={title}
                          className="h-12 w-12 shrink-0 rounded-full object-cover border border-slate-200"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-12 w-12 shrink-0 rounded-full border border-slate-200 bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-semibold">
                          IM
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-slate-900">{title}</p>
                          <span className="shrink-0 text-[11px] text-slate-500">
                            {c.last_message_at ? new Date(c.last_message_at).toLocaleDateString("pt-BR") : ""}
                          </span>
                        </div>
                        <p className="truncate text-xs text-slate-500 mt-0.5">
                          {profileNames[otherId] ? `Com ${profileNames[otherId]}` : "Conversa privada"}
                        </p>
                        <p className="truncate text-sm text-slate-600 mt-1">
                          {c.last_message_text ?? "Sem mensagens ainda."}
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
                {conversations.length === 0 ? (
                  <div className="px-4 py-8 text-sm text-slate-500">Você ainda não tem conversas.</div>
                ) : null}
                {filteredConversations.length === 0 ? (
                  <div className="px-4 py-8 text-sm text-slate-500">Nenhuma conversa encontrada.</div>
                ) : null}
              </div>
          </aside>

          <section className="hidden lg:flex !mt-0 flex-col h-full overflow-hidden">
            <div className="shrink-0 h-[72px] bg-white border-b border-slate-200 px-5 flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">Selecione uma conversa</p>
                <p className="text-xs text-slate-500 truncate">Selecione uma conversa na lista</p>
              </div>
              <Link href="/" className="text-sm font-semibold text-slate-700 hover:text-slate-950 transition">
                Voltar
              </Link>
            </div>
            <div className="flex-1 overflow-y-auto bg-slate-50 px-6 py-6 flex items-center justify-center text-center">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Selecione uma conversa</h2>
                <p className="mt-2 max-w-md text-sm text-slate-600">
                  Escolha uma conversa para abrir o histórico e responder por aqui.
                </p>
              </div>
            </div>
            <div className="shrink-0 h-[76px] bg-white border-t border-slate-200 px-4 flex items-center gap-3 opacity-50 pointer-events-none">
              <button
                type="button"
                disabled
                className="h-11 w-11 rounded-xl border border-slate-300 bg-slate-100 text-slate-400 cursor-not-allowed"
                aria-label="Anexar arquivo"
              >
                +
              </button>
              <input
                disabled
                className="h-14 flex-1 border border-slate-300 px-4 rounded-2xl bg-slate-100 text-slate-500"
                placeholder="Selecione uma conversa para enviar mensagens"
              />
              <button
                type="button"
                disabled
                className="h-11 bg-slate-300 text-white px-5 rounded-xl font-semibold cursor-not-allowed"
              >
                Enviar
              </button>
            </div>
          </section>

        </div>
      </div>
    </main>
  );
}
