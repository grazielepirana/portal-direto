import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getBearerToken(header: string | null) {
  if (!header) return null;
  const [type, token] = header.split(" ");
  if (type?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

function isAllowedAdmin(email: string | null | undefined) {
  const normalized = String(email ?? "").toLowerCase().trim();
  if (!normalized) return false;

  const envList = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);

  if (envList.length === 0) return true;
  return envList.includes(normalized);
}

type IbgeCity = {
  nome: string;
  microrregiao?: {
    mesorregiao?: {
      UF?: {
        sigla?: string;
      };
    };
  };
};

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Variáveis de ambiente do Supabase não configuradas." },
      { status: 500 }
    );
  }

  const token = getBearerToken(req.headers.get("authorization"));
  if (!token) {
    return NextResponse.json({ error: "Token de autenticação ausente." }, { status: 401 });
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey);
  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser(token);

  if (authError || !user || !isAllowedAdmin(user.email)) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const response = await fetch(
    "https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome"
  );
  if (!response.ok) {
    return NextResponse.json({ error: "Falha ao consultar API do IBGE." }, { status: 502 });
  }

  const payload = (await response.json()) as IbgeCity[];
  const rows = payload
    .map((item) => {
      const city = String(item.nome ?? "").trim();
      const stateCode = String(item.microrregiao?.mesorregiao?.UF?.sigla ?? "").trim();
      if (!city || !stateCode) return null;

      return {
        state_code: stateCode,
        city,
        neighborhood: null as string | null,
        label: `${city} - ${stateCode}`,
        active: true,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const { error: deleteError } = await admin
    .from("location_options")
    .delete()
    .is("neighborhood", null)
    .not("city", "is", null);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  const chunkSize = 1000;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await admin.from("location_options").insert(chunk);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, imported: rows.length });
}
