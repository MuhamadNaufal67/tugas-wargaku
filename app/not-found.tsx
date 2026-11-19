import { LinkButton } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export default function NotFound() {
  return (
    <section className="flex flex-1 items-center justify-center py-10">
      <div className="w-full max-w-lg text-center">
        <div aria-hidden="true" className="relative mx-auto h-40 w-56">
          <div className="absolute inset-x-6 bottom-0 top-6 rotate-[-6deg] rounded-xl border border-[var(--color-line)] bg-white" />
          <div className="absolute inset-x-6 bottom-0 top-6 rotate-[4deg] rounded-xl border border-[var(--color-line)] bg-white shadow-sm" />
          <div className="absolute inset-x-6 bottom-0 top-6 flex flex-col items-center justify-center rounded-xl border border-[var(--color-line)] bg-white shadow-md">
            <span className="text-5xl font-extrabold tracking-tight text-[var(--color-primary)]">404</span>
            <span className="mt-2 flex gap-1.5">
              <span className="h-1.5 w-10 rounded bg-slate-200" />
              <span className="h-1.5 w-6 rounded bg-slate-200" />
            </span>
          </div>
          <span className="absolute -right-1 top-2 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-accent)] text-white shadow-md">
            <Icon name="search" className="h-5 w-5" />
          </span>
        </div>

        <h1 className="mt-8 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Halaman tidak ditemukan
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-600">
          Alamat yang Anda buka tidak ada atau sudah dipindahkan. Periksa
          kembali tautannya, atau lanjutkan dari salah satu halaman di bawah.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <LinkButton href="/" icon={<Icon name="home" className="h-4 w-4" />}>
            Kembali ke beranda
          </LinkButton>
          <LinkButton href="/status" variant="secondary" icon={<Icon name="search" className="h-4 w-4" />}>
            Cek status pengajuan
          </LinkButton>
        </div>
      </div>
    </section>
  );
}
