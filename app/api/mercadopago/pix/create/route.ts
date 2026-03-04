import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type CreatePixPayload = {
  listingId?: string;
  amount?: number;
  plan?: string;
  planName?: string;
  days?: number;
  userEmail?: string;
};

function getEnv() {
  const mpAccessToken =
    process.env.MP_ACCESS_TOKEN ?? process.env.MERCADOPAGO_ACCESS_TOKEN ?? "";
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  return {
    mpAccessToken: mpAccessToken.trim(),
    supabaseUrl: supabaseUrl.trim(),
    supabaseAnonKey: supabaseAnonKey.trim(),
    serviceRoleKey: serviceRoleKey.trim(),
  };
}

function normalizeAmount(value: unknown) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return 0;
  return Math.max(0, amount);
}

function normalizeDays(value: unknown) {
  const days = Number(value ?? 0);
  if (!Number.isFinite(days)) return 0;
  return Math.max(0, Math.trunc(days));
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function parseListingId(externalReference: string | null | undefined) {
  const ref = String(externalReference ?? "").trim();
  if (!ref) return "";
  const first = ref.split("|").find((item) => item.startsWith("listing:"));
  if (first) return first.replace("listing:", "").trim();
  return "";
}

export async function POST(req: Request) {
  try {
    const env = getEnv();
    if (!env.mpAccessToken || !env.supabaseUrl || !env.supabaseAnonKey || !env.serviceRoleKey) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Variáveis de ambiente ausentes. Configure MP_ACCESS_TOKEN, SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY.",
        },
        { status: 500 }
      );
    }

    const authHeader = req.headers.get("authorization") ?? "";
    const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (!accessToken) {
      return NextResponse.json({ ok: false, error: "Sessão inválida." }, { status: 401 });
    }

    const body = (await req.json()) as CreatePixPayload;
    const listingId = String(body.listingId ?? "").trim();
    const amount = normalizeAmount(body.amount);
    const plan = String(body.plan ?? "").trim();
    const planName = String(body.planName ?? "Plano Portal Direto").trim();
    const days = normalizeDays(body.days);
    const emailFromBody = String(body.userEmail ?? "").trim().toLowerCase();

    if (!listingId) {
      return NextResponse.json({ ok: false, error: "listingId é obrigatório." }, { status: 400 });
    }
    if (amount <= 0) {
      return NextResponse.json({ ok: false, error: "amount deve ser maior que zero." }, { status: 400 });
    }
    if (!planName) {
      return NextResponse.json({ ok: false, error: "planName é obrigatório." }, { status: 400 });
    }

    const authClient = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ ok: false, error: "Usuário não autenticado." }, { status: 401 });
    }

    const { data: listing, error: listingError } = await authClient
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

    const payerEmail = (emailFromBody || String(user.email ?? "").trim()).toLowerCase();
    if (!isValidEmail(payerEmail)) {
      return NextResponse.json({ ok: false, error: "userEmail inválido." }, { status: 400 });
    }

    const webhookToken = process.env.MP_WEBHOOK_SECRET ?? process.env.MERCADO_PAGO_WEBHOOK_TOKEN ?? "";
    const notificationUrl = webhookToken
      ? `https://www.portaldiretoimoveis.com.br/api/mercadopago/webhook?token=${encodeURIComponent(
          webhookToken
        )}`
      : "https://www.portaldiretoimoveis.com.br/api/mercadopago/webhook";

    const externalReference = `listing:${listingId}|plan:${plan || "plano"}|days:${days}`;

    const mpPayload = {
      transaction_amount: Number(amount.toFixed(2)),
      description: planName,
      payment_method_id: "pix",
      payer: { email: payerEmail },
      external_reference: externalReference,
      metadata: {
        listing_id: listingId,
        plan: plan || null,
        days,
      },
      notification_url: notificationUrl,
    };

    const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.mpAccessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify(mpPayload),
    });

    const mpData = (await mpResponse.json()) as {
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

    if (!mpResponse.ok || !mpData?.id) {
      const causeText = Array.isArray(mpData?.cause)
        ? mpData.cause
            .map((item) => String(item?.description ?? item?.code ?? "").trim())
            .filter(Boolean)
            .join(" | ")
        : "";
      const apiMsg = String(mpData?.message ?? mpData?.error ?? "").trim();
      return NextResponse.json(
        {
          ok: false,
          error: [apiMsg, causeText].filter(Boolean).join(" | ") || "Falha ao criar pagamento PIX.",
          statusCode: mpResponse.status,
          details: mpData,
        },
        { status: mpResponse.status || 502 }
      );
    }

    const qrCode = String(mpData.point_of_interaction?.transaction_data?.qr_code ?? "");
    const qrCodeBase64Raw = String(
      mpData.point_of_interaction?.transaction_data?.qr_code_base64 ?? ""
    );
    if (!qrCode || !qrCodeBase64Raw) {
      return NextResponse.json(
        {
          ok: false,
          error: "Pagamento criado sem retorno de QR Code.",
          statusCode: 502,
          details: mpData,
        },
        { status: 502 }
      );
    }

    const admin = createClient(env.supabaseUrl, env.serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    await admin.from("payments").upsert(
      {
        listing_id: parseListingId(mpData.external_reference) || listingId,
        provider: "mercadopago",
        mp_payment_id: String(mpData.id),
        status: String(mpData.status ?? "pending").toLowerCase(),
        amount: Number(amount.toFixed(2)),
        plan: plan || planName,
        days,
        raw: mpData,
      },
      { onConflict: "mp_payment_id" }
    );

    return NextResponse.json({
      ok: true,
      paymentId: String(mpData.id),
      qrCode,
      qrCodeBase64: `data:image/png;base64,${qrCodeBase64Raw}`,
      status: String(mpData.status ?? "pending").toLowerCase(),
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Erro interno no create PIX." }, { status: 500 });
  }
}
