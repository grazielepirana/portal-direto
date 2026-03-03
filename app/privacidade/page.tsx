import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Política de Privacidade | Portal Direto",
  description: "Página de política de privacidade do PortalDiretoImoveis.com.br.",
};

export default function PrivacidadePage() {
  redirect("/termos-e-privacidade");
}
