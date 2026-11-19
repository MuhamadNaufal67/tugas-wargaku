"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Notification from "@/app/notification";
import AdminAuthButton from "@/components/AdminAuthButton";
import { useBodyScrollLock, useEscapeKey, useOutsideClick, useScrolled } from "@/hooks";
import { useAuth } from "@/hooks/useAuth";

type NavigationItem = { href: string; label: string };

const publicNavigationItems: NavigationItem[] = [
  { href: "/", label: "Beranda" },
  { href: "/services", label: "Layanan" },
  { href: "/about", label: "Tentang" },
  { href: "/contact", label: "Bantuan" },
];

const residentNavigationItems: NavigationItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/ajukan-surat", label: "Ajukan Surat" },
  { href: "/status", label: "Status Pengajuan" },
  { href: "/pengumuman", label: "Pengumuman" },
];

const adminNavigationItems: NavigationItem[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/status", label: "Kelola Pengajuan" },
  { href: "/admin/pengumuman", label: "Pengumuman" },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/admin") return pathname === "/admin";
  return pathname.startsWith(href);
}

const authButtonClassName =
  "inline-flex min-h-10 items-center justify-center rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] hover:bg-[var(--color-primary-strong)]";
const authButtonLoadingClassName =
  "inline-flex min-h-10 items-center justify-center rounded-xl bg-white/60 px-4 py-2 text-sm font-semibold text-slate-400";

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { profile, user } = useAuth();
  const scrolled = useScrolled();
  const navigationItems = !user
    ? publicNavigationItems
    : profile?.role === "admin"
      ? adminNavigationItems
      : residentNavigationItems;
  const mobileMenuRef = useOutsideClick<HTMLDivElement>(
    () => setMenuOpen(false),
    menuOpen,
  );

  useBodyScrollLock(menuOpen);
  useEscapeKey(() => setMenuOpen(false), menuOpen);

  return (
    <>
      <header className="sticky top-0 z-30 px-3 pt-3 sm:px-4">
        <div
          className={`glass mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 rounded-2xl pl-3 pr-2 transition-shadow sm:pl-4 ${
            scrolled ? "shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_16px_40px_-12px_rgba(13,51,76,0.35)]" : ""
          }`}
        >
          <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="WargaKu, ke beranda">
            <Image
              src="/logo.png"
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 object-contain"
              priority
            />
            <span className="flex flex-col leading-none">
              <span className="text-xl font-extrabold tracking-tight text-[var(--color-primary)]">
                Warga<span className="text-[var(--color-accent)]">Ku</span>
              </span>
              <span className="mt-1 text-[0.68rem] font-medium text-slate-500">
                Administrasi RT Digital
              </span>
            </span>
          </Link>

          <nav aria-label="Navigasi utama" className="hidden lg:block">
            <ul className="flex items-center gap-1 rounded-xl bg-white/30 p-1">
              {navigationItems.map((item) => {
                const active = isActivePath(pathname, item.href);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`flex min-h-9 items-center rounded-lg px-3.5 text-sm font-semibold ${
                        active
                          ? "glass-pill text-[var(--color-primary)]"
                          : "text-slate-600 hover:bg-white/50 hover:text-slate-900"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            {user ? <Notification /> : null}
            <div className="hidden lg:block">
              <AdminAuthButton
                className={authButtonClassName}
                loadingClassName={authButtonLoadingClassName}
              />
            </div>
            <button
              type="button"
              onClick={() => setMenuOpen((value) => !value)}
              className="glass-pill flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 lg:hidden"
              aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                {menuOpen ? (
                  <>
                    <path d="M6 6 18 18" />
                    <path d="M18 6 6 18" />
                  </>
                ) : (
                  <>
                    <path d="M4 7h16" />
                    <path d="M4 12h16" />
                    <path d="M4 17h16" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>
      </header>

      {menuOpen ? (
        <button
          type="button"
          aria-label="Tutup menu"
          tabIndex={-1}
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-[2px] lg:hidden"
        />
      ) : null}

      <aside
        ref={mobileMenuRef}
        id="mobile-navigation"
        className={`glass fixed bottom-3 right-3 top-3 z-50 w-[min(20rem,calc(100vw-1.5rem))] rounded-2xl transition-transform duration-200 lg:hidden ${
          menuOpen ? "translate-x-0" : "invisible translate-x-[110%]"
        }`}
        aria-hidden={!menuOpen}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between border-b border-white/60 px-4">
            <span className="text-base font-bold text-slate-900">Menu</span>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-white/60"
              aria-label="Tutup menu"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M6 6 18 18" />
                <path d="M18 6 6 18" />
              </svg>
            </button>
          </div>

          <nav aria-label="Navigasi utama" className="flex-1 overflow-y-auto p-3">
            <ul className="space-y-1">
              {navigationItems.map((item) => {
                const active = isActivePath(pathname, item.href);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={`flex min-h-12 items-center rounded-xl px-3 text-[0.95rem] font-semibold ${
                        active
                          ? "glass-pill text-[var(--color-primary)]"
                          : "text-slate-700 hover:bg-white/50"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
              {user ? (
                <li>
                  <Link
                    href="/contact"
                    onClick={() => setMenuOpen(false)}
                    className="flex min-h-12 items-center rounded-xl px-3 text-[0.95rem] font-semibold text-slate-700 hover:bg-white/50"
                  >
                    Bantuan
                  </Link>
                </li>
              ) : null}
            </ul>
          </nav>

          <div className="border-t border-white/60 p-4">
            <AdminAuthButton
              className={`${authButtonClassName} w-full min-h-11`}
              loadingClassName={`${authButtonLoadingClassName} w-full min-h-11`}
            />
          </div>
        </div>
      </aside>
    </>
  );
}
