import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aviso Anti-Golpe | Portal Direto",
  description: "Avisos e orientações de segurança contra golpes no PortalDiretoImoveis.com.br.",
};

export default function AvisoAntiGolpePage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">Aviso Anti-Golpe</h1>
        <div className="mt-6 space-y-4 text-sm leading-7 text-slate-700">
          <p>
            Para sua segurança, desconfie de ofertas muito abaixo do mercado e nunca faça pagamentos
            antecipados sem validar documentação e titularidade.
          </p>
          <ul className="list-disc space-y-1 pl-6">
            <li>Confirme identidade do anunciante e dados do imóvel.</li>
            <li>Solicite e verifique documentos antes de qualquer proposta.</li>
            <li>Prefira registro formal das conversas dentro da plataforma.</li>
            <li>Evite transferências sem contrato e sem checagem jurídica.</li>
          </ul>
          <p>
            Ao identificar comportamento suspeito, use imediatamente o{" "}
            <a href="/canal-de-denuncias" className="font-semibold underline">
              Canal de Denúncias
            </a>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
