import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type Payload = {
  listingId?: string;
  planId?: string;
  planName?: string;
  amount?: number;
  days?: number;
};

function getRequiredEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const mercadoPagoAccessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

  if (!supabaseUrl || !supabaseAnonKey || !mercadoPagoAccessToken) {
    return null;
  }

  return { supabaseUrl, supabaseAnonKey, mercadoPagoAccessToken };
}

function normalizeAmount(value: unknown) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return 0;
  return Math.max(0, amount);
}

export async function POST(req: Request) {
  try {
    const env = getRequiredEnv();
    if (!env) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Integração do Mercado Pago não configurada. Defina MERCADO_PAGO_ACCESS_TOKEN no Vercel.",
        },
        { status: 500 }
      );
    }

    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (!token) {
      return NextResponse.json({ ok: false, error: "Sessão inválida." }, { status: 401 });
    }

    const body = (await req.json()) as Payload;
    const listingId = String(body.listingId ?? "").trim();
    const planId = String(body.planId ?? "").trim();
    const planName = String(body.planName ?? "Plano").trim();
    const amount = normalizeAmount(body.amount);
    const days = Number(body.days ?? 0);

    if (!listingId) {
      return NextResponse.json({ ok: false, error: "Anúncio inválido." }, { status: 400 });
    }

    if (amount <= 0) {
      return NextResponse.json(
        { ok: false, error: "Este plano não precisa de cobrança no Mercado Pago." },
        { status: 400 }
      );
    }

    const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ ok: false, error: "Usuário não autenticado." }, { status: 401 });
    }

    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("id,owner_id,listing_title")
      .eq("id", listingId)
      .single();

    if (listingError || !listing) {
      return NextResponse.json({ ok: false, error: "Anúncio não encontrado." }, { status: 404 });
    }

    if (String(listing.owner_id ?? "") !== user.id) {
      return NextResponse.json({ ok: false, error: "Sem permissão para este anúncio." }, { status: 403 });
    }

    const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
    const baseUrl = origin || "https://www.portaldiretoimoveis.com.br";
    const successUrl = `${baseUrl}/pagamento?status=success&listing=${encodeURIComponent(listingId)}`;
    const failureUrl = `${baseUrl}/pagamento?status=failure&listing=${encodeURIComponent(listingId)}`;
    const pendingUrl = `${baseUrl}/pagamento?status=pending&listing=${encodeURIComponent(listingId)}`;

    const webhookBase =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.VERCEL_PROJECT_PRODUCTION_URL ||
      process.env.VERCEL_URL ||
      baseUrl.replace(/^https?:\/\//, "");
    const normalizedWebhookBase = webhookBase.startsWith("http")
      ? webhookBase
      : `https://${webhookBase}`;
    const webhookToken = process.env.MERCADO_PAGO_WEBHOOK_TOKEN;
    const notificationUrl = webhookToken
      ? `${normalizedWebhookBase}/api/payments/mercado-pago/webhook?token=${encodeURIComponent(
          webhookToken
        )}`
      : `${normalizedWebhookBase}/api/payments/mercado-pago/webhook`;

    const payload = {
      items: [
        {
          id: planId || "plano",
          title: planName || "Plano Portal Direto",
          description: `Pagamento do plano para anúncio ${listingId}`,
          quantity: 1,
          unit_price: Number(amount.toFixed(2)),
          currency_id: "BRL",
        },
      ],
      payer: {
        email: user.email,
      },
      external_reference: `listing:${listingId}`,
      metadata: {
        listing_id: listingId,
        owner_id: user.id,
        plan_id: planId || null,
        plan_name: planName || null,
        plan_days: Number.isFinite(days) ? days : 0,
      },
      back_urls: {
        success: successUrl,
        failure: failureUrl,
        pending: pendingUrl,
      },
      auto_return: "approved",
      notification_url: notificationUrl,
    };

    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.mercadoPagoAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const mpData = (await mpResponse.json()) as {
      id?: string;
      init_point?: string;
      sandbox_init_point?: string;
    };

    if (!mpResponse.ok || !mpData?.id) {
      return NextResponse.json(
        { ok: false, error: "Não foi possível criar o checkout no Mercado Pago." },
        { status: 502 }
      );
    }

    await supabase
      .from("listings")
      .update({
        payment_status: "pending",
        payment_method: "mercado_pago",
        updated_at: new Date().toISOString(),
      })
      .eq("id", listingId);

    return NextResponse.json({
      ok: true,
      preferenceId: mpData.id,
      checkoutUrl: mpData.init_point || mpData.sandbox_init_point || "",
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Erro interno ao gerar pagamento." }, { status: 500 });
  }
}
