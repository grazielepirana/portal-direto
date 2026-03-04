import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function parseListingId(externalReference: string | null | undefined) {
  const ref = String(externalReference ?? "").trim();
  if (!ref) return "";
  if (ref.startsWith("listing:")) return ref.replace("listing:", "").trim();
  return ref;
}

async function fetchPaymentDetails(paymentId: string, accessToken: string) {
  const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) return null;
  const data = (await response.json()) as {
    id?: number;
    status?: string;
    external_reference?: string;
    metadata?: Record<string, unknown> | null;
    date_approved?: string;
    payment_method_id?: string;
  };
  return data;
}

export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  try {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!accessToken || !supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ ok: false, error: "Webhook não configurado." }, { status: 500 });
    }

    const configuredWebhookToken = process.env.MERCADO_PAGO_WEBHOOK_TOKEN;
    if (configuredWebhookToken) {
      const url = new URL(req.url);
      if (url.searchParams.get("token") !== configuredWebhookToken) {
        return NextResponse.json({ ok: false, error: "Token inválido." }, { status: 401 });
      }
    }

    const url = new URL(req.url);
    const queryType = url.searchParams.get("type") ?? url.searchParams.get("topic") ?? "";
    const queryDataId = url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? "";

    let bodyDataId = "";
    let bodyType = "";
    try {
      const body = (await req.json()) as {
        type?: string;
        topic?: string;
        data?: { id?: string | number };
      };
      bodyDataId = String(body?.data?.id ?? "").trim();
      bodyType = String(body?.type ?? body?.topic ?? "").trim();
    } catch {
      bodyDataId = "";
      bodyType = "";
    }

    const type = (bodyType || queryType || "").toLowerCase();
    const paymentId = (bodyDataId || queryDataId || "").trim();

    if (type && type !== "payment") {
      return NextResponse.json({ ok: true, ignored: true });
    }

    if (!paymentId) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const payment = await fetchPaymentDetails(paymentId, accessToken);
    if (!payment) {
      return NextResponse.json({ ok: false, error: "Pagamento não encontrado." }, { status: 404 });
    }

    if (String(payment.status ?? "").toLowerCase() !== "approved") {
      return NextResponse.json({ ok: true, ignored: true, status: payment.status ?? "unknown" });
    }

    const metadataListingId = String(payment.metadata?.listing_id ?? "").trim();
    const listingId = metadataListingId || parseListingId(payment.external_reference);
    if (!listingId) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error } = await admin
      .from("listings")
      .update({
        payment_status: "paid",
        payment_method: `mercado_pago:${payment.payment_method_id ?? "approved"}`,
        paid_at: payment.date_approved ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", listingId);

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: "Não foi possível atualizar o anúncio no webhook do Mercado Pago.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Erro interno no webhook." }, { status: 500 });
  }
}
