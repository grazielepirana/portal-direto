import Link from "next/link";

export default function PoliticaDeCookiesPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto w-full max-w-4xl">
        <Link
          href="/configuracoes#ajuda"
          className="inline-flex items-center text-sm font-semibold text-slate-700 hover:text-slate-950"
        >
          ← Voltar para configurações
        </Link>

        <section className="!mt-0 mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">
            Política de Cookies
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">PortalDiretoImoveis.com.br</p>
          <p className="mt-1 text-sm font-semibold text-slate-700">Atualização: 03/03/2026</p>

          <div className="mt-8 space-y-7 text-slate-700">
            <section className="!mt-0">
              <h2 className="text-lg font-bold text-slate-950">1. O QUE SÃO COOKIES</h2>
              <p className="mt-2 text-sm leading-7">
                Cookies são pequenos arquivos armazenados no dispositivo do usuário para melhorar a
                navegação.
              </p>
            </section>

            <section className="!mt-0">
              <h2 className="text-lg font-bold text-slate-950">2. TIPOS UTILIZADOS</h2>
              <ul className="mt-2 list-disc space-y-1 pl-6 text-sm leading-7">
                <li>Cookies essenciais – funcionamento da plataforma</li>
                <li>Cookies de desempenho – estatísticas e melhorias</li>
                <li>Cookies de segurança – prevenção de fraudes</li>
                <li>Cookies de marketing – apenas com consentimento</li>
              </ul>
            </section>

            <section className="!mt-0">
              <h2 className="text-lg font-bold text-slate-950">3. CONTROLE</h2>
              <p className="mt-2 text-sm leading-7">
                O usuário pode configurar ou excluir cookies no navegador. A desativação pode
                afetar funcionalidades.
              </p>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

