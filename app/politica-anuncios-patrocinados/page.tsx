import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Anúncios Patrocinados | Portal Direto",
  description:
    "Política de anúncios em destaque do PortalDiretoImoveis.com.br: regras de visibilidade, limitações e reembolso.",
};

export default function PoliticaAnunciosPatrocinadosPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">
          POLÍTICA DE ANÚNCIOS PATROCINADOS – ANÚNCIOS EM DESTAQUE
        </h1>

        <div className="mt-6 space-y-4 text-sm leading-7 text-slate-700">
          <p>
            O PortalDiretoImoveis.com.br poderá oferecer planos pagos para destaque de anúncios.
          </p>
          <p>O pagamento refere-se exclusivamente à maior visibilidade digital.</p>
          <p>A Plataforma:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>Não garante venda</li>
            <li>Não garante contatos</li>
            <li>Não garante retorno financeiro</li>
          </ul>
          <p>O valor pago refere-se apenas à exposição.</p>
          <p>
            Não há reembolso após ativação do destaque, salvo falha técnica comprovada.
          </p>
        </div>
      </div>
    </main>
  );
}

