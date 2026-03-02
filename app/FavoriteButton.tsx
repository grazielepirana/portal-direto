"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { addFavorite, getCurrentUserId, removeFavorite } from "../lib/favorites";

type FavoriteButtonProps = {
  listingId: string;
  initialIsFavorite?: boolean;
  userId?: string | null;
  className?: string;
  onChange?: (isFavorite: boolean) => void;
};

export default function FavoriteButton({
  listingId,
  initialIsFavorite = false,
  userId,
  className = "",
  onChange,
}: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [autoUserId, setAutoUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const resolvedUserId = userId !== undefined ? userId : autoUserId;

  useEffect(() => {
    if (userId !== undefined) return;

    getCurrentUserId().then((id) => setAutoUserId(id));
  }, [userId]);

  async function handleClick(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();

    if (!resolvedUserId) {
      window.location.href = "/login";
      return;
    }

    if (saving) return;
    setSaving(true);

    const next = !isFavorite;
    setIsFavorite(next);
    onChange?.(next);

    const result = next
      ? await addFavorite(resolvedUserId, listingId)
      : await removeFavorite(resolvedUserId, listingId);

    if (result.error) {
      setIsFavorite(!next);
      onChange?.(!next);
      alert("Não foi possível atualizar favoritos agora.");
    }

    setSaving(false);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isFavorite ? "Remover dos favoritos" : "Salvar nos favoritos"}
      title={isFavorite ? "Remover dos favoritos" : "Salvar nos favoritos"}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white/95 text-slate-700 shadow-sm transition hover:bg-white hover:text-rose-600 ${className}`}
      disabled={saving}
    >
      <svg
        viewBox="0 0 24 24"
        className={`h-5 w-5 ${isFavorite ? "fill-rose-500 text-rose-500" : "fill-none text-slate-700"}`}
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M12 20.25 10.55 18.93C5.4 14.26 2 11.17 2 7.36 2 4.27 4.42 2 7.41 2c1.7 0 3.34.8 4.39 2.06A5.87 5.87 0 0 1 16.2 2C19.2 2 21.6 4.27 21.6 7.36c0 3.81-3.4 6.9-8.55 11.58L12 20.25Z" />
      </svg>
    </button>
  );
}
