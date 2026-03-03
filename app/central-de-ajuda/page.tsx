"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { DEFAULT_SITE_SETTINGS, loadSiteSettings, type SiteSettings } from "../../lib/site-settings";

const DEFAULT_SUPPORT_EMAIL = "contato@portaldiretoimoveis.com.br";

const FAQ_ITEMS = [
  {
    question: "Como cadastrar um imóvel?",
    answer:
      "Acesse a opção de cadastro, preencha os dados obrigatórios, adicione fotos e publique o anúncio após escolher o plano.",
  },
  {
    question: "Como editar meu anúncio?",
    answer:
      "Entre em 'Meus imóveis', selecione o anúncio e clique em editar para atualizar descrição, fotos, valores e demais campos.",
  },
  {
    question: "Como funciona o destaque?",
    answer:
      "Anúncios em destaque recebem mais visibilidade na vitrine principal e podem aparecer antes dos anúncios padrão.",
  },
  {
    question: "Como falar com o proprietário?",
    answer:
      "Abra o anúncio desejado e use o botão de mensagem para iniciar uma conversa direta com o anunciante.",
  },
  {
    question: "Como excluir minha conta?",
    answer:
      "Vá em Configurações > Conta (zona de perigo), confirme a exclusão e siga as instruções na tela.",
  },
  {
    question: "Como denunciar um anúncio?",
    answer:
      "No anúncio ou no chat, use a opção de denúncia/bloqueio para enviar o caso para análise da equipe de suporte.",
  },
];

export default function CentralDeAjudaPage() {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState<string | null>(null);

  useEffect(() => {
    loadSiteSettings()
      .then((loaded) => setSettings(loaded))
      .catch(() => setSettings(DEFAULT_SITE_SETTINGS));
  }, []);

  const supportEmail = useMemo(
    () => settings.support_email?.trim() || DEFAULT_SUPPORT_EMAIL,
    [settings.support_email]
  );

  async function sendEmail(e: FormEvent) {
    e.preventDefault();
    setSendMsg(null);

    if (!subject.trim() || !message.trim()) {
      setSendMsg("Preencha assunto e mensagem.");
      return;
    }

    try {
      setSending(true);
      const response = await fetch("/api/support/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          message: message.trim(),
        }),
      });

      const result = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Não foi possível enviar agora.");
      }

      setSubject("");
      setMessage("");
      setSendMsg("✅ Mensagem enviada com sucesso para o suporte.");
    } catch (err: unknown) {
      setSendMsg(err instanceof Error ? err.message : "Erro ao enviar mensagem.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto w-full max-w-6xl">
        <section className="!mt-0 relative overflow-hidden rounded-3xl border border-slate-200">
          {settings.hero_image_url ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={settings.hero_image_url}
                alt="Capa da central de ajuda"
                className="h-[190px] w-full object-cover md:h-[210px]"
                style={{
                  objectPosition: `${settings.hero_image_position_x}% ${settings.hero_image_position_y}%`,
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/65 via-slate-900/45 to-slate-900/15" />
            </>
          ) : (
            <div className="h-[190px] w-full bg-gradient-to-r from-slate-900 to-slate-700 md:h-[210px]" />
          )}

          <div className="absolute inset-0 flex items-end p-6 md:p-8">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">Central de ajuda</h1>
              <p className="mt-2 text-sm text-slate-100 md:text-base">
                Fale com a gente ou encontre respostas rápidas.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <article className="!mt-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <h2 className="text-2xl font-bold text-slate-950">Enviar mensagem</h2>
            <p className="mt-1 text-sm text-slate-600">
              Descreva sua dúvida e nossa equipe retorna no menor prazo possível.
            </p>

            <form onSubmit={sendEmail} className="mt-6 space-y-4">
              <div>
                <label htmlFor="support-subject" className="mb-2 block text-sm font-semibold text-slate-800">
                  Assunto
                </label>
                <input
                  id="support-subject"
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  placeholder="Ex.: Dúvida sobre anúncio"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="support-message" className="mb-2 block text-sm font-semibold text-slate-800">
                  Mensagem
                </label>
                <textarea
                  id="support-message"
                  className="min-h-40 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  placeholder="Conte com detalhes o que aconteceu para ajudarmos mais rápido."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <p className="mt-1 text-xs text-slate-500">{message.length} caracteres</p>
              </div>

              <div className="flex flex-col items-stretch gap-2 sm:items-end">
                <button
                  type="submit"
                  disabled={sending}
                  className="cta-primary h-11 w-full rounded-xl px-5 text-sm font-semibold sm:w-auto disabled:opacity-50"
                >
                  {sending ? "Enviando..." : "Enviar e-mail"}
                </button>
                <p className="text-xs text-slate-500">Respondemos em até 24h úteis.</p>
              </div>

              {sendMsg ? (
                <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {sendMsg}
                </p>
              ) : null}
            </form>
          </article>

          <aside className="!mt-0 space-y-4">
            <section className="!mt-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-bold text-slate-900">Atalhos</h3>
              <div className="mt-3 space-y-2">
                <Link href="/anunciar" className="block rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Como anunciar
                </Link>
                <Link href="/planos" className="block rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Planos e pagamentos
                </Link>
                <Link href="/chat" className="block rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Mensagens
                </Link>
                <button
                  type="button"
                  disabled
                  className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-left text-sm font-semibold text-slate-400"
                >
                  <span>Segurança</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">
                    Em breve
                  </span>
                </button>
                <Link href="/configuracoes" className="block rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Conta e configurações
                </Link>
              </div>
            </section>

            <section className="!mt-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-bold text-slate-900">Contato</h3>

              <div className="mt-3 space-y-3 text-sm text-slate-700">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">E-mail</p>
                  <a href={`mailto:${supportEmail}`} className="font-semibold text-slate-800 hover:text-red-600 break-all">
                    {supportEmail}
                  </a>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Horário de atendimento</p>
                  <p className="mt-1 text-sm text-slate-700">Segunda a sexta, 9h às 18h</p>
                  <p className="mt-2 text-xs text-slate-500">Tempo médio de resposta: até 24h úteis</p>
                </div>
              </div>
            </section>
          </aside>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <h2 className="text-2xl font-bold text-slate-950">Perguntas frequentes</h2>
          <p className="mt-1 text-sm text-slate-600">Respostas rápidas para as dúvidas mais comuns.</p>

          <div className="mt-5 space-y-2">
            {FAQ_ITEMS.map((item, index) => {
              const isOpen = openFaq === index;
              return (
                <div key={item.question} className="rounded-xl border border-slate-200 bg-white">
                  <button
                    type="button"
                    onClick={() => setOpenFaq((prev) => (prev === index ? null : index))}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${index}`}
                  >
                    <span className="text-sm font-semibold text-slate-900">{item.question}</span>
                    <span className="text-slate-500" aria-hidden>
                      {isOpen ? "−" : "+"}
                    </span>
                  </button>
                  {isOpen ? (
                    <div id={`faq-panel-${index}`} className="border-t border-slate-100 px-4 py-3 text-sm leading-7 text-slate-700">
                      {item.answer}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
