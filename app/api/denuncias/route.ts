import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const TIPOS_VALIDOS = new Set([
  "anúncio suspeito",
  "golpe",
  "conteúdo irregular",
  "outro",
]);

type DenunciaPayload = {
  name?: string | null;
  email?: string;
  tipo?: string;
  listingUrl?: string | null;
  message?: string;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

async function saveToJsonFallback(payload: {
  name: string | null;
  email: string;
  tipo: string;
  listing_url: string | null;
  message: string;
}) {
  const dataDir = path.join(process.cwd(), "data");
  const filePath = path.join(dataDir, "denuncias.json");

  await fs.mkdir(dataDir, { recursive: true });

  let current: unknown[] = [];
  try {
    const existing = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(existing);
    if (Array.isArray(parsed)) current = parsed;
  } catch {
    current = [];
  }

  current.push({
    ...payload,
    created_at: new Date().toISOString(),
    source: "json-fallback",
  });

  await fs.writeFile(filePath, JSON.stringify(current, null, 2), "utf8");
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as DenunciaPayload;

    const email = String(body.email ?? "").trim();
    const tipo = String(body.tipo ?? "").trim().toLowerCase();
    const message = String(body.message ?? "").trim();
    const name = body.name ? String(body.name).trim() : null;
    const listingUrl = body.listingUrl ? String(body.listingUrl).trim() : null;

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { ok: false, error: "Email inválido." },
        { status: 400 }
      );
    }

    if (!TIPOS_VALIDOS.has(tipo)) {
      return NextResponse.json(
        { ok: false, error: "Tipo de denúncia inválido." },
        { status: 400 }
      );
    }

    if (!message) {
      return NextResponse.json(
        { ok: false, error: "Mensagem é obrigatória." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && serviceRoleKey) {
      const admin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { error } = await admin.from("denuncias").insert({
        name,
        email,
        tipo,
        listing_url: listingUrl,
        message,
        source: "site",
      });

      if (error) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Não foi possível registrar a denúncia no banco. Verifique a tabela denuncias no Supabase.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true });
    }

    await saveToJsonFallback({
      name,
      email,
      tipo,
      listing_url: listingUrl,
      message,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Erro interno" },
      { status: 500 }
    );
  }
}

