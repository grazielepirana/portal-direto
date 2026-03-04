import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type ListingPlanPayload = {
  id: string;
  name: string;
  price: number;
  days: number;
  is_featured: boolean;
  sort_order?: number;
  active?: boolean;
};

function isAllowedAdmin(email: string | null | undefined) {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();

  const envList = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  if (envList.length === 0) {
    return normalized === "grazielepirana@outlook.com";
  }

  return envList.includes(normalized);
}

export async function POST(req: Request) {
  try {
    const supabaseUrl =
      process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return NextResponse.json(
        { ok: false, error: "Variáveis de ambiente do Supabase não configuradas." },
        { status: 500 }
      );
    }

    const authHeader = req.headers.get("authorization") ?? "";
    const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (!accessToken) {
      return NextResponse.json({ ok: false, error: "Sessão inválida." }, { status: 401 });
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });

    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser();

    if (userError || !user || !isAllowedAdmin(user.email)) {
      return NextResponse.json({ ok: false, error: "Acesso não autorizado." }, { status: 403 });
    }

    const body = (await req.json()) as { plans?: ListingPlanPayload[] };
    const plans = Array.isArray(body.plans) ? body.plans : [];
    if (plans.length === 0) {
      return NextResponse.json({ ok: false, error: "Nenhum plano recebido." }, { status: 400 });
    }

    const payload = plans.map((plan, index) => ({
      id: String(plan.id ?? "").trim(),
      name: String(plan.name ?? "").trim() || `Plano ${index + 1}`,
      price: Number(plan.price ?? 0),
      days: Math.max(1, Math.trunc(Number(plan.days ?? 1))),
      is_featured: Boolean(plan.is_featured),
      sort_order: index + 1,
      active: plan.active !== false,
      updated_at: new Date().toISOString(),
    }));

    if (payload.some((p) => !p.id)) {
      return NextResponse.json(
        { ok: false, error: "Todos os planos precisam de id válido." },
        { status: 400 }
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error } = await admin.from("listing_plans").upsert(payload, { onConflict: "id" });
    if (error) {
      return NextResponse.json(
        { ok: false, error: `Falha ao salvar planos: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Erro interno ao salvar planos." },
      { status: 500 }
    );
  }
}
