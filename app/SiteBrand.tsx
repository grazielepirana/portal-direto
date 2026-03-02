"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DEFAULT_SITE_SETTINGS, loadSiteSettings } from "../lib/site-settings";

export default function SiteBrand() {
  const [siteName, setSiteName] = useState(DEFAULT_SITE_SETTINGS.site_name);
  const [logoUrl, setLogoUrl] = useState(DEFAULT_SITE_SETTINGS.logo_url);
  const [logoHeight, setLogoHeight] = useState(DEFAULT_SITE_SETTINGS.logo_height_px);

  useEffect(() => {
    loadSiteSettings()
      .then((settings) => {
        setSiteName(settings.site_name || DEFAULT_SITE_SETTINGS.site_name);
        setLogoUrl(settings.logo_url || "");
        setLogoHeight(
          Number(settings.logo_height_px) > 0
            ? Number(settings.logo_height_px)
            : DEFAULT_SITE_SETTINGS.logo_height_px
        );
      })
      .catch(() => {
        setSiteName(DEFAULT_SITE_SETTINGS.site_name);
        setLogoUrl("");
        setLogoHeight(DEFAULT_SITE_SETTINGS.logo_height_px);
      });
  }, []);

  return (
    <Link href="/" className="text-2xl font-extrabold tracking-tight" style={{ color: "var(--site-header-text)" }}>
      {logoUrl ? (
        <img src={logoUrl} alt={siteName} className="w-auto object-contain" style={{ height: `${logoHeight}px` }} />
      ) : (
        siteName
      )}
    </Link>
  );
}
