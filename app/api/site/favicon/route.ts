import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(new URL("/favicon.ico", req.url), 302);
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/site_settings?id=eq.1&select=favicon_url,updated_at`,
      {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return NextResponse.redirect(new URL("/favicon.ico", req.url), 302);
    }

    const data = (await response.json()) as Array<{
      favicon_url?: string | null;
      updated_at?: string | null;
    }>;
    const faviconUrl = String(data?.[0]?.favicon_url ?? "").trim();
    const version = String(data?.[0]?.updated_at ?? "").trim();

    if (!faviconUrl) {
      return NextResponse.redirect(new URL("/favicon.ico", req.url), 302);
    }

    const finalUrl = `${faviconUrl}${faviconUrl.includes("?") ? "&" : "?"}v=${encodeURIComponent(
      version || "1"
    )}`;
    return NextResponse.redirect(finalUrl, 302);
  } catch {
    return NextResponse.redirect(new URL("/favicon.ico", req.url), 302);
  }
}
