import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type Payload = {
  listingId?: string;
  planId?: string;
  planName?: string;
  amount?: number;
  userEmail?: string;
};

function normalizeAmount(value: unknown) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return 0;
  return Math.max(0, amount);
}

function parseListingId(externalReference: string | null | undefined) {
  const ref = String(externalReference ?? "").trim();
  if (!ref) return "";
  if (ref.startsWith("listing:")) return ref.replace("listing:", "").trim();
  return ref;
}

function getRequiredEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const mercadoPagoAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

  if (!supabaseUrl || !supabaseAnonKey || !mercadoPagoAccessToken) return null;
  return { supabaseUrl, supabaseAnonKey, mercadoPagoAccessToken };
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export async function POST(req: Request) {
  try {
    const env = getRequiredEnv();
    if (!env) {
      return NextResponse.json(
        {
          ok: false,
          error: "Integração Mercado Pago não configurada no servidor.",
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
    const planName = String(body.planName ?? "Plano Portal Direto").trim();
    const amount = normalizeAmount(body.amount);
    const userEmailFromBody = String(body.userEmail ?? "").trim().toLowerCase();

    if (!listingId) {
      return NextResponse.json({ ok: false, error: "Anúncio inválido." }, { status: 400 });
    }
    if (amount <= 0) {
      return NextResponse.json(
        { ok: false, error: "Este plano não precisa de cobrança PIX." },
        { status: 400 }
      );
    }
    if (!planName) {
      return NextResponse.json(
        { ok: false, error: "planName é obrigatório." },
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
      .select("id,owner_id")
      .eq("id", listingId)
      .single();

    if (listingError || !listing) {
      return NextResponse.json({ ok: false, error: "Anúncio não encontrado." }, { status: 404 });
    }

    if (String(listing.owner_id ?? "") !== user.id) {
      return NextResponse.json({ ok: false, error: "Sem permissão para este anúncio." }, { status: 403 });
    }

    const payerEmail = userEmailFromBody || String(user.email ?? "").trim().toLowerCase();
    if (!payerEmail) {
      return NextResponse.json(
        { ok: false, error: "Email do pagador não encontrado." },
        { status: 400 }
      );
    }
    if (!isValidEmail(payerEmail)) {
      return NextResponse.json(
        { ok: false, error: "Email do pagador inválido." },
        { status: 400 }
      );
    }

    const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
    const baseUrl = origin || "https://www.portaldiretoimoveis.com.br";
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

    const mpPayload = {
      transaction_amount: Number(amount.toFixed(2)),
      description: planName,
      payment_method_id: "pix",
      payer: { email: payerEmail },
      external_reference: `listing:${listingId}`,
      metadata: {
        listing_id: listingId,
        plan_id: planId || null,
        owner_id: user.id,
      },
      notification_url: notificationUrl,
    };

    const response = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.mercadoPagoAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(mpPayload),
    });

    const data = (await response.json()) as {
      id?: string | number;
      status?: string;
      external_reference?: string;
      message?: string;
      error?: string;
      cause?: Array<{ code?: string | number; description?: string }>;
      point_of_interaction?: {
        transaction_data?: {
          qr_code?: string;
          qr_code_base64?: string;
        };
      };
    };

    if (!response.ok || !data?.id) {
      const causeText = Array.isArray(data?.cause)
        ? data.cause
            .map((item) => String(item?.description ?? item?.code ?? "").trim())
            .filter(Boolean)
            .join(" | ")
        : "";
      const mpMessage = String(data?.message ?? data?.error ?? "").trim();
      const composedMessage = [mpMessage, causeText].filter(Boolean).join(" | ");
      return NextResponse.json(
        {
          ok: false,
          error:
            composedMessage ||
            "Não foi possível gerar o PIX no Mercado Pago.",
          statusCode: response.status,
          details: data,
        },
        { status: response.status || 502 }
      );
    }

    const qrCode = data.point_of_interaction?.transaction_data?.qr_code ?? "";
    const qrCodeBase64 = data.point_of_interaction?.transaction_data?.qr_code_base64 ?? "";
    if (!qrCode || !qrCodeBase64) {
      return NextResponse.json(
        {
          ok: false,
          error: "PIX gerado sem QR Code retornado pelo Mercado Pago.",
          statusCode: 502,
        },
        { status: 502 }
      );
    }

    await supabase
      .from("listings")
      .update({
        payment_status: "pending",
        payment_method: "mercado_pago_pix",
        updated_at: new Date().toISOString(),
      })
      .eq("id", parseListingId(data.external_reference) || listingId);

    return NextResponse.json({
      ok: true,
      paymentId: String(data.id),
      qrCode,
      qrCodeBase64: `data:image/png;base64,${qrCodeBase64}`,
      status: String(data.status ?? "pending"),
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Erro interno ao criar pagamento PIX." },
      { status: 500 }
    );
  }
}
