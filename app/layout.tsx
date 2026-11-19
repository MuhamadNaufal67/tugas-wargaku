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
          <div className="flex min-h-screen flex-col">
            <Navbar />

            <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
              {children}
            </main>

            <footer className="border-t border-[var(--color-line)] bg-white">
              <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
                <p>
                  <span className="font-bold text-[var(--color-primary)]">
                    Warga<span className="text-[var(--color-accent)]">Ku</span>
                  </span>{" "}
                  &middot; Layanan surat dan informasi untuk warga RT
                </p>
                <nav aria-label="Tautan footer" className="flex gap-5">
                  <Link href="/about" className="hover:text-slate-800">
                    Tentang
                  </Link>
                  <Link href="/services" className="hover:text-slate-800">
                    Layanan
                  </Link>
                  <Link href="/contact" className="hover:text-slate-800">
                    Bantuan
                  </Link>
                </nav>
              </div>
            </footer>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
