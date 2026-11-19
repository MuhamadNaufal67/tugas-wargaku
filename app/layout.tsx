import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import Navbar from "@/components/Navbar";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "WargaKu | Administrasi RT Digital",
  description:
    "Ajukan surat RT secara online, pantau statusnya, dan baca pengumuman dari pengurus RT.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1f6fa5",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      className={`${jakarta.variable} antialiased`}
      data-scroll-behavior="smooth"
    >
      <body className="min-h-screen bg-[var(--color-surface)] text-slate-900">
        <AuthProvider>
          <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
            <div className="absolute -left-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-[var(--color-sky)]/35 blur-3xl" />
            <div className="absolute -right-32 top-24 h-[26rem] w-[26rem] rounded-full bg-orange-200/40 blur-3xl" />
          </div>
          <div className="flex min-h-screen flex-col">
            <Navbar />

            <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
              {children}
            </main>

            <footer className="mt-10 border-t border-[var(--color-line)] bg-white">
              <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:grid-cols-[1.5fr_1fr_1fr] sm:px-6 lg:px-8">
                <div>
                  <p className="text-xl font-extrabold tracking-tight text-[var(--color-primary)]">
                    Warga<span className="text-[var(--color-accent)]">Ku</span>
                  </p>
                  <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">
                    Layanan surat dan informasi untuk warga RT, bisa diakses
                    dari ponsel maupun komputer.
                  </p>
                </div>
                <nav aria-label="Layanan" className="text-sm">
                  <p className="font-semibold text-slate-900">Layanan</p>
                  <ul className="mt-3 space-y-2 text-slate-500">
                    <li><Link href="/ajukan-surat" className="hover:text-slate-900">Ajukan surat</Link></li>
                    <li><Link href="/status" className="hover:text-slate-900">Status pengajuan</Link></li>
                    <li><Link href="/pengumuman" className="hover:text-slate-900">Pengumuman RT</Link></li>
                  </ul>
                </nav>
                <nav aria-label="Informasi" className="text-sm">
                  <p className="font-semibold text-slate-900">Informasi</p>
                  <ul className="mt-3 space-y-2 text-slate-500">
                    <li><Link href="/about" className="hover:text-slate-900">Tentang</Link></li>
                    <li><Link href="/services" className="hover:text-slate-900">Layanan</Link></li>
                    <li><Link href="/contact" className="hover:text-slate-900">Bantuan</Link></li>
                  </ul>
                </nav>
              </div>
              <div className="border-t border-[var(--color-line)]">
                <p className="mx-auto w-full max-w-6xl px-4 py-4 text-xs text-slate-400 sm:px-6 lg:px-8">
                  &copy; 2026 WargaKu &middot; Proyek tim Studi Independen VINIX7
                </p>
              </div>
            </footer>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
