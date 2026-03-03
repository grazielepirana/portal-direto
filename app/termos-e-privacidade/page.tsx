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
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">Política de Privacidade</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">www.portaldiretoimoveis.com.br</p>
          <p className="mt-1 text-sm font-semibold text-slate-700">Última atualização: 03/03/2026</p>

          <div className="mt-8 space-y-7 text-slate-700">
            <section className="!mt-0">
              <h2 className="text-lg font-bold text-slate-950">1. INTRODUÇÃO</h2>
              <p className="mt-2 text-sm leading-7">
                O PortalDiretoImoveis.com.br (“Plataforma”) respeita a privacidade e a proteção de
                dados pessoais de seus usuários, atuando em conformidade com a:
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-6 text-sm leading-7">
                <li>Lei Geral de Proteção de Dados</li>
                <li>Marco Civil da Internet</li>
                <li>Constituição Federal do Brasil</li>
              </ul>
              <p className="mt-2 text-sm leading-7">
                Ao utilizar a Plataforma, o usuário declara ciência e concordância com esta Política.
              </p>
            </section>

            <section className="!mt-0">
              <h2 className="text-lg font-bold text-slate-950">2. CONTROLADOR DOS DADOS</h2>
              <p className="mt-2 text-sm leading-7">
                O controlador dos dados pessoais é o responsável legal pelo
                PortalDiretoImoveis.com.br, que define as finalidades e meios de tratamento das
                informações coletadas.
              </p>
            </section>

            <section className="!mt-0">
              <h2 className="text-lg font-bold text-slate-950">3. DADOS COLETADOS</h2>
              <p className="mt-2 text-sm leading-7">A Plataforma poderá coletar:</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">3.1 Dados fornecidos pelo usuário:</p>
              <ul className="mt-2 list-disc space-y-1 pl-6 text-sm leading-7">
                <li>Nome completo</li>
                <li>CPF ou CNPJ</li>
                <li>E-mail</li>
                <li>Telefone</li>
                <li>Endereço</li>
                <li>Informações inseridas em anúncios</li>
                <li>Fotografias e documentos enviados</li>
              </ul>
              <p className="mt-3 text-sm font-semibold text-slate-900">3.2 Dados coletados automaticamente:</p>
              <ul className="mt-2 list-disc space-y-1 pl-6 text-sm leading-7">
                <li>Endereço IP</li>
                <li>Data e hora de acesso</li>
                <li>Tipo de navegador</li>
                <li>Dispositivo utilizado</li>
                <li>Dados de geolocalização aproximada</li>
                <li>Cookies e identificadores digitais</li>
              </ul>
            </section>

            <section className="!mt-0">
              <h2 className="text-lg font-bold text-slate-950">4. FINALIDADE DO TRATAMENTO</h2>
              <p className="mt-2 text-sm leading-7">Os dados são tratados para:</p>
              <ul className="mt-2 list-disc space-y-1 pl-6 text-sm leading-7">
                <li>Permitir cadastro e autenticação</li>
                <li>Publicação e gestão de anúncios</li>
                <li>Contato entre usuários</li>
                <li>Prevenção e detecção de fraudes</li>
                <li>Cumprimento de obrigações legais</li>
                <li>Defesa em processos judiciais</li>
                <li>Melhoria da experiência do usuário</li>
              </ul>
            </section>

            <section className="!mt-0">
              <h2 className="text-lg font-bold text-slate-950">5. BASE LEGAL DO TRATAMENTO</h2>
              <p className="mt-2 text-sm leading-7">O tratamento poderá ocorrer com fundamento em:</p>
              <ul className="mt-2 list-disc space-y-1 pl-6 text-sm leading-7">
                <li>Consentimento do titular</li>
                <li>Execução de contrato</li>
                <li>Cumprimento de obrigação legal</li>
                <li>Exercício regular de direitos em processo judicial</li>
                <li>Legítimo interesse da Plataforma</li>
              </ul>
            </section>

            <section className="!mt-0">
              <h2 className="text-lg font-bold text-slate-950">6. COMPARTILHAMENTO DE DADOS</h2>
              <p className="mt-2 text-sm leading-7">Os dados poderão ser compartilhados:</p>
              <ul className="mt-2 list-disc space-y-1 pl-6 text-sm leading-7">
                <li>Com autoridades públicas mediante requisição legal</li>
                <li>Para cumprimento de ordem judicial</li>
                <li>Para defesa da Plataforma em processos</li>
                <li>Com provedores de hospedagem e tecnologia</li>
              </ul>
              <p className="mt-2 text-sm leading-7">
                A Plataforma não comercializa dados pessoais.
              </p>
            </section>

            <section className="!mt-0">
              <h2 className="text-lg font-bold text-slate-950">7. COOKIES E TECNOLOGIAS DE MONITORAMENTO</h2>
              <p className="mt-2 text-sm leading-7">A Plataforma utiliza cookies para:</p>
              <ul className="mt-2 list-disc space-y-1 pl-6 text-sm leading-7">
                <li>Segurança</li>
                <li>Estatísticas de acesso</li>
                <li>Melhoria de desempenho</li>
                <li>Personalização de navegação</li>
              </ul>
              <p className="mt-2 text-sm leading-7">
                O usuário pode desativar cookies no navegador, ciente de que determinadas
                funcionalidades poderão ser limitadas.
              </p>
            </section>

            <section className="!mt-0">
              <h2 className="text-lg font-bold text-slate-950">8. ARMAZENAMENTO E PRAZO DE RETENÇÃO</h2>
              <p className="mt-2 text-sm leading-7">Os dados serão armazenados:</p>
              <ul className="mt-2 list-disc space-y-1 pl-6 text-sm leading-7">
                <li>Pelo tempo necessário para cumprir sua finalidade</li>
                <li>Pelo prazo exigido por obrigação legal</li>
                <li>Pelo período necessário para defesa em eventual processo</li>
              </ul>
              <p className="mt-2 text-sm leading-7">
                Após esse período, poderão ser eliminados ou anonimizados.
              </p>
            </section>

            <section className="!mt-0">
              <h2 className="text-lg font-bold text-slate-950">9. DIREITOS DO TITULAR</h2>
              <p className="mt-2 text-sm leading-7">
                Nos termos da LGPD, o titular poderá solicitar:
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-6 text-sm leading-7">
                <li>Confirmação da existência de tratamento</li>
                <li>Acesso aos dados</li>
                <li>Correção de dados incompletos</li>
                <li>Anonimização ou exclusão</li>
                <li>Revogação de consentimento</li>
              </ul>
              <p className="mt-2 text-sm leading-7">
                Solicitações deverão ser feitas pelo canal oficial da Plataforma.
              </p>
            </section>

            <section className="!mt-0">
              <h2 className="text-lg font-bold text-slate-950">10. MEDIDAS DE SEGURANÇA</h2>
              <p className="mt-2 text-sm leading-7">
                A Plataforma adota medidas técnicas e administrativas razoáveis para proteção dos dados.
              </p>
              <p className="mt-2 text-sm leading-7">
                Contudo, o usuário declara ciência de que nenhum sistema é absolutamente seguro
                contra ataques externos, isentando a Plataforma de responsabilidade por eventos
                decorrentes de atos de terceiros, como hackers ou falhas sistêmicas imprevisíveis.
              </p>
            </section>

            <section className="!mt-0">
              <h2 className="text-lg font-bold text-slate-950">11. RESPONSABILIDADE DO USUÁRIO</h2>
              <p className="mt-2 text-sm leading-7">O usuário é responsável por:</p>
              <ul className="mt-2 list-disc space-y-1 pl-6 text-sm leading-7">
                <li>Manter confidencialidade de suas credenciais</li>
                <li>Não compartilhar senhas</li>
                <li>Inserir apenas dados verídicos</li>
              </ul>
              <p className="mt-2 text-sm leading-7">
                A Plataforma não se responsabiliza por uso indevido de conta por terceiros quando
                decorrente de negligência do usuário.
              </p>
            </section>

            <section className="!mt-0">
              <h2 className="text-lg font-bold text-slate-950">12. TRANSFERÊNCIA INTERNACIONAL</h2>
              <p className="mt-2 text-sm leading-7">
                Caso haja uso de servidores ou serviços tecnológicos hospedados no exterior, o
                usuário declara ciência de que poderá ocorrer transferência internacional de dados,
                nos termos permitidos pela LGPD.
              </p>
            </section>

            <section className="!mt-0">
              <h2 className="text-lg font-bold text-slate-950">13. ALTERAÇÕES</h2>
              <p className="mt-2 text-sm leading-7">
                A Plataforma poderá alterar esta Política a qualquer momento, sendo responsabilidade
                do usuário revisá-la periodicamente.
              </p>
            </section>

            <section className="!mt-0">
              <h2 className="text-lg font-bold text-slate-950">14. FORO</h2>
              <p className="mt-2 text-sm leading-7">
                Fica eleito o Foro da Comarca de São Bernardo do Campo/SP para dirimir quaisquer
                controvérsias decorrentes desta Política, com renúncia a qualquer outro.
              </p>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
