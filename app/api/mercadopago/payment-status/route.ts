import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getEnv() {
  const mpAccessToken =
    process.env.MP_ACCESS_TOKEN ?? process.env.MERCADOPAGO_ACCESS_TOKEN ?? "";
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  return {
    mpAccessToken: mpAccessToken.trim(),
    supabaseUrl: supabaseUrl.trim(),
    serviceRoleKey: serviceRoleKey.trim(),
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

export async function GET(req: Request) {
  try {
    const env = getEnv();
    if (!env.supabaseUrl || !env.serviceRoleKey) {
      return NextResponse.json({ ok: false, error: "Configuração ausente." }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const mpPaymentId = String(
      searchParams.get("mp_payment_id") ?? searchParams.get("paymentId") ?? ""
    ).trim();

    if (!mpPaymentId) {
      return NextResponse.json(
        { ok: false, error: "mp_payment_id é obrigatório." },
        { status: 400 }
      );
    }

    const admin = createClient(env.supabaseUrl, env.serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: paymentRow } = await admin
      .from("payments")
      .select("id,status,listing_id,plan,days,approved_at")
      .eq("mp_payment_id", mpPaymentId)
      .maybeSingle();

    // Preferência: status vindo do banco (atualizado por webhook).
    if (paymentRow?.status === "approved") {
      return NextResponse.json({
        ok: true,
        paymentId: mpPaymentId,
        payment_status: "approved",
      });
    }

    // Fallback opcional: consulta no MP para sincronizar quando webhook atrasar.
    if (env.mpAccessToken) {
      const payment = await fetchPaymentDetails(mpPaymentId, env.mpAccessToken);
      if (payment?.id) {
        const status = String(payment.status ?? "pending").toLowerCase();
        const fromRef = parseExternalReference(payment.external_reference);
        const listingId =
          String(payment.metadata?.listing_id ?? "").trim() ||
          fromRef.listingId ||
          paymentRow?.listing_id ||
          "";
        const plan =
          String(payment.metadata?.plan ?? "").trim() ||
          fromRef.plan ||
          paymentRow?.plan ||
          null;
        const daysFromMeta = Number(payment.metadata?.days ?? 0);
        const days =
          Number.isFinite(daysFromMeta) && daysFromMeta > 0
            ? Math.trunc(daysFromMeta)
            : paymentRow?.days ?? fromRef.days ?? 0;

        await admin.from("payments").upsert(
          {
            ...(paymentRow?.id ? { id: paymentRow.id } : {}),
            listing_id: listingId || null,
            provider: "mercadopago",
            mp_payment_id: mpPaymentId,
            status,
            amount: Number(payment.transaction_amount ?? 0),
            plan,
            days,
            approved_at:
              status === "approved"
                ? payment.date_approved ?? paymentRow?.approved_at ?? new Date().toISOString()
                : paymentRow?.approved_at ?? null,
            raw: payment,
          },
          { onConflict: "mp_payment_id" }
        );

        if (status === "approved" && listingId) {
          await admin
            .from("listings")
            .update({
              is_featured: true,
              featured_until: addDaysIso(days > 0 ? days : 30),
              featured_plan: plan || "destaque",
              payment_status: "paid",
              paid_at: payment.date_approved ?? new Date().toISOString(),
              payment_method: `mercadopago:${payment.payment_method_id ?? "pix"}`,
              updated_at: new Date().toISOString(),
            })
            .eq("id", listingId);
        }

        return NextResponse.json({
          ok: true,
          paymentId: mpPaymentId,
          payment_status: status,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      paymentId: mpPaymentId,
      payment_status: String(paymentRow?.status ?? "pending"),
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Erro interno ao consultar status." }, { status: 500 });
  }
}
