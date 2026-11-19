import { headers } from "next/headers";
import Link from "next/link";
import { LinkButton } from "@/components/ui/Button";

type ServiceItem = {
  id: number;
  title: string;
  description: string;
  detail: string;
};

const serviceLinks: Record<number, { href: string; label: string }> = {
  1: { href: "/ajukan-surat", label: "Buka formulir" },
  2: { href: "/status", label: "Cek status" },
  3: { href: "/pengumuman", label: "Baca pengumuman" },
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
    <div className="space-y-10">
      <header className="max-w-2xl">
        <h1 className="page-title">Layanan</h1>
        <p className="page-lead">
          Tiga layanan yang bisa dipakai warga setelah masuk ke akun. Semuanya
          bisa dibuka dari ponsel.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {services.map((service) => {
          const link = serviceLinks[service.id];

          return (
            <article
              key={service.id}
              className="flex flex-col rounded-xl border border-[var(--color-line)] bg-white p-5 sm:p-6"
            >
              <h2 className="section-title">{service.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-700">{service.description}</p>
              <p className="mt-3 flex-1 text-sm leading-6 text-slate-500">{service.detail}</p>
              {link ? (
                <Link href={link.href} className="text-link mt-5 inline-flex min-h-11 items-center text-sm">
                  {link.label}
                </Link>
              ) : null}
            </article>
          );
        })}
      </section>

      <section className="flex flex-col gap-4 rounded-xl border border-[var(--color-line)] bg-white p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="font-semibold text-slate-900">Belum punya akun?</p>
          <p className="mt-1 text-sm text-slate-500">
            Pendaftaran hanya butuh email, NIK, dan alamat.
          </p>
        </div>
        <LinkButton href="/login?mode=register" variant="primary">
          Daftar sebagai warga
        </LinkButton>
      </section>
    </div>
  );
}
