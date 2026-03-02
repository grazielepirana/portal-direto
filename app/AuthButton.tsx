"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

type MenuItem = {
  type: "link" | "action";
  label: string;
  href?: string;
  icon?: string;
  disabled?: boolean;
  badge?: string;
  onSelect?: () => void | Promise<void>;
};

type MenuSection = {
  title: string;
  items: MenuItem[];
};

export default function AuthButton() {
  const [email, setEmail] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState(false);
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuItemRefs = useRef<Array<HTMLElement | null>>([]);
  const menuId = useId();


  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setOpenMenu(false);
      }
    }

    window.addEventListener("mousedown", onClickOutside);
    return () => window.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (!openMenu) return;
    const first = menuItemRefs.current.find((el) => el && !el.hasAttribute("disabled"));
    first?.focus();
  }, [openMenu]);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const sections = useMemo<MenuSection[]>(() => {
    const hasPlanosRoute = true;
    const hasEstatisticasRoute = true;

    return [
      {
        title: "Conta",
        items: [
          { type: "link", label: "Meu perfil", href: "/perfil", icon: "👤" },
          { type: "link", label: "Configurações", href: "/configuracoes", icon: "⚙️" },
        ],
      },
      {
        title: "Imóveis",
        items: [
          { type: "link", label: "Meus imóveis", href: "/meus-imoveis", icon: "🏠" },
          { type: "link", label: "Favoritos", href: "/favoritos", icon: "❤" },
          { type: "link", label: "Mensagens", href: "/chat", icon: "💬" },
        ],
      },
      {
        title: "Ferramentas",
        items: [
          {
            type: "link",
            label: "Estatísticas",
            href: "/estatisticas",
            icon: "📊",
            disabled: !hasEstatisticasRoute,
            badge: !hasEstatisticasRoute ? "Em breve" : undefined,
          },
          {
            type: "link",
            label: "Planos e pagamentos",
            href: "/planos",
            icon: "💳",
            disabled: !hasPlanosRoute,
            badge: !hasPlanosRoute ? "Em breve" : undefined,
          },
        ],
      },
      {
        title: "Suporte",
        items: [{ type: "link", label: "Ajuda", href: "/central-de-ajuda", icon: "❓" }],
      },
    ];
  }, []);

  const flatItems = useMemo(
    () => [
      ...sections.flatMap((section) => section.items).filter((item) => !item.disabled),
      { type: "action", label: "Sair da conta" } as const,
    ],
    [sections]
  );

  function closeMenuAndReturnFocus() {
    setOpenMenu(false);
    buttonRef.current?.focus();
  }

  function focusNext(currentIndex: number, direction: 1 | -1) {
    if (flatItems.length === 0) return;
    const nextIndex = (currentIndex + direction + flatItems.length) % flatItems.length;
    const target = menuItemRefs.current[nextIndex];
    target?.focus();
  }

  function handleToggleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpenMenu(true);
    }
  }

  function handleMenuKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const currentIndex = menuItemRefs.current.findIndex((el) => el === document.activeElement);

    if (event.key === "Escape") {
      event.preventDefault();
      closeMenuAndReturnFocus();
      return;
    }

    if (currentIndex < 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusNext(currentIndex, 1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      focusNext(currentIndex, -1);
    }
  }

  if (!email) {
    return (
      <Link href="/login" className="cta-primary px-4 py-2 rounded-lg transition">
        Entrar
      </Link>
    );
  }

  let focusableIndex = -1;
  const logoutRefIndex = sections.flatMap((section) => section.items).filter((item) => !item.disabled).length;

  return (
    <div className="flex items-center gap-3 flex-wrap justify-end">
      <div className="relative" ref={menuRef}>
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpenMenu((current) => !current)}
          onKeyDown={handleToggleKeyDown}
          aria-haspopup="menu"
          aria-expanded={openMenu}
          aria-controls={menuId}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
        >
          Minha conta
          <span aria-hidden>{openMenu ? "▲" : "▼"}</span>
        </button>

        {openMenu ? (
          <div
            id={menuId}
            role="menu"
            aria-label="Menu de perfil"
            onKeyDown={handleMenuKeyDown}
            className="absolute right-0 z-30 mt-2 max-h-[70vh] w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
          >
            <div className="max-h-[58vh] overflow-y-auto p-2">
              {sections.map((section, sectionIndex) => (
                <div key={section.title} className="py-1">
                  {sectionIndex > 0 ? <div className="mx-1 my-1 h-px bg-slate-200" /> : null}
                  <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    {section.title}
                  </p>

                  <div className="space-y-1">
                    {section.items.map((item) => {
                      if (!item.disabled) {
                        focusableIndex += 1;
                      }

                      const sharedClass =
                        "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition";

                      if (item.disabled) {
                        return (
                          <span
                            key={`${section.title}-${item.label}`}
                            className={`${sharedClass} cursor-not-allowed text-slate-400`}
                            aria-disabled="true"
                          >
                            <span className="inline-flex items-center gap-2">
                              <span aria-hidden>{item.icon}</span>
                              <span>{item.label}</span>
                            </span>
                            {item.badge ? (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                                {item.badge}
                              </span>
                            ) : null}
                          </span>
                        );
                      }

                      const refIndex = focusableIndex;
                      return (
                        <Link
                          key={`${section.title}-${item.label}`}
                          href={item.href ?? "#"}
                          role="menuitem"
                          ref={(el) => {
                            menuItemRefs.current[refIndex] = el;
                          }}
                          aria-current={pathname === item.href ? "page" : undefined}
                          onClick={() => setOpenMenu(false)}
                          className={`${sharedClass} text-slate-800 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 ${
                            pathname === item.href ? "bg-slate-100" : ""
                          }`}
                        >
                          <span className="inline-flex items-center gap-2">
                            <span aria-hidden>{item.icon}</span>
                            <span>{item.label}</span>
                          </span>
                          {item.badge ? (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                              {item.badge}
                            </span>
                          ) : null}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mx-1 my-1 h-px bg-slate-200" />
            <button
              role="menuitem"
              ref={(el) => {
                menuItemRefs.current[logoutRefIndex] = el;
              }}
              type="button"
              onClick={handleLogout}
              className="sticky bottom-0 flex w-full items-center justify-between gap-2 bg-white px-4 py-3 text-left text-sm text-slate-800 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
            >
              <span className="inline-flex items-center gap-2">
                <span aria-hidden>↩</span>
                <span>Sair da conta</span>
              </span>
            </button>
          </div>
        ) : null}
      </div>

      <span className="text-sm text-gray-600 hidden 2xl:inline">{email}</span>
    </div>
  );
}
