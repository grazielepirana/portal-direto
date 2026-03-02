import { supabase } from "./supabase";

export async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user?.id ?? null;
}

export async function loadFavoriteListingIds(userId: string) {
  const { data, error } = await supabase
    .from("favorites")
    .select("listing_id")
    .eq("user_id", userId);

  if (error || !data) return [];
  return data.map((row) => String(row.listing_id));
}

export async function addFavorite(userId: string, listingId: string) {
  const { error } = await supabase
    .from("favorites")
    .upsert(
      {
        user_id: userId,
        listing_id: listingId,
      },
      { onConflict: "user_id,listing_id", ignoreDuplicates: true }
    );
  return { error };
}

export async function removeFavorite(userId: string, listingId: string) {
  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("user_id", userId)
    .eq("listing_id", listingId);
  return { error };
}
