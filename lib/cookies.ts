export const COOKIE_CONSENT_KEY = "cookieConsent";

export type CookieConsent = {
  essential: true;
  analytics: boolean;
  marketing: boolean;
};

export const DEFAULT_COOKIE_CONSENT: CookieConsent = {
  essential: true,
  analytics: false,
  marketing: false,
};

export function isBrowser() {
  return typeof window !== "undefined";
}

export function readCookieConsent(): CookieConsent | null {
  if (!isBrowser()) return null;

  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<CookieConsent>;
    return {
      essential: true,
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
    };
  } catch {
    return null;
  }
}

export function saveCookieConsent(consent: CookieConsent) {
  if (!isBrowser()) return;

  try {
    window.localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
  } catch {
    // ignore storage errors to avoid breaking client rendering
  }
}

export function hasAnalyticsConsent() {
  return Boolean(readCookieConsent()?.analytics);
}

export function hasMarketingConsent() {
  return Boolean(readCookieConsent()?.marketing);
}

export function canLoadExternalScript(type: "analytics" | "marketing") {
  if (type === "analytics") return hasAnalyticsConsent();
  return hasMarketingConsent();
}

