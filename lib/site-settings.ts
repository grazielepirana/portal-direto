import { supabase } from "./supabase";

export type SiteSettings = {
  site_name: string;
  logo_url: string;
  favicon_url: string;
  favicon_scale_percent: number;
  logo_height_px: number;
  hero_image_url: string;
  hero_height_px: number;
  hero_image_fit: "cover" | "contain";
  hero_image_position_x: number;
  hero_image_position_y: number;
  home_info_block_1_bg_url: string;
  home_info_block_2_bg_url: string;
  home_info_blocks_height_px: number;
  home_info_blocks_image_fit: "cover" | "contain";
  primary_color: string;
  header_bg_color: string;
  header_text_color: string;
  background_color: string;
  text_primary_color: string;
  action_color: string;
  button_bg_color: string;
  button_hover_color: string;
  listing_card_bg_color: string;
  detail_bg_color: string;
  line_color: string;
  font_body: string;
  font_headings: string;
  font_header: string;
  about_text: string;
  how_it_works_text: string;
  support_phone_1: string;
  support_phone_2: string;
  support_email: string;
  social_instagram_url: string;
  social_facebook_url: string;
  social_youtube_url: string;
  payment_provider:
    | "internal_checkout"
    | "none"
    | "mercado_pago_link"
    | "stripe_link"
    | "custom_link";
  payment_link_template: string;
  payment_help_text: string;
  payment_pix_key: string;
};

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  site_name: "Portal Direto",
  logo_url: "",
  favicon_url: "",
  favicon_scale_percent: 100,
  logo_height_px: 40,
  hero_image_url: "",
  hero_height_px: 224,
  hero_image_fit: "cover",
  hero_image_position_x: 50,
  hero_image_position_y: 50,
  home_info_block_1_bg_url: "",
  home_info_block_2_bg_url: "",
  home_info_blocks_height_px: 220,
  home_info_blocks_image_fit: "cover",
  primary_color: "#0E9F6E",
  header_bg_color: "#ffffff",
  header_text_color: "#111827",
  background_color: "#F7F8FA",
  text_primary_color: "#111827",
  action_color: "#0E9F6E",
  button_bg_color: "#0E9F6E",
  button_hover_color: "#0A8A5E",
  listing_card_bg_color: "#ffffff",
  detail_bg_color: "#EAF8F2",
  line_color: "#cbd5e1",
  font_body: "Arial, Helvetica, sans-serif",
  font_headings: "Arial, Helvetica, sans-serif",
  font_header: "Arial, Helvetica, sans-serif",
  about_text:
    "Conectamos proprietários e compradores para negociações diretas, com mais transparência e praticidade.",
  how_it_works_text:
    "1) Você anuncia seu imóvel  2) Recebe contatos diretos  3) Negocia sem intermediários.",
  support_phone_1: "",
  support_phone_2: "",
  support_email: "",
  social_instagram_url: "",
  social_facebook_url: "",
  social_youtube_url: "",
  payment_provider: "internal_checkout",
  payment_link_template: "",
  payment_help_text:
    "Finalize o pagamento aqui dentro do site para ativar seu anúncio.",
  payment_pix_key: "",
};

export function isAdminEmail(email: string | null): boolean {
  if (!email) return false;

  const envList = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);

  // Fallback seguro: se a env falhar, apenas este e-mail pode acessar.
  if (envList.length === 0) {
    return email.toLowerCase() === "grazielepirana@outlook.com";
  }

  return envList.includes(email.toLowerCase());
}

