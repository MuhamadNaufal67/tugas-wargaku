"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Notification from "@/app/notification";
import AdminAuthButton from "@/components/AdminAuthButton";
import { useBodyScrollLock, useEscapeKey, useOutsideClick, useScrolled } from "@/hooks";
import { useAuth } from "@/hooks/useAuth";

const publicNavigationItems = [
  { href: "/", label: "Beranda" },
  { href: "/about", label: "Tentang" },
  { href: "/services", label: "Layanan" },
  { href: "/ajukan-surat", label: "Ajukan Surat" },
  { href: "/status", label: "Status Pengajuan" },
  { href: "/contact", label: "Bantuan" },
];

const authenticatedNavigationTail = [
  { href: "/ajukan-surat", label: "Ajukan Surat" },
  { href: "/status", label: "Status Pengajuan" },
  { href: "/contact", label: "Bantuan" },
];

function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { profile, user } = useAuth();
  const scrolled = useScrolled();
  const dashboardHref = profile?.role === "admin" ? "/admin" : "/dashboard";
  const navigationItems = user
    ? [{ href: dashboardHref, label: "Dashboard" }, ...authenticatedNavigationTail]
    : publicNavigationItems;
  const mobileMenuRef = useOutsideClick<HTMLDivElement>(
    () => setMenuOpen(false),
    menuOpen,
  );

  useBodyScrollLock(menuOpen);
  useEscapeKey(() => setMenuOpen(false), menuOpen);

  return (
    <>
      <header
        className={`sticky top-0 z-30 border-b backdrop-blur-xl transition-all duration-200 ${
          scrolled
            ? "border-slate-200/70 bg-white/95 shadow-[0_10px_30px_rgba(15,23,42,0.06)]"
            : "border-slate-200/60 bg-white/88"
        }`}
      >
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2 transition-opacity hover:opacity-85"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl sm:h-10 sm:w-10">
              <Image
                src="/logo.png"
                alt="Logo WargaKu"
                width={36}
                height={36}
                className="h-8 w-8 object-contain sm:h-9 sm:w-9"
                priority
              />
            </span>
            <span className="flex min-w-0 flex-col justify-center leading-none">
              <span className="truncate text-lg font-extrabold tracking-tight text-[var(--color-primary)] sm:text-[1.65rem]">
                Warga<span className="text-[var(--color-accent)]">Ku</span>
              </span>
              <span className="text-[0.58rem] font-semibold uppercase tracking-[0.16em] text-slate-400 sm:text-[0.66rem]">
                Administrasi Digital
              </span>
            </span>
          </Link>

          <div className="hidden min-w-0 flex-1 items-center justify-end gap-3 lg:flex">
            <nav
              aria-label="Navigasi utama"
              className="min-w-0 rounded-full border border-slate-200/80 bg-white/92 p-1.5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]"
            >
              <ul className="flex items-center gap-1">
                {navigationItems.map((item) => {
                  const active = isActivePath(pathname, item.href);

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={`block whitespace-nowrap rounded-full px-3 py-2 text-[0.92rem] font-semibold transition xl:px-3.5 ${
                          active
                            ? "bg-[var(--color-primary)] text-white shadow-sm"
                            : "text-slate-600 hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)]"
                        }`}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="flex shrink-0 items-center gap-2 rounded-full border border-slate-200/80 bg-white/92 p-1.5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
              {user ? <Notification /> : null}
              <AdminAuthButton
                className="inline-flex min-h-10 items-center rounded-full border border-slate-200/80 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                loadingClassName="inline-flex min-h-10 items-center rounded-full border border-slate-200/80 bg-white px-4 py-2.5 text-sm font-semibold text-slate-400 shadow-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 lg:hidden">
            {user ? <Notification /> : null}
            <button
              type="button"
              onClick={() => setMenuOpen((value) => !value)}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200/80 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
              aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation"
            >
              <span className="relative flex h-4 w-5 flex-col justify-between">
                <span
                  className={`block h-0.5 w-full rounded bg-current transition-all duration-200 ${
                    menuOpen ? "translate-y-[7px] rotate-45" : ""
                  }`}
                />
                <span
                  className={`block h-0.5 w-full rounded bg-current transition-all duration-200 ${
                    menuOpen ? "opacity-0" : ""
                  }`}
                />
                <span
                  className={`block h-0.5 w-full rounded bg-current transition-all duration-200 ${
                    menuOpen ? "-translate-y-[7px] -rotate-45" : ""
                  }`}
                />
              </span>
            </button>
          </div>
        </div>
      </header>

      {menuOpen ? (
        <button
          type="button"
          aria-label="Tutup menu mobile"
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm lg:hidden"
        />
      ) : null}

      <aside
        ref={mobileMenuRef}
        id="mobile-navigation"
        className={`fixed inset-y-0 right-0 z-50 w-[min(22rem,100vw)] bg-white shadow-2xl transition-transform duration-300 lg:hidden ${
          menuOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!menuOpen}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <span className="text-base font-bold text-slate-800">Menu</span>
              <p className="mt-0.5 text-xs text-slate-400">
                {user ? "Akses cepat akun warga" : "Navigasi layanan warga"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100"
              aria-label="Tutup menu"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              >
                <path d="M6 6 18 18" />
                <path d="M18 6 6 18" />
              </svg>
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-4">
            <ul className="space-y-1.5">
              {navigationItems.map((item) => {
                const active = isActivePath(pathname, item.href);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={`flex min-h-11 items-center rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                        active
                          ? "bg-[var(--color-primary)] text-white"
                          : "text-slate-700 hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)]"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="border-t border-slate-100 px-4 py-4">
            <div className="rounded-[1.75rem] bg-slate-50 p-2">
              <AdminAuthButton
                className="flex min-h-11 w-full items-center justify-center rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                loadingClassName="flex min-h-11 w-full items-center justify-center rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm font-semibold text-slate-400 shadow-sm"
              />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
