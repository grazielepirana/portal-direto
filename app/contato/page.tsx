import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Fale Conosco | Portal Direto",
  description: "Canal de contato do PortalDiretoImoveis.com.br.",
};

export default function ContatoPage() {
  redirect("/central-de-ajuda");
}
