import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Termos de Uso | Portal Direto",
  description: "Página de termos de uso do PortalDiretoImoveis.com.br.",
};

export default function TermosPage() {
  redirect("/termos-de-uso");
}
