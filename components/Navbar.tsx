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
  "inline-flex min-h-10 items-center justify-center rounded-lg border border-[var(--color-line)] bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:border-slate-300 hover:bg-slate-50";
const authButtonLoadingClassName =
  "inline-flex min-h-10 items-center justify-center rounded-lg border border-[var(--color-line)] bg-white px-4 py-2 text-sm font-semibold text-slate-400";

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
      <header
        className={`sticky top-0 z-30 border-b bg-white/95 backdrop-blur ${
          scrolled ? "border-[var(--color-line)]" : "border-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
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

          <nav aria-label="Navigasi utama" className="hidden h-full lg:block">
            <ul className="flex h-full items-center gap-7">
              {navigationItems.map((item) => {
                const active = isActivePath(pathname, item.href);

                return (
                  <li key={item.href} className="h-full">
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`flex h-full items-center border-b-2 pt-0.5 text-sm font-semibold ${
                        active
                          ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                          : "border-transparent text-slate-600 hover:text-slate-900"
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
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--color-line)] bg-white text-slate-700 hover:bg-slate-50 lg:hidden"
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
          className="fixed inset-0 z-40 bg-slate-900/30 lg:hidden"
        />
      ) : null}

      <aside
        ref={mobileMenuRef}
        id="mobile-navigation"
        className={`fixed inset-y-0 right-0 z-50 w-[min(20rem,88vw)] bg-white shadow-xl transition-transform duration-200 lg:hidden ${
          menuOpen ? "translate-x-0" : "invisible translate-x-full"
        }`}
        aria-hidden={!menuOpen}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between border-b border-[var(--color-line)] px-4">
            <span className="text-base font-bold text-slate-900">Menu</span>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
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
                      className={`flex min-h-12 items-center rounded-lg px-3 text-[0.95rem] font-semibold ${
                        active
                          ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                          : "text-slate-700 hover:bg-slate-50"
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
                    className="flex min-h-12 items-center rounded-lg px-3 text-[0.95rem] font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Bantuan
                  </Link>
                </li>
              ) : null}
            </ul>
          </nav>

          <div className="border-t border-[var(--color-line)] p-4">
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
