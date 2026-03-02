"use client";

import { useMemo, useState } from "react";

type ShareListingButtonProps = {
  listingId: string;
  title: string;
};

export default function ShareListingButton({
  listingId,
  title,
}: ShareListingButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/imovel/${listingId}`;
  }, [listingId]);

  async function handleNativeShare() {
    if (!shareUrl) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: "Veja este imóvel:",
          url: shareUrl,
        });
      } catch {
        // usuário cancelou
      }
      return;
    }

    await copyLink();
  }

  async function copyLink() {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      setOpen(false);
    } catch {
      alert("Não foi possível copiar o link.");
    }
  }

  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-10 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
      >
        Compartilhar
      </button>

      {open ? (
        <div className="absolute right-0 mt-2 z-20 w-64 rounded-xl border border-slate-200 bg-white shadow-lg p-3 space-y-2">
          <button
            type="button"
            onClick={handleNativeShare}
            className="w-full text-left rounded-lg px-3 py-2 hover:bg-slate-100"
          >
            Compartilhar agora
          </button>

          <button
            type="button"
            onClick={copyLink}
            className="w-full text-left rounded-lg px-3 py-2 hover:bg-slate-100"
          >
            {copied ? "Link copiado!" : "Copiar link"}
          </button>

          <a
            href={`https://wa.me/?text=${encodedTitle}%20${encodedUrl}`}
            target="_blank"
            rel="noreferrer"
            className="block rounded-lg px-3 py-2 hover:bg-slate-100"
          >
            Compartilhar no WhatsApp
          </a>

          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
            target="_blank"
            rel="noreferrer"
            className="block rounded-lg px-3 py-2 hover:bg-slate-100"
          >
            Compartilhar no Facebook
          </a>

          <a
            href={`https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`}
            target="_blank"
            rel="noreferrer"
            className="block rounded-lg px-3 py-2 hover:bg-slate-100"
          >
            Compartilhar no Telegram
          </a>
        </div>
      ) : null}
    </div>
  );
}
