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
            Termos e Privacidade
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Este documento resume como o Portal Direto funciona, quais responsabilidades de uso
            você assume ao utilizar a plataforma e como os seus dados são tratados.
          </p>

          <div className="mt-8 space-y-7 text-slate-700">
            <section className="!mt-0">
              <h2 className="text-lg font-bold text-slate-950">1. Uso da plataforma</h2>
              <p className="mt-2 text-sm leading-7">
                O Portal Direto conecta anunciantes e interessados para negociação direta de
                imóveis. O usuário é responsável pela veracidade das informações publicadas,
                incluindo descrição, fotos, localização e valores.
              </p>
            </section>

            <section className="!mt-0">
              <h2 className="text-lg font-bold text-slate-950">2. Responsabilidade sobre anúncios</h2>
              <p className="mt-2 text-sm leading-7">
                Cada anunciante responde pelo conteúdo enviado e pelas condições ofertadas no
                anúncio. O portal atua como intermediador digital e não participa diretamente da
                negociação final, assinatura de contrato ou transferência do imóvel.
              </p>
            </section>

            <section className="!mt-0">
              <h2 className="text-lg font-bold text-slate-950">3. Privacidade e dados</h2>
              <p className="mt-2 text-sm leading-7">
                Utilizamos dados da conta e de uso da plataforma para autenticação, funcionamento
                do chat, segurança e melhoria da experiência. Não divulgamos dados pessoais além do
                necessário para operação das funcionalidades do site.
              </p>
            </section>

            <section className="!mt-0">
              <h2 className="text-lg font-bold text-slate-950">4. Segurança da conta</h2>
              <p className="mt-2 text-sm leading-7">
                Recomendamos manter senha forte, não compartilhar credenciais e encerrar sessão em
                dispositivos públicos. Em caso de acesso suspeito, atualize sua senha nas
                configurações da conta.
              </p>
            </section>

            <section className="!mt-0">
              <h2 className="text-lg font-bold text-slate-950">5. Atualizações deste documento</h2>
              <p className="mt-2 text-sm leading-7">
                Estes termos podem ser atualizados para refletir melhorias na plataforma e
                exigências legais. Sempre que houver mudança relevante, a versão mais recente ficará
                disponível nesta página.
              </p>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
