import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Prevenção a Fraudes | Portal Direto",
  description:
    "Diretrizes de prevenção a fraudes e ilícitos do PortalDiretoImoveis.com.br.",
};

export default function AntiFraudePage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">
          POLÍTICA DE PREVENÇÃO A FRAUDES E ILÍCITOS
        </h1>

        <div className="mt-6 space-y-4 text-sm leading-7 text-slate-700">
          <p>A Plataforma adota medidas para prevenir:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>Fraudes</li>
            <li>Estelionato</li>
            <li>Lavagem de dinheiro</li>
            <li>Uso de documentos falsos</li>
          </ul>

          <p>A Plataforma poderá:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>Solicitar documentos adicionais</li>
            <li>Suspender contas</li>
            <li>Cancelar anúncios</li>
            <li>Reportar atividades suspeitas às autoridades</li>
          </ul>
        </div>
      </div>
    </main>
  );
}

