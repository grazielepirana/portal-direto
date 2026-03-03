import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Política de Cookies | Portal Direto",
  description: "Página de política de cookies do PortalDiretoImoveis.com.br.",
};

export default function CookiesPage() {
  redirect("/politica-de-cookies");
}
