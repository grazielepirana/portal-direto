import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type AudienceMode = "all" | "confirmed";

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

function getBearerToken(header: string | null) {
  if (!header) return "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

async function loadAudienceEmails(
  admin: { auth: { admin: { listUsers: (params: { page: number; perPage: number }) => Promise<{ data: { users: Array<{ email?: string | null; email_confirmed_at?: string | null }> } | null; error: { message: string } | null }> } } },
  audience: AudienceMode
) {
  const emails = new Set<string>();
  const perPage = 200;

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`Falha ao carregar usuários: ${error.message}`);

    const batch = data?.users ?? [];
    for (const user of batch) {
      const email = String(user.email ?? "").trim().toLowerCase();
      if (!email) continue;
      if (audience === "confirmed" && !user.email_confirmed_at) continue;
      emails.add(email);
    }
    if (batch.length < perPage) break;
  }

  return Array.from(emails);
}

export async function POST(req: Request) {
  try {
    const supabaseUrl =
      process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    const resendApiKey = (process.env.RESEND_API_KEY ?? "").trim();

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return NextResponse.json(
        { ok: false, error: "Variáveis de ambiente do Supabase não configuradas." },
        { status: 500 }
      );
    }

    if (!resendApiKey) {
      return NextResponse.json(
        {
          ok: false,
          error: "RESEND_API_KEY não configurada no servidor.",
        },
        { status: 500 }
      );
    }

    const token = getBearerToken(req.headers.get("authorization"));
    if (!token) {
      return NextResponse.json({ ok: false, error: "Sessão inválida." }, { status: 401 });
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser();

    if (userError || !user || !isAllowedAdmin(user.email)) {
      return NextResponse.json({ ok: false, error: "Acesso não autorizado." }, { status: 403 });
    }

    const body = (await req.json()) as {
      subject?: string;
      message?: string;
      audience?: AudienceMode;
    };

    const subject = String(body.subject ?? "").trim();
    const message = String(body.message ?? "").trim();
    const audience: AudienceMode = body.audience === "all" ? "all" : "confirmed";

    if (!subject || !message) {
      return NextResponse.json(
        { ok: false, error: "Preencha assunto e mensagem." },
        { status: 400 }
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const recipients = await loadAudienceEmails(admin, audience);
    if (recipients.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Nenhum usuário encontrado para esse público." },
        { status: 400 }
      );
    }

    if (recipients.length > 300) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "A campanha tem muitos destinatários para envio único. Reduza o público e tente novamente.",
        },
        { status: 400 }
      );
    }

    const fromEmail = (process.env.SUPPORT_FROM_EMAIL ?? "").trim() || "Portal Direto <onboarding@resend.dev>";
    const text = `${message}\n\n---\nPortal Direto Imóveis`;
    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#111827;">
        <h2 style="margin-bottom:12px;">${subject}</h2>
        <p style="white-space:pre-wrap;margin:0;">${message}</p>
      </div>
    `;

    let sent = 0;
    const failed: string[] = [];

    for (const email of recipients) {
      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [email],
          subject: `[Portal Direto] ${subject}`,
          text,
          html,
        }),
      });

      if (resendRes.ok) {
        sent += 1;
      } else {
        failed.push(email);
      }
    }

    return NextResponse.json({
      ok: true,
      sent,
      failed: failed.length,
      total: recipients.length,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro interno ao enviar campanha.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
