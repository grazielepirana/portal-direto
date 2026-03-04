import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getEnv() {
  const mpAccessToken =
    process.env.MP_ACCESS_TOKEN ?? process.env.MERCADOPAGO_ACCESS_TOKEN ?? "";
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const webhookSecret =
    process.env.MP_WEBHOOK_SECRET ?? process.env.MERCADO_PAGO_WEBHOOK_TOKEN ?? "";

  return {
    mpAccessToken: mpAccessToken.trim(),
    supabaseUrl: supabaseUrl.trim(),
    serviceRoleKey: serviceRoleKey.trim(),
    webhookSecret: webhookSecret.trim(),
  };
}

function parseExternalReference(ref: string | null | undefined) {
  const text = String(ref ?? "").trim();
  const parts = text.split("|");
  const listing = parts.find((p) => p.startsWith("listing:"))?.replace("listing:", "").trim() ?? "";
  const plan = parts.find((p) => p.startsWith("plan:"))?.replace("plan:", "").trim() ?? "";
  const daysRaw = parts.find((p) => p.startsWith("days:"))?.replace("days:", "").trim() ?? "";
  const days = Number(daysRaw);
  return {
    listingId: listing,
    plan,
    days: Number.isFinite(days) ? Math.max(0, Math.trunc(days)) : 0,
  };
}

function addDaysIso(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + Math.max(0, days));
  return date.toISOString();
}

async function fetchPaymentDetails(paymentId: string, accessToken: string) {
  const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });
  if (!response.ok) return null;
  return (await response.json()) as {
    id?: string | number;
    status?: string;
    transaction_amount?: number;
    external_reference?: string;
    metadata?: Record<string, unknown> | null;
    date_approved?: string;
    payment_method_id?: string;
  };
}

async function extractPaymentId(req: Request) {
  const url = new URL(req.url);
  const queryId = url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? "";
  const queryType = url.searchParams.get("type") ?? url.searchParams.get("topic") ?? "";

  let bodyId = "";
  let bodyType = "";
  try {
    const body = (await req.json()) as {
      type?: string;
      topic?: string;
      data?: { id?: string | number };
    };
    bodyId = String(body?.data?.id ?? "").trim();
    bodyType = String(body?.type ?? body?.topic ?? "").trim();
  } catch {
    bodyId = "";
    bodyType = "";
  }

  const type = (bodyType || queryType || "").toLowerCase();
  if (type && type !== "payment") return "";
  return (bodyId || queryId || "").trim();
}

export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  try {
    const env = getEnv();
    if (!env.mpAccessToken || !env.supabaseUrl || !env.serviceRoleKey) {
      return NextResponse.json({ ok: false, error: "Webhook não configurado." }, { status: 500 });
    }

    if (env.webhookSecret) {
      const token = new URL(req.url).searchParams.get("token") ?? "";
      if (token !== env.webhookSecret) {
        return NextResponse.json({ ok: false, error: "Token inválido." }, { status: 401 });
      }
    }

    const paymentId = await extractPaymentId(req);
    if (!paymentId) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    // Segurança principal: sempre valida no MP antes de confiar no payload do webhook.
    const payment = await fetchPaymentDetails(paymentId, env.mpAccessToken);
    if (!payment?.id) {
      return NextResponse.json({ ok: false, error: "Pagamento não encontrado." }, { status: 404 });
    }

    const admin = createClient(env.supabaseUrl, env.serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const fromRef = parseExternalReference(payment.external_reference);
    const listingFromMetadata = String(payment.metadata?.listing_id ?? "").trim();
    const listingId = listingFromMetadata || fromRef.listingId;
    const planFromMetadata = String(payment.metadata?.plan ?? "").trim();
    const plan = planFromMetadata || fromRef.plan || null;
    const daysFromMetadata = Number(payment.metadata?.days ?? 0);
    const days =
      Number.isFinite(daysFromMetadata) && daysFromMetadata > 0
        ? Math.trunc(daysFromMetadata)
        : fromRef.days;
    const status = String(payment.status ?? "pending").toLowerCase();
    const amount = Number(payment.transaction_amount ?? 0);

    const { data: currentPayment } = await admin
      .from("payments")
      .select("id,status,approved_at,listing_id,plan,days")
      .eq("mp_payment_id", String(payment.id))
      .maybeSingle();

    await admin.from("payments").upsert(
      {
        ...(currentPayment?.id ? { id: currentPayment.id } : {}),
        listing_id: listingId || currentPayment?.listing_id || null,
        provider: "mercadopago",
        mp_payment_id: String(payment.id),
        status,
        amount: Number.isFinite(amount) ? amount : null,
        plan: plan || currentPayment?.plan || null,
        days: days > 0 ? days : currentPayment?.days ?? null,
        approved_at:
          status === "approved"
            ? payment.date_approved ?? currentPayment?.approved_at ?? new Date().toISOString()
            : currentPayment?.approved_at ?? null,
        raw: payment,
      },
      { onConflict: "mp_payment_id" }
    );

    if (status === "approved" && listingId) {
      const featuredDays = days > 0 ? days : 30;
      // Idempotente: update repetido com mesmo estado não causa efeito colateral.
      await admin
        .from("listings")
        .update({
          is_featured: true,
          featured_until: addDaysIso(featuredDays),
          featured_plan: plan || "destaque",
          payment_status: "paid",
          paid_at: payment.date_approved ?? new Date().toISOString(),
          payment_method: `mercadopago:${payment.payment_method_id ?? "pix"}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", listingId);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Erro interno no webhook." }, { status: 500 });
  }
}
