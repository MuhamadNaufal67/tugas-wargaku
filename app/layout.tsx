import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "WargaKu | Administrasi RT Digital",
  description:
    "WargaKu adalah aplikasi administrasi RT digital untuk pengajuan surat, pemantauan status, dan informasi warga.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      className="antialiased"
      data-scroll-behavior="smooth"
    >
      <body className="min-h-screen bg-[var(--color-surface)] text-slate-900">
        <AuthProvider>
          <div className="relative flex min-h-screen flex-col">
            <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[32rem] bg-[radial-gradient(circle_at_top_left,_rgba(45,129,193,0.14),_transparent_42%),radial-gradient(circle_at_top_right,_rgba(255,138,61,0.12),_transparent_32%),linear-gradient(180deg,_#f8fbff_0%,_#eef5fb_100%)]" />

            <Navbar />

            <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-14">
              {children}
            </main>

            <footer className="border-t border-slate-200/70 bg-white/90">
              <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
                <div>
                  <p className="text-base font-bold text-slate-900">
                    WargaKu untuk layanan warga yang lebih tertata.
                  </p>
                  <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-500">
                    Pengajuan surat, pemantauan proses, dan informasi lingkungan
                    tersedia dalam satu aplikasi yang ringkas dan mudah dipakai.
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="text-lg font-extrabold text-[var(--color-primary)]">
                    Warga<span className="text-[var(--color-accent)]">Ku</span>
                  </span>
                  <span className="text-xs uppercase tracking-wider text-slate-400">
                    Administrasi Digital
                  </span>
                </div>
              </div>
            </footer>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
