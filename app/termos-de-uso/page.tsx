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
            www.portaldiretoimoveis.com.br
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-700">Última atualização: 03/03/2026</p>

          <div className="mt-8 space-y-7 text-slate-700">
            <section className="!mt-0">
              <h2 className="text-lg font-bold text-slate-950">1. ACEITAÇÃO DOS TERMOS</h2>
              <p className="mt-2 text-sm leading-7">
                Ao acessar, cadastrar-se ou utilizar o PortalDiretoImoveis.com.br (“Plataforma”),
                o Usuário declara que leu, compreendeu e concorda integralmente com estes Termos.
              </p>
              <p className="mt-2 text-sm leading-7">
                O uso da Plataforma implica aceitação plena e irrestrita das disposições aqui previstas.
              </p>
            </section>

            <section className="!mt-0">
              <h2 className="text-lg font-bold text-slate-950">2. DECLARAÇÃO DE MAIORIDADE E CAPACIDADE</h2>
              <p className="mt-2 text-sm leading-7">
                O Usuário declara ser maior de 18 (dezoito) anos e plenamente capaz para celebrar contratos.
              </p>
              <p className="mt-2 text-sm leading-7">
                Caso o acesso seja realizado por menor, este declara estar devidamente assistido
                ou representado por responsável legal.
              </p>
            </section>

            <section className="!mt-0">
              <h2 className="text-lg font-bold text-slate-950">3. OBJETO DA PLATAFORMA</h2>
              <p className="mt-2 text-sm leading-7">
                A Plataforma consiste exclusivamente em ambiente digital destinado à divulgação de
                anúncios imobiliários.
              </p>
              <p className="mt-2 text-sm leading-7">O PortalDiretoImoveis.com.br:</p>
              <ul className="mt-2 list-disc space-y-1 pl-6 text-sm leading-7">
                <li>Não é imobiliária</li>
                <li>Não é corretora</li>
                <li>Não intermedia negociações</li>
                <li>Não participa de contratos</li>
                <li>Não recebe pagamentos</li>
                <li>Não atua como garantidor de transações</li>
              </ul>
              <p className="mt-2 text-sm leading-7">
                A Plataforma apenas disponibiliza espaço digital para publicação de anúncios.
              </p>
            </section>

            <section className="!mt-0">
              <h2 className="text-lg font-bold text-slate-950">4. AUSÊNCIA DE INTERMEDIAÇÃO</h2>
              <p className="mt-2 text-sm leading-7">
                Toda negociação ocorre exclusivamente entre anunciante e interessado.
              </p>
              <p className="mt-2 text-sm leading-7">A Plataforma:</p>
              <ul className="mt-2 list-disc space-y-1 pl-6 text-sm leading-7">
                <li>Não valida documentação</li>
                <li>Não confirma titularidade</li>
                <li>Não verifica veracidade das informações</li>
                <li>Não garante pagamento</li>
                <li>Não participa de tratativas</li>
              </ul>
              <p className="mt-2 text-sm leading-7">
                A responsabilidade integral pelas negociações é das partes envolvidas.
              </p>
            </section>

            <section className="!mt-0">
              <h2 className="text-lg font-bold text-slate-950">5. RESPONSABILIDADE DO ANUNCIANTE</h2>
              <p className="mt-2 text-sm leading-7">
                O anunciante declara:
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-6 text-sm leading-7">
                <li>Ser proprietário ou possuir autorização válida</li>
                <li>Que as informações são verdadeiras</li>
                <li>Que o imóvel está regular</li>
              </ul>
              <p className="mt-2 text-sm leading-7">
                O anunciante assume responsabilidade civil e criminal por qualquer informação falsa,
                omissão ou fraude.
              </p>
            </section>

            <section className="!mt-0">
              <h2 className="text-lg font-bold text-slate-950">6. RESPONSABILIDADE DO INTERESSADO</h2>
              <p className="mt-2 text-sm leading-7">
                O interessado é responsável por:
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-6 text-sm leading-7">
                <li>Verificar documentação</li>
                <li>Confirmar identidade</li>
                <li>Formalizar contrato próprio</li>
                <li>Avaliar riscos</li>
              </ul>
              <p className="mt-2 text-sm leading-7">
                A Plataforma recomenda assessoria jurídica independente.
              </p>
            </section>

            <section className="!mt-0">
              <h2 className="text-lg font-bold text-slate-950">7. LIMITAÇÃO DE RESPONSABILIDADE</h2>
              <p className="mt-2 text-sm leading-7">
                A Plataforma não se responsabiliza por:
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-6 text-sm leading-7">
                <li>Fraudes</li>
                <li>Golpes</li>
                <li>Inadimplemento</li>
                <li>Vícios ocultos</li>
                <li>Problemas estruturais</li>
                <li>Perdas financeiras</li>
                <li>Danos morais ou materiais</li>
              </ul>
              <p className="mt-2 text-sm leading-7">
                Em nenhuma hipótese a responsabilidade da Plataforma ultrapassará o valor
                eventualmente pago pelo anúncio.
              </p>
              <p className="mt-2 text-sm leading-7">
                Ficam excluídos lucros cessantes, danos indiretos e perdas futuras.
              </p>
            </section>

            <section className="!mt-0">
              <h2 className="text-lg font-bold text-slate-950">8. CLÁUSULA DE RENÚNCIA EXPRESSA</h2>
              <p className="mt-2 text-sm leading-7">
                O Usuário declara ciência de que utiliza a Plataforma por sua conta e risco,
                renunciando expressamente a qualquer pretensão de responsabilização do
                PortalDiretoImoveis.com.br por danos decorrentes de negociações realizadas fora do
                ambiente tecnológico da Plataforma.
              </p>
            </section>

            <section className="!mt-0">
              <h2 className="text-lg font-bold text-slate-950">9. CLÁUSULA DE INDENIZAÇÃO</h2>
              <p className="mt-2 text-sm leading-7">
                O Usuário concorda em indenizar e manter o PortalDiretoImoveis.com.br isento de
                quaisquer prejuízos, condenações, despesas, custas e honorários advocatícios
                decorrentes de:
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-6 text-sm leading-7">
                <li>Anúncios publicados</li>
                <li>Informações fornecidas</li>
                <li>Negociações realizadas</li>
                <li>Descumprimento destes Termos</li>
              </ul>
              <p className="mt-2 text-sm leading-7">
                Caso a Plataforma seja acionada judicialmente por ato do Usuário, este
                compromete-se a assumir integralmente a responsabilidade.
              </p>
            </section>

            <section className="!mt-0">
              <h2 className="text-lg font-bold text-slate-950">10. CLÁUSULA DE COOPERAÇÃO EM INVESTIGAÇÕES</h2>
              <p className="mt-2 text-sm leading-7">
                A Plataforma poderá fornecer dados cadastrais às autoridades competentes em caso de
                indícios de fraude, ilícito civil ou penal, independentemente de notificação prévia
                ao usuário, nos termos da legislação vigente.
              </p>
            </section>

            <section className="!mt-0">
              <h2 className="text-lg font-bold text-slate-950">11. CLÁUSULA DE SUSPENSÃO IMEDIATA</h2>
              <p className="mt-2 text-sm leading-7">
                A Plataforma poderá suspender, bloquear ou excluir usuários a qualquer tempo, sem
                aviso prévio, em caso de suspeita de irregularidade, fraude, descumprimento destes
                Termos ou risco à segurança da Plataforma.
              </p>
            </section>

            <section className="!mt-0">
              <h2 className="text-lg font-bold text-slate-950">12. COOKIES E PROTEÇÃO DE DADOS</h2>
              <p className="mt-2 text-sm leading-7">
                A Plataforma utiliza cookies para melhoria de navegação e segurança.
              </p>
              <p className="mt-2 text-sm leading-7">
                O tratamento de dados observa a Lei Geral de Proteção de Dados e o Marco Civil da Internet.
              </p>
            </section>

            <section className="!mt-0">
              <h2 className="text-lg font-bold text-slate-950">13. AUSÊNCIA DE VÍNCULO</h2>
              <p className="mt-2 text-sm leading-7">
                O uso da Plataforma não cria qualquer vínculo:
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-6 text-sm leading-7">
                <li>Trabalhista</li>
                <li>Societário</li>
                <li>Associativo</li>
                <li>Representativo</li>
              </ul>
              <p className="mt-2 text-sm leading-7">
                Entre a Plataforma e seus Usuários.
              </p>
            </section>

            <section className="!mt-0">
              <h2 className="text-lg font-bold text-slate-950">14. ALTERAÇÕES</h2>
              <p className="mt-2 text-sm leading-7">
                A Plataforma poderá alterar estes Termos a qualquer tempo, sendo responsabilidade do
                Usuário revisá-los periodicamente.
              </p>
            </section>

            <section className="!mt-0">
              <h2 className="text-lg font-bold text-slate-950">15. FORO E RESOLUÇÃO DE CONFLITOS</h2>
              <p className="mt-2 text-sm leading-7">
                Fica eleito o Foro da Comarca de São Bernardo do Campo/SP, com renúncia a qualquer
                outro, por mais privilegiado que seja.
              </p>
              <p className="mt-2 text-sm leading-7">
                As partes poderão, de comum acordo, optar por arbitragem nos termos da Lei nº 9.307/96.
              </p>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
