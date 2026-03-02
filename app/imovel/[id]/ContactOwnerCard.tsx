"use client";

import { useState } from "react";
import { supabase } from "../../../lib/supabase";

type ContactOwnerCardProps = {
  ownerId: string;
  listingId: string;
  price?: number | null;
  condoFee?: number | null;
  iptuFee?: number | null;
  ownerPhone?: string | null;
};

export default function ContactOwnerCard({
  ownerId,
  listingId,
  price,
  condoFee,
  iptuFee,
  ownerPhone,
}: ContactOwnerCardProps) {
  const [text, setText] = useState("Olá! Tenho interesse neste imóvel.");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    const messageText = text.trim();
    if (!messageText) {
      alert("Digite uma mensagem para enviar ao proprietário.");
      return;
    }

    const { data } = await supabase.auth.getUser();
    const me = data.user?.id;

    if (!me) {
      window.location.href = "/login";
      return;
    }

    if (me === ownerId) {
      alert("Esse imóvel é seu.");
      return;
    }

    try {
      setSending(true);

      const { data: existing, error: exErr } = await supabase
        .from("conversations")
        .select("id")
        .eq("listing_id", listingId)
        .or(
          `and(user_a.eq.${me},user_b.eq.${ownerId}),and(user_a.eq.${ownerId},user_b.eq.${me})`
        )
        .limit(1);

      if (exErr) {
        alert(exErr.message);
        return;
      }

      let conversationId = existing?.[0]?.id as string | undefined;
      if (!conversationId) {
        const { data: created, error: createError } = await supabase
          .from("conversations")
          .insert({
            listing_id: listingId,
            user_a: me,
            user_b: ownerId,
            last_message_at: new Date().toISOString(),
            last_message_text: messageText,
          })
          .select("id")
          .single();

        if (createError) {
          alert(createError.message);
          return;
        }

        conversationId = created.id;
      }

      const { error: msgError } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: me,
        text: messageText,
      });

      if (msgError) {
        alert(msgError.message);
        return;
      }

      await supabase
        .from("conversations")
        .update({
          last_message_text: messageText,
          last_message_at: new Date().toISOString(),
        })
        .eq("id", conversationId);

      window.location.href = `/chat/${conversationId}?other=${ownerId}`;
    } finally {
      setSending(false);
    }
  }

  return (
    <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm text-slate-600">Preço</p>
        <p className="text-3xl font-extrabold text-slate-950 leading-none mt-1">
          {price != null
            ? `R$ ${Number(price).toLocaleString("pt-BR")}`
            : "Preço não informado"}
        </p>
        <div className="mt-3 space-y-1 text-sm text-slate-700">
          <p>
            Condomínio:{" "}
            {condoFee != null
              ? `R$ ${Number(condoFee).toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              : "Não informado"}
          </p>
          <p>
            IPTU:{" "}
            {iptuFee != null
              ? `R$ ${Number(iptuFee).toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              : "Não informado"}
          </p>
        </div>
      </div>

      <h2 className="text-lg font-bold text-slate-950">Fale com o proprietário</h2>
      <p className="text-sm text-slate-700 mt-1 mb-3">
        Envie uma mensagem rápida sobre este imóvel.
      </p>
      {ownerPhone ? (
        <p className="mb-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          Telefone: <span className="font-semibold">{ownerPhone}</span>
        </p>
      ) : null}

      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={4}
        className="w-full rounded-xl border border-slate-300 p-3 text-slate-900 placeholder:text-slate-600"
        placeholder="Escreva sua mensagem..."
      />

      <button
        type="button"
        onClick={handleSend}
        disabled={sending}
        className="cta-primary mt-3 inline-flex h-11 w-full items-center justify-center rounded-xl px-4 font-semibold transition disabled:opacity-60"
      >
        {sending ? "Enviando..." : "Enviar para o proprietário"}
      </button>
    </aside>
  );
}
