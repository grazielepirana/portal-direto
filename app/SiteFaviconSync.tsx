"use client";

import { useEffect } from "react";
import { loadSiteSettings } from "../lib/site-settings";

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
        const directUrl = `${faviconUrl}${
          faviconUrl.includes("?") ? "&" : "?"
        }v=${Date.now()}`;

        upsertFaviconLink("icon", directUrl);
        upsertFaviconLink("shortcut icon", directUrl);
        upsertFaviconLink("apple-touch-icon", directUrl);
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
