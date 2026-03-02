import { supabase } from "./supabase";

export async function upsertProfile(userId: string, fullName: string) {
  const name = fullName.trim();
  if (!name) return { error: null };

  const { error } = await supabase.from("profiles").upsert(
    {
      user_id: userId,
      full_name: name,
    },
    { onConflict: "user_id" }
  );

  return { error };
}

export async function loadProfilesMap(userIds: string[]) {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  if (uniqueIds.length === 0) return {};

  const { data, error } = await supabase
    .from("profiles")
    .select("user_id,full_name")
    .in("user_id", uniqueIds);

  if (error || !data) return {};

  const map: Record<string, string> = {};
  for (const row of data) {
    const userId = String(row.user_id);
    const fullName = String(row.full_name ?? "").trim();
    if (fullName) map[userId] = fullName;
  }

  return map;
}
