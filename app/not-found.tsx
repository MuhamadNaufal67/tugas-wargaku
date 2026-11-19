import { LinkButton } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <section className="flex flex-1 items-center justify-center py-10">
      <div className="max-w-md text-center">
        <p className="text-sm font-bold text-[var(--color-primary)]">404</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Halaman tidak ditemukan
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Alamat yang Anda buka tidak ada atau sudah dipindahkan. Periksa
          kembali tautannya, atau kembali ke beranda.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <LinkButton href="/">Kembali ke beranda</LinkButton>
          <LinkButton href="/status" variant="secondary">
            Cek status pengajuan
          </LinkButton>
        </div>
      </div>
    </section>
  );
}
