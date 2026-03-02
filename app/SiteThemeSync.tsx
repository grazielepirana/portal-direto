"use client";

import { useEffect } from "react";
import { DEFAULT_SITE_SETTINGS, loadSiteSettings } from "../lib/site-settings";

function applyThemeVars(settings: {
  primary_color: string;
  header_bg_color: string;
  header_text_color: string;
  background_color: string;
  text_primary_color: string;
  action_color: string;
  button_bg_color: string;
  button_hover_color: string;
  listing_card_bg_color: string;
  detail_bg_color: string;
  line_color: string;
  font_body: string;
  font_headings: string;
  font_header: string;
}) {
  const root = document.documentElement;
  root.style.setProperty("--site-primary", settings.primary_color || DEFAULT_SITE_SETTINGS.primary_color);
  root.style.setProperty("--site-header-bg", settings.header_bg_color || DEFAULT_SITE_SETTINGS.header_bg_color);
  root.style.setProperty("--site-header-text", settings.header_text_color || DEFAULT_SITE_SETTINGS.header_text_color);
  root.style.setProperty("--site-bg", settings.background_color || DEFAULT_SITE_SETTINGS.background_color);
  root.style.setProperty("--site-text", settings.text_primary_color || DEFAULT_SITE_SETTINGS.text_primary_color);
  root.style.setProperty("--site-action", settings.action_color || DEFAULT_SITE_SETTINGS.action_color);
  root.style.setProperty("--site-button-bg", settings.button_bg_color || DEFAULT_SITE_SETTINGS.button_bg_color);
  root.style.setProperty("--site-button-hover", settings.button_hover_color || DEFAULT_SITE_SETTINGS.button_hover_color);
  root.style.setProperty("--site-card-bg", settings.listing_card_bg_color || DEFAULT_SITE_SETTINGS.listing_card_bg_color);
  root.style.setProperty("--site-detail-bg", settings.detail_bg_color || DEFAULT_SITE_SETTINGS.detail_bg_color);
  root.style.setProperty("--site-line", settings.line_color || DEFAULT_SITE_SETTINGS.line_color);
  root.style.setProperty("--site-font-body", settings.font_body || DEFAULT_SITE_SETTINGS.font_body);
  root.style.setProperty("--site-font-headings", settings.font_headings || DEFAULT_SITE_SETTINGS.font_headings);
  root.style.setProperty("--site-font-header", settings.font_header || DEFAULT_SITE_SETTINGS.font_header);
}

export default function SiteThemeSync() {
  useEffect(() => {
    loadSiteSettings()
      .then((settings) => applyThemeVars(settings))
      .catch(() => applyThemeVars(DEFAULT_SITE_SETTINGS));
  }, []);

  return null;
}
