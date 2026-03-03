"use client";

import { FormEvent, useState } from "react";

const TIPOS = [
  "anúncio suspeito",
  "golpe",
  "conteúdo irregular",
  "outro",
] as const;

function isEmailValid(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function CanalDeDenunciasClient() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [tipo, setTipo] = useState<(typeof TIPOS)[number]>("anúncio suspeito");
  const [listingUrl, setListingUrl] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFeedback(null);

    if (!isEmailValid(email)) {
      setFeedback("Digite um e-mail válido.");
      return;
    }

    if (!message.trim()) {
      setFeedback("Digite a mensagem da denúncia.");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/denuncias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || null,
          email: email.trim(),
          tipo,
          listingUrl: listingUrl.trim() || null,
          message: message.trim(),
        }),
      });

      const result = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !result.ok) {
        setFeedback(result.error ?? "Não foi possível enviar sua denúncia.");
        return;
      }

      setFeedback("Denúncia enviada com sucesso. Nossa equipe irá analisar.");
      setName("");
      setEmail("");
      setTipo("anúncio suspeito");
      setListingUrl("");
      setMessage("");
    } catch {
      setFeedback("Erro ao enviar denúncia. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 grid grid-cols-1 gap-4">
      <div>
        <label className="mb-1 block text-sm font-semibold text-slate-800">Nome (opcional)</label>
        <input
          className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Seu nome"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-slate-800">Email (obrigatório)</label>
        <input
          className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="voce@exemplo.com"
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-slate-800">Tipo de denúncia</label>
        <select
          className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          value={tipo}
          onChange={(e) => setTipo(e.target.value as (typeof TIPOS)[number])}
        >
          {TIPOS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-slate-800">Link do anúncio (opcional)</label>
        <input
          className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          value={listingUrl}
          onChange={(e) => setListingUrl(e.target.value)}
          placeholder="https://..."
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-slate-800">Mensagem (obrigatório)</label>
        <textarea
          className="min-h-36 w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Descreva sua denúncia..."
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="h-11 rounded-xl bg-[#0E9F6E] px-5 text-sm font-semibold text-white transition hover:bg-[#0A8A5E] disabled:opacity-60"
      >
        {loading ? "Enviando..." : "Enviar denúncia"}
      </button>

      {feedback ? (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          {feedback}
        </p>
      ) : null}
    </form>
  );
}

