"use client";

import { supabase } from "../../../lib/supabase";

export default function ChatButton({
  ownerId,
  listingId,
}: {
  ownerId: string;
  listingId: string;
}) {
  async function startChat() {
    const { data } = await supabase.auth.getUser();
    const me = data.user?.id;

    if (!me) {
      window.location.href = "/login";
      return;
    }

    if (me === ownerId) {
      alert("Esse imóvel é seu 🙂");
      return;
    }

    // 1) tenta achar conversa existente para ESTE imóvel
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

    // 2) se não existir, cria
    if (!conversationId) {
      const { data: created, error: crErr } = await supabase
        .from("conversations")
        .insert({
          listing_id: listingId,
          user_a: me,
          user_b: ownerId,
          last_message_at: new Date().toISOString(),
          last_message_text: "Conversa iniciada",
        })
        .select("id")
        .single();

      if (crErr) {
        alert(crErr.message);
        return;
      }

      conversationId = created.id;
    }

    // 3) abre o chat
    window.location.href = `/chat/${conversationId}?other=${ownerId}`;
  }

  return (
    <button
      onClick={startChat}
      className="cta-primary px-6 py-3 rounded-xl transition"
    >
      Conversar com proprietário
    </button>
  );
}
