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
    id?: string | number;
    status?: string;
    external_reference?: string;
    metadata?: Record<string, unknown> | null;
    date_approved?: string;
    payment_method_id?: string;
  };
  return data;
}

export async function GET(req: Request) {
  try {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!accessToken || !supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ ok: false, error: "Configuração ausente." }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const paymentId = String(searchParams.get("paymentId") ?? "").trim();
    if (!paymentId) {
      return NextResponse.json({ ok: false, error: "paymentId é obrigatório." }, { status: 400 });
    }

    const payment = await fetchPaymentDetails(paymentId, accessToken);
    if (!payment) {
      return NextResponse.json({ ok: false, error: "Pagamento não encontrado." }, { status: 404 });
    }

    const status = String(payment.status ?? "").toLowerCase();
    const listingId =
      String(payment.metadata?.listing_id ?? "").trim() || parseListingId(payment.external_reference);

    if (status === "approved" && listingId) {
      const admin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      await admin
        .from("listings")
        .update({
          payment_status: "paid",
          payment_method: `mercado_pago:${payment.payment_method_id ?? "pix"}`,
          paid_at: payment.date_approved ?? new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", listingId);
    }

    return NextResponse.json({
      ok: true,
      payment_id: String(payment.id ?? paymentId),
      payment_status: status || "pending",
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Erro interno ao consultar status." }, { status: 500 });
  }
}
