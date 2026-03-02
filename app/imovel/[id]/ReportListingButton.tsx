"use client";

import { useState } from "react";

type ReportListingButtonProps = {
  listingId: string;
  listingTitle: string;
};

const REASONS = [
  "Informações falsas ou enganosas",
  "Preço suspeito ou golpe",
  "Imóvel já não está disponível",
  "Conteúdo inadequado",
  "Duplicado",
  "Outro motivo",
];

export default function ReportListingButton({ listingId, listingTitle }: ReportListingButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState("");
  const [sent, setSent] = useState(false);

  function closeModal() {
    setOpen(false);
    setDetails("");
    setSent(false);
    setReason(REASONS[0]);
  }

  function handleSubmit() {
    setSent(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50"
        aria-label="Denunciar anúncio"
        title="Denunciar anúncio"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
          <path d="m10.29 3.86-7 12.13A2 2 0 0 0 5 19h14a2 2 0 0 0 1.71-3.01l-7-12.13a2 2 0 0 0-3.42 0Z" />
        </svg>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/45 p-4"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-slate-950">Denunciar imóvel</h3>
            <p className="mt-1 text-sm text-slate-600">
              Escolha o motivo da denúncia para ajudarmos na análise.
            </p>

            <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
              Anúncio: <span className="font-semibold">{listingTitle}</span> ({listingId})
            </p>

            {sent ? (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                Denúncia enviada com sucesso. Nossa equipe vai analisar este anúncio.
              </div>
            ) : (
              <>
                <div className="mt-4 space-y-2">
                  {REASONS.map((item) => (
                    <label
                      key={item}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800"
                    >
                      <input
                        type="radio"
                        name="listing-report-reason"
                        checked={reason === item}
                        onChange={() => setReason(item)}
                      />
                      {item}
                    </label>
                  ))}
                </div>

                <textarea
                  value={details}
                  onChange={(event) => setDetails(event.target.value)}
                  className="mt-4 min-h-24 w-full rounded-xl border border-slate-300 p-3 text-sm text-slate-900"
                  placeholder="Detalhes adicionais (opcional)"
                />
              </>
            )}

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                className="h-10 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Fechar
              </button>
              {!sent ? (
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="cta-primary h-10 rounded-xl px-4 text-sm font-semibold"
                >
                  Enviar denúncia
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