export async function loadSiteSettings(): Promise<SiteSettings> {
  const { data, error } = await supabase
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (error || !data) {
    if (error) {
      console.error("Erro ao carregar site_settings:", error.message);
    }
    return DEFAULT_SITE_SETTINGS;
  }

  return {
    site_name: data.site_name ?? DEFAULT_SITE_SETTINGS.site_name,
    logo_url: data.logo_url ?? DEFAULT_SITE_SETTINGS.logo_url,
    favicon_url: data.favicon_url ?? DEFAULT_SITE_SETTINGS.favicon_url,
    favicon_scale_percent:
      Number(data.favicon_scale_percent) >= 50 && Number(data.favicon_scale_percent) <= 220
        ? Number(data.favicon_scale_percent)
        : DEFAULT_SITE_SETTINGS.favicon_scale_percent,
    logo_height_px:
      Number(data.logo_height_px) > 0
        ? Number(data.logo_height_px)
        : DEFAULT_SITE_SETTINGS.logo_height_px,
    hero_image_url: data.hero_image_url ?? DEFAULT_SITE_SETTINGS.hero_image_url,
    hero_height_px:
      Number(data.hero_height_px) > 0
        ? Number(data.hero_height_px)
        : DEFAULT_SITE_SETTINGS.hero_height_px,
    hero_image_fit:
      data.hero_image_fit === "contain" ? "contain" : DEFAULT_SITE_SETTINGS.hero_image_fit,
    hero_image_position_x:
      Number(data.hero_image_position_x) >= 0 && Number(data.hero_image_position_x) <= 100
        ? Number(data.hero_image_position_x)
        : DEFAULT_SITE_SETTINGS.hero_image_position_x,
    hero_image_position_y:
      Number(data.hero_image_position_y) >= 0 && Number(data.hero_image_position_y) <= 100
        ? Number(data.hero_image_position_y)
        : DEFAULT_SITE_SETTINGS.hero_image_position_y,
    home_info_block_1_bg_url:
      data.home_info_block_1_bg_url ?? DEFAULT_SITE_SETTINGS.home_info_block_1_bg_url,
    home_info_block_2_bg_url:
      data.home_info_block_2_bg_url ?? DEFAULT_SITE_SETTINGS.home_info_block_2_bg_url,
    home_info_blocks_height_px:
      Number(data.home_info_blocks_height_px) > 0
        ? Number(data.home_info_blocks_height_px)
        : DEFAULT_SITE_SETTINGS.home_info_blocks_height_px,
    home_info_blocks_image_fit:
      data.home_info_blocks_image_fit === "contain"
        ? "contain"
        : DEFAULT_SITE_SETTINGS.home_info_blocks_image_fit,
    primary_color: data.primary_color ?? DEFAULT_SITE_SETTINGS.primary_color,
    header_bg_color: data.header_bg_color ?? DEFAULT_SITE_SETTINGS.header_bg_color,
    header_text_color: data.header_text_color ?? DEFAULT_SITE_SETTINGS.header_text_color,
    background_color: data.background_color ?? DEFAULT_SITE_SETTINGS.background_color,
    text_primary_color: data.text_primary_color ?? DEFAULT_SITE_SETTINGS.text_primary_color,
    action_color: data.action_color ?? DEFAULT_SITE_SETTINGS.action_color,
    button_bg_color: data.button_bg_color ?? DEFAULT_SITE_SETTINGS.button_bg_color,
    button_hover_color:
      data.button_hover_color ?? DEFAULT_SITE_SETTINGS.button_hover_color,
    listing_card_bg_color:
      data.listing_card_bg_color ?? DEFAULT_SITE_SETTINGS.listing_card_bg_color,
    detail_bg_color: data.detail_bg_color ?? DEFAULT_SITE_SETTINGS.detail_bg_color,
    line_color: data.line_color ?? DEFAULT_SITE_SETTINGS.line_color,
    font_body: data.font_body ?? DEFAULT_SITE_SETTINGS.font_body,
    font_headings: data.font_headings ?? DEFAULT_SITE_SETTINGS.font_headings,
    font_header: data.font_header ?? DEFAULT_SITE_SETTINGS.font_header,
    about_text: data.about_text ?? DEFAULT_SITE_SETTINGS.about_text,
    how_it_works_text: data.how_it_works_text ?? DEFAULT_SITE_SETTINGS.how_it_works_text,
    support_phone_1: data.support_phone_1 ?? DEFAULT_SITE_SETTINGS.support_phone_1,
    support_phone_2: data.support_phone_2 ?? DEFAULT_SITE_SETTINGS.support_phone_2,
    support_email: data.support_email ?? DEFAULT_SITE_SETTINGS.support_email,
    social_instagram_url:
      data.social_instagram_url ?? DEFAULT_SITE_SETTINGS.social_instagram_url,
    social_facebook_url:
      data.social_facebook_url ?? DEFAULT_SITE_SETTINGS.social_facebook_url,
    social_youtube_url:
      data.social_youtube_url ?? DEFAULT_SITE_SETTINGS.social_youtube_url,
    payment_provider: data.payment_provider ?? DEFAULT_SITE_SETTINGS.payment_provider,
    payment_link_template:
      data.payment_link_template ?? DEFAULT_SITE_SETTINGS.payment_link_template,
    payment_help_text: data.payment_help_text ?? DEFAULT_SITE_SETTINGS.payment_help_text,
    payment_pix_key: data.payment_pix_key ?? DEFAULT_SITE_SETTINGS.payment_pix_key,
  };
}

export async function saveSiteSettings(settings: SiteSettings) {
  const { error } = await supabase.from("site_settings").upsert(
    {
      id: 1,
      ...settings,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) throw error;
}
