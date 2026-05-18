import { LinkButton } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";

export default function NotFound() {
  return (
    <section className="flex flex-1 items-center justify-center">
      <Card className="w-full max-w-2xl">
        <CardContent className="text-center">
          <span className="inline-flex rounded-full bg-[var(--color-primary-soft)] px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-primary)]">
            Halaman Tidak Ditemukan
          </span>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">
            Halaman yang Anda cari tidak ditemukan.
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-500 sm:text-base">
            Halaman yang Anda tuju belum tersedia. Silakan kembali ke beranda atau cek status pengajuan Anda.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <LinkButton href="/">Kembali ke Beranda</LinkButton>
            <LinkButton href="/status" variant="secondary">
              Lihat Status Pengajuan
            </LinkButton>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
