import { supabase } from "./supabase";

export type ListingPlan = {
  id: string;
  name: string;
  price: number;
  days: number;
  is_featured: boolean;
  sort_order: number;
  active: boolean;
};

export const DEFAULT_LISTING_PLANS: ListingPlan[] = [
  {
    id: "free-120",
    name: "Primeiro anúncio grátis",
    price: 0,
    days: 120,
    is_featured: false,
    sort_order: 1,
    active: true,
  },
  {
    id: "destaque-30",
    name: "Plano Destaque",
    price: 99,
    days: 30,
    is_featured: true,
    sort_order: 2,
    active: true,
  },
  {
    id: "premium-60",
    name: "Plano Premium",
    price: 149,
    days: 60,
    is_featured: true,
    sort_order: 3,
    active: true,
  },
];

export async function loadListingPlans(): Promise<ListingPlan[]> {
  const { data, error } = await supabase
    .from("listing_plans")
    .select("id,name,price,days,is_featured,sort_order,active")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error || !data || data.length === 0) return DEFAULT_LISTING_PLANS;

  return (data as ListingPlan[]).map((p) => ({
    ...p,
    price: Number(p.price ?? 0),
    days: Number(p.days ?? 0),
    sort_order: Number(p.sort_order ?? 0),
  }));
}

export async function saveListingPlans(plans: ListingPlan[]) {
  const payload = plans.map((p, idx) => ({
    id: p.id,
    name: p.name,
    price: Number(p.price ?? 0),
    days: Number(p.days ?? 0),
    is_featured: Boolean(p.is_featured),
    sort_order: idx + 1,
    active: true,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from("listing_plans").upsert(payload, {
    onConflict: "id",
  });

  if (error) throw error;
}

export function calculateActiveUntil(days: number) {
  const expires = new Date();
  expires.setDate(expires.getDate() + Math.max(1, Math.floor(days || 1)));
  return expires.toISOString();
}
