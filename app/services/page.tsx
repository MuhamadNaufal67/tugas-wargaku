import { headers } from "next/headers";
import Link from "next/link";
import { LinkButton } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";

type ServiceItem = {
  id: number;
  title: string;
  description: string;
  detail: string;
};

const serviceExtras: Record<number, { href: string; icon: IconName; label: string }> = {
  1: { href: "/ajukan-surat", icon: "file", label: "Buka formulir" },
  2: { href: "/status", icon: "search", label: "Cek status" },
  3: { href: "/pengumuman", icon: "megaphone", label: "Baca pengumuman" },
};

async function getServices() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");

  if (!host) {
    throw new Error("Host header is not available.");
  }

  const protocol =
    requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");

  const response = await fetch(`${protocol}://${host}/api/services`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch services.");
  }

  return (await response.json()) as ServiceItem[];
}

export default async function ServicesPage() {
  const services = await getServices();

  return (
    <div className="space-y-10 sm:space-y-12">
      <PageHeader
        icon="file"
        title="Layanan"
        lead="Tiga layanan yang bisa dipakai warga setelah masuk ke akun. Semuanya bisa dibuka dari ponsel."
      />

      <section className="grid gap-5 md:grid-cols-3">
        {services.map((service) => {
          const extra = serviceExtras[service.id];

          return (
            <article
              key={service.id}
              className="group flex flex-col rounded-xl border border-[var(--color-line)] bg-white p-6 hover:border-[var(--color-sky)]"
            >
              {extra ? (
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-primary)] text-white">
                  <Icon name={extra.icon} className="h-6 w-6" />
                </span>
              ) : null}
              <h2 className="mt-5 text-lg font-bold text-slate-900">{service.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-700">{service.description}</p>
              <p className="mt-3 flex-1 border-t border-dashed border-[var(--color-line)] pt-3 text-sm leading-6 text-slate-500">
                {service.detail}
              </p>
              {extra ? (
                <Link
                  href={extra.href}
                  className="mt-5 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-[var(--color-primary-soft)] px-4 text-sm font-semibold text-[var(--color-primary)] hover:bg-[var(--brand-200)]"
                >
                  {extra.label}
                  <Icon name="chevronRight" className="h-4 w-4" />
                </Link>
              ) : null}
            </article>
          );
        })}
      </section>

      <section className="relative overflow-hidden rounded-2xl bg-[var(--color-primary)] p-6 text-white sm:p-8">
        <div aria-hidden="true" className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-white/10" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-4">
            <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 sm:flex">
              <Icon name="userPlus" className="h-6 w-6" />
            </span>
            <div>
              <p className="text-lg font-bold">Belum punya akun?</p>
              <p className="mt-1 text-white/85">Pendaftaran hanya butuh email, NIK, dan alamat.</p>
            </div>
          </div>
          <LinkButton href="/login?mode=register" variant="accent" className="sm:px-6">
            Daftar sebagai warga
          </LinkButton>
        </div>
      </section>
    </div>
  );
}
