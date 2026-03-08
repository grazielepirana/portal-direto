import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type AudienceUser = {
  id: string;
  email: string;
  email_confirmed_at: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
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

function getBearerToken(header: string | null) {
  if (!header) return "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

export async function GET(req: Request) {
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

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const users: AudienceUser[] = [];
    const perPage = 200;

    for (let page = 1; page <= 10; page += 1) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error) {
        return NextResponse.json(
          { ok: false, error: `Falha ao carregar usuários: ${error.message}` },
          { status: 500 }
        );
      }

      const batch = data?.users ?? [];
      for (const item of batch) {
        const email = String(item.email ?? "").trim();
        if (!email) continue;
        users.push({
          id: item.id,
          email,
          email_confirmed_at: item.email_confirmed_at ?? null,
          created_at: item.created_at ?? null,
          last_sign_in_at: item.last_sign_in_at ?? null,
        });
      }

      if (batch.length < perPage) break;
    }

    users.sort((a, b) => {
      const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bDate - aDate;
    });

    const confirmedCount = users.filter((item) => Boolean(item.email_confirmed_at)).length;
    return NextResponse.json({
      ok: true,
      total: users.length,
      confirmedCount,
      users: users.slice(0, 500),
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Erro interno ao carregar audiência de e-mails." },
      { status: 500 }
    );
  }
}

