import type { Metadata } from "next";
import CanalDeDenunciasClient from "./CanalDeDenunciasClient";

export const metadata: Metadata = {
  title: "Canal de Denúncias | Portal Direto",
  description:
    "Canal de denúncias para anúncios suspeitos, tentativas de golpe e conteúdo irregular.",
};

export default function CanalDeDenunciasPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">CANAL DE DENÚNCIAS</h1>

        <div className="mt-4 space-y-2 text-sm leading-7 text-slate-700">
          <p>Usuários podem reportar:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>Anúncios suspeitos</li>
            <li>Tentativas de golpe</li>
            <li>Conteúdo irregular</li>
          </ul>
          <p>
            A Plataforma poderá bloquear preventivamente o usuário investigado.
          </p>
        </div>

        <CanalDeDenunciasClient />
      </div>
    </main>
  );
}

