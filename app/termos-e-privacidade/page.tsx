import Link from "next/link";

export default function TermsAndPrivacyPage() {
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
            Política de Privacidade
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Este documento explica como seus dados são coletados, usados e protegidos dentro do
            Portal Direto.
          </p>

          <div className="mt-8 space-y-7 text-slate-700">
            <section className="!mt-0">
              <h2 className="text-lg font-bold text-slate-950">1. Coleta de dados</h2>
              <p className="mt-2 text-sm leading-7">
                Coletamos dados fornecidos por você no cadastro e uso da plataforma, como nome,
                e-mail, dados de anúncios, mensagens no chat e preferências de navegação.
              </p>
            </section>

            <section className="!mt-0">
              <h2 className="text-lg font-bold text-slate-950">2. Uso das informações</h2>
              <p className="mt-2 text-sm leading-7">
                Utilizamos os dados para autenticação, publicação de anúncios, funcionamento do
                chat, segurança da conta e melhoria da experiência no site.
              </p>
            </section>

            <section className="!mt-0">
              <h2 className="text-lg font-bold text-slate-950">3. Compartilhamento</h2>
              <p className="mt-2 text-sm leading-7">
                Não comercializamos seus dados pessoais. As informações podem ser compartilhadas
                apenas quando necessário para operação do serviço, cumprimento legal ou segurança.
              </p>
            </section>

            <section className="!mt-0">
              <h2 className="text-lg font-bold text-slate-950">4. Cookies e tecnologias</h2>
              <p className="mt-2 text-sm leading-7">
                Utilizamos cookies para manter sessões, melhorar funcionalidades e analisar uso do
                site conforme suas preferências de consentimento.
              </p>
            </section>

            <section className="!mt-0">
              <h2 className="text-lg font-bold text-slate-950">5. Seus direitos</h2>
              <p className="mt-2 text-sm leading-7">
                Você pode solicitar atualização ou exclusão de dados pessoais da conta, de acordo
                com a legislação aplicável e os recursos disponíveis na plataforma.
              </p>
            </section>

            <section className="!mt-0">
              <h2 className="text-lg font-bold text-slate-950">6. Atualizações desta política</h2>
              <p className="mt-2 text-sm leading-7">
                Esta política pode ser atualizada para refletir melhorias no serviço ou exigências
                legais. A versão mais recente ficará sempre disponível nesta página.
              </p>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
