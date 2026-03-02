import { supabase } from "./supabase";

type LocationOptionRow = {
  id?: string;
  state_code?: string | null;
  city?: string | null;
  neighborhood?: string | null;
  label?: string | null;
  active?: boolean | null;
};

export async function loadLocationOptions(): Promise<string[]> {
  const { data, error } = await supabase
    .from("location_options")
    .select("state_code,city,neighborhood,label,active")
    .eq("active", true)
    .order("city", { ascending: true })
    .order("neighborhood", { ascending: true })
    .limit(3000);

  if (error || !data) return [];

  const values = new Set<string>();
  for (const row of data as LocationOptionRow[]) {
    const label = String(row.label ?? "").trim();
    const stateCode = String(row.state_code ?? "").trim();
    const city = String(row.city ?? "").trim();
    const neighborhood = String(row.neighborhood ?? "").trim();

    if (label) values.add(label);
    if (city && stateCode) values.add(`${city} - ${stateCode}`);
    if (neighborhood && city) values.add(`${neighborhood} - ${city}`);
    if (neighborhood) values.add(neighborhood);
    if (city) values.add(city);
  }

  return Array.from(values);
}
