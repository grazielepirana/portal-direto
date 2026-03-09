"use client";

import { useEffect } from "react";
import { loadSiteSettings } from "../lib/site-settings";

const LAST_FAVICON_KEY = "portal_last_favicon_url_v1";

function applyFavicon(href: string) {
  if (!href) return;

  // Remove ícones antigos para evitar fallback visual temporário.
  const oldLinks = Array.from(
    document.head.querySelectorAll("link[rel='icon'], link[rel='shortcut icon'], link[rel='apple-touch-icon']")
  );
  oldLinks.forEach((link) => link.parentElement?.removeChild(link));

  const rels = ["icon", "shortcut icon", "apple-touch-icon"] as const;
  for (const rel of rels) {
    const link = document.createElement("link");
    link.rel = rel;
    link.href = href;
    link.setAttribute("data-portal-favicon", "1");
    document.head.appendChild(link);
  }
}

export default function SiteFaviconSync() {
  useEffect(() => {
    let active = true;
    const previousFavicon =
      typeof window !== "undefined" ? window.localStorage.getItem(LAST_FAVICON_KEY) : "";
    if (previousFavicon) {
      applyFavicon(previousFavicon);
    }

    loadSiteSettings()
      .then((settings) => {
        if (!active) return;
        const faviconUrl = String(settings.favicon_url ?? "").trim();
        if (!faviconUrl) return;
        applyFavicon(faviconUrl);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(LAST_FAVICON_KEY, faviconUrl);
        }
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
