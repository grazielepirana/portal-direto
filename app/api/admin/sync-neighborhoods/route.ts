import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getBearerToken(header: string | null) {
  if (!header) return null;
  const [type, token] = header.split(" ");
  if (type?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

function isAllowedAdmin(email: string | null | undefined) {
  const normalized = String(email ?? "").toLowerCase().trim();
  if (!normalized) return false;

  const envList = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);

  if (envList.length === 0) return true;
  return envList.includes(normalized);
}

type ListingRow = {
  city?: string | null;
  neighborhood?: string | null;
};

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Variáveis de ambiente do Supabase não configuradas." },
      { status: 500 }
    );
  }

  const token = getBearerToken(req.headers.get("authorization"));
  if (!token) {
    return NextResponse.json({ error: "Token de autenticação ausente." }, { status: 401 });
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey);
  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser(token);

  if (authError || !user || !isAllowedAdmin(user.email)) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await admin
    .from("listings")
    .select("city,neighborhood")
    .not("city", "is", null)
    .not("neighborhood", "is", null)
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const unique = new Map<string, { city: string; neighborhood: string; label: string; active: boolean }>();

  for (const row of (data as ListingRow[]) ?? []) {
    const city = String(row.city ?? "").trim();
    const neighborhood = String(row.neighborhood ?? "").trim();
    if (!city || !neighborhood) continue;

    const key = `${city.toLowerCase()}|${neighborhood.toLowerCase()}`;
    unique.set(key, {
      city,
      neighborhood,
      label: `${neighborhood} - ${city}`,
      active: true,
    });
  }

  const rows = Array.from(unique.values());
  if (rows.length === 0) {
    return NextResponse.json({ ok: true, imported: 0 });
  }

  const { error: deleteError } = await admin
    .from("location_options")
    .delete()
    .not("neighborhood", "is", null);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  const chunkSize = 1000;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error: insertError } = await admin.from("location_options").insert(chunk);
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, imported: rows.length });
}
