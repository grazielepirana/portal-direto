"use client";

import type { MouseEvent } from "react";
import AuthButton from "./AuthButton";

function hardNavigate(event: MouseEvent<HTMLAnchorElement>, href: string) {
  event.preventDefault();
  window.location.assign(href);
}

export default function HeaderNav() {
  return (
    <nav className="flex items-center gap-2 sm:gap-3">
      <a
        href="/imoveis?kind=venda"
        onClick={(event) => hardNavigate(event, "/imoveis?kind=venda")}
        className="site-nav-link hidden font-medium md:inline-flex"
      >
        Comprar
      </a>

      <a
        href="/imoveis?kind=locacao"
        onClick={(event) => hardNavigate(event, "/imoveis?kind=locacao")}
        className="site-nav-link hidden font-medium md:inline-flex"
      >
        Alugar
      </a>

      <a
        href="/chat"
        onClick={(event) => hardNavigate(event, "/chat")}
        className="site-nav-link hidden font-medium md:inline-flex"
      >
        Chat
      </a>

      <a
        href="/favoritos"
        onClick={(event) => hardNavigate(event, "/favoritos")}
        className="site-nav-link hidden font-medium md:inline-flex"
      >
        Favoritos
      </a>

      <a
        href="/anunciar"
        onClick={(event) => hardNavigate(event, "/anunciar")}
        className="cta-primary inline-flex h-10 items-center rounded-xl px-3 text-xs font-semibold transition sm:h-auto sm:px-4 sm:py-2 sm:text-sm"
      >
        <span className="sm:hidden">Cadastrar</span>
        <span className="hidden sm:inline">Cadastrar Imóvel</span>
      </a>

      <AuthButton />
    </nav>
  );
}
