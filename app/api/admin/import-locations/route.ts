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

function parseCsvLine(line: string, delimiter: string) {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      out.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  out.push(current.trim());
  return out;
}

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

  const formData = await req.formData();
  const file = formData.get("file");
  const replace = String(formData.get("replace") ?? "") === "true";
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo CSV não informado." }, { status: 400 });
  }

  const raw = await file.text();
  const text = raw.replace(/^\uFEFF/, "");
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return NextResponse.json(
      { error: "CSV vazio. Inclua cabeçalho e linhas de dados." },
      { status: 400 }
    );
  }

  const delimiter = lines[0].includes(";") ? ";" : ",";
  const headers = parseCsvLine(lines[0], delimiter).map((h) =>
    h.toLowerCase().replace(/\s+/g, "_")
  );

  const cityIndex = headers.findIndex((h) => h === "city" || h === "cidade");
  const neighborhoodIndex = headers.findIndex(
    (h) => h === "neighborhood" || h === "bairro"
  );
  const stateIndex = headers.findIndex(
    (h) => h === "state_code" || h === "uf" || h === "estado"
  );
  const labelIndex = headers.findIndex((h) => h === "label" || h === "rotulo");

  if (cityIndex < 0 && neighborhoodIndex < 0) {
    return NextResponse.json(
      { error: "CSV precisa ter coluna city/cidade e/ou neighborhood/bairro." },
      { status: 400 }
    );
  }

  const unique = new Map<
    string,
    {
      state_code: string | null;
      city: string | null;
      neighborhood: string | null;
      label: string | null;
      active: boolean;
    }
  >();

  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseCsvLine(lines[i], delimiter);
    const city = (cityIndex >= 0 ? cols[cityIndex] : "").trim();
    const neighborhood = (neighborhoodIndex >= 0 ? cols[neighborhoodIndex] : "").trim();
    const stateCode = (stateIndex >= 0 ? cols[stateIndex] : "").trim().toUpperCase();
    const givenLabel = (labelIndex >= 0 ? cols[labelIndex] : "").trim();

    if (!city && !neighborhood) continue;
    const label =
      givenLabel ||
      (city && neighborhood
        ? `${neighborhood} - ${city}${stateCode ? ` - ${stateCode}` : ""}`
        : city || neighborhood || null);

    const key = `${stateCode}|${city.toLowerCase()}|${neighborhood.toLowerCase()}`;
    unique.set(key, {
      state_code: stateCode || null,
      city: city || null,
      neighborhood: neighborhood || null,
      label,
      active: true,
    });
  }

  const rows = Array.from(unique.values());
  if (rows.length === 0) {
    return NextResponse.json({ error: "Nenhuma linha válida no CSV." }, { status: 400 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (replace) {
    const { error: deleteError } = await admin
      .from("location_options")
      .delete()
      .not("id", "is", "null");
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }
  }

  const chunkSize = 1000;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await admin.from("location_options").insert(chunk);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, imported: rows.length, replaced: replace });
}
