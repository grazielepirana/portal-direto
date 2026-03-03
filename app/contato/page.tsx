import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fale Conosco | Portal Direto",
  description: "Canal de contato do PortalDiretoImoveis.com.br.",
};

export default function ContatoPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">Fale Conosco</h1>
        <p className="mt-4 text-sm leading-7 text-slate-700">Em atualização.</p>
      </div>
    </main>
  );
}

