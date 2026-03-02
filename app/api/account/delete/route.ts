import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getBearerToken(header: string | null) {
  if (!header) return null;
  const [type, token] = header.split(" ");
  if (type?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return NextResponse.json(
      {
        error:
          "Configuração ausente no servidor. Defina NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY.",
      },
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

  if (authError || !user) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const userId = user.id;

  const deleteResults = await Promise.allSettled([
    admin.from("favorites").delete().eq("user_id", userId),
    admin.from("messages").delete().eq("sender_id", userId),
    admin.from("listings").delete().eq("owner_id", userId),
  ]);

  for (const result of deleteResults) {
    if (result.status === "fulfilled" && result.value.error) {
      return NextResponse.json({ error: result.value.error.message }, { status: 500 });
    }
    if (result.status === "rejected") {
      return NextResponse.json({ error: "Falha ao limpar dados da conta." }, { status: 500 });
    }
  }

  const { data: convData, error: convError } = await admin
    .from("conversations")
    .select("id")
    .or(`user_a.eq.${userId},user_b.eq.${userId}`);

  if (convError) {
    return NextResponse.json({ error: convError.message }, { status: 500 });
  }

  const conversationIds = (convData ?? []).map((row) => row.id as string);
  if (conversationIds.length > 0) {
    const { error: deleteMsgsInConvError } = await admin
      .from("messages")
      .delete()
      .in("conversation_id", conversationIds);
    if (deleteMsgsInConvError) {
      return NextResponse.json({ error: deleteMsgsInConvError.message }, { status: 500 });
    }

    const { error: deleteConvError } = await admin
      .from("conversations")
      .delete()
      .in("id", conversationIds);
    if (deleteConvError) {
      return NextResponse.json({ error: deleteConvError.message }, { status: 500 });
    }
  }

  const { error: deleteUserError } = await admin.auth.admin.deleteUser(userId);
  if (deleteUserError) {
    return NextResponse.json({ error: deleteUserError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
