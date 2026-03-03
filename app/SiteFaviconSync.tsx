"use client";

import { useEffect } from "react";
import { loadSiteSettings } from "../lib/site-settings";

function clampFaviconScale(value: number) {
  if (!Number.isFinite(value)) return 100;
  return Math.min(220, Math.max(50, Math.round(value)));
}

function buildScaledFaviconDataUrl(iconUrl: string, scalePercent: number) {
  const size = 64;
  const scale = clampFaviconScale(scalePercent);
  const scaledSize = (size * scale) / 100;
  const offset = (size - scaledSize) / 2;

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <image href="${iconUrl}" x="${offset}" y="${offset}" width="${scaledSize}" height="${scaledSize}" preserveAspectRatio="xMidYMid meet" />
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function upsertFaviconLink(rel: string, href: string) {
  const existing = document.head.querySelector(`link[rel='${rel}']`) as HTMLLinkElement | null;
  if (existing) {
    existing.href = href;
    return;
  }

  const link = document.createElement("link");
  link.rel = rel;
  link.href = href;
  document.head.appendChild(link);
}

export default function SiteFaviconSync() {
  useEffect(() => {
    let active = true;

    loadSiteSettings()
      .then((settings) => {
        if (!active) return;
        const faviconUrl = String(settings.favicon_url ?? "").trim();
        if (!faviconUrl) return;
        const dataUrl = buildScaledFaviconDataUrl(
          faviconUrl,
          Number(settings.favicon_scale_percent ?? 100)
        );

        upsertFaviconLink("icon", dataUrl);
        upsertFaviconLink("shortcut icon", dataUrl);
        upsertFaviconLink("apple-touch-icon", dataUrl);
      })
      .catch(() => {
        // Silencioso: mantém favicon padrão se falhar.
      });

    return () => {
      active = false;
    };
  }, []);

  return null;
}
