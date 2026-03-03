import Link from "next/link";

export default function TermsOfUsePage() {
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
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">Termos de Uso</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Estes termos definem as regras para uso do Portal Direto por anunciantes e interessados
            na negociação de imóveis.
          </p>

          <div className="mt-8 space-y-7 text-slate-700">
            <section className="!mt-0">
              <h2 className="text-lg font-bold text-slate-950">1. Aceitação dos termos</h2>
              <p className="mt-2 text-sm leading-7">
                Ao criar conta e usar a plataforma, você declara que leu e concorda com estes
                Termos de Uso e com a Política de Privacidade.
              </p>
            </section>

            <section className="!mt-0">
              <h2 className="text-lg font-bold text-slate-950">2. Elegibilidade</h2>
              <p className="mt-2 text-sm leading-7">
                O uso da plataforma é permitido somente para maiores de 18 anos e pessoas com
                capacidade legal para realizar negociações.
              </p>
            </section>

            <section className="!mt-0">
              <h2 className="text-lg font-bold text-slate-950">3. Responsabilidade do usuário</h2>
              <p className="mt-2 text-sm leading-7">
                O usuário é responsável pela veracidade das informações cadastradas e dos anúncios
                publicados, incluindo fotos, preços, descrição e localização do imóvel.
              </p>
            </section>

            <section className="!mt-0">
              <h2 className="text-lg font-bold text-slate-950">4. Condutas proibidas</h2>
              <p className="mt-2 text-sm leading-7">
                É proibido publicar conteúdo falso, ofensivo, ilegal, duplicado em excesso ou que
                viole direitos de terceiros. Também é proibido usar a plataforma para fraude.
              </p>
            </section>

            <section className="!mt-0">
              <h2 className="text-lg font-bold text-slate-950">5. Limitação de responsabilidade</h2>
              <p className="mt-2 text-sm leading-7">
                O Portal Direto atua como plataforma de conexão e não participa da negociação final,
                assinatura de contrato ou transferência de propriedade entre as partes.
              </p>
            </section>

            <section className="!mt-0">
              <h2 className="text-lg font-bold text-slate-950">6. Suspensão e remoção</h2>
              <p className="mt-2 text-sm leading-7">
                Contas e anúncios podem ser suspensos ou removidos em caso de violação destes
                termos, suspeita de fraude ou determinação legal.
              </p>
            </section>

            <section className="!mt-0">
              <h2 className="text-lg font-bold text-slate-950">7. Atualizações dos termos</h2>
              <p className="mt-2 text-sm leading-7">
                Estes termos podem ser atualizados periodicamente. A versão mais recente ficará
                disponível nesta página.
              </p>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

