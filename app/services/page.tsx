import Image from "next/image";
import { headers } from "next/headers";
import { Card, CardContent } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";

type ServiceItem = {
  id: number;
  title: string;
  description: string;
  detail: string;
};

const serviceImages: Record<number, { src: string; alt: string }> = {
  1: {
    src: "/HI-FI%20Ajukan%20Surat%201.png",
    alt: "Tampilan fitur Ajukan Surat",
  },
  2: {
    src: "/HI-FI%20Status%20Pengajuan%20Surat.png",
    alt: "Tampilan fitur Status Pengajuan",
  },
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
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/80 bg-white/92 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-8 lg:p-10">
        <span className="inline-flex rounded-full bg-[var(--color-primary-soft)] px-4 py-2 text-sm font-semibold text-[var(--color-primary)]">
          Layanan Utama
        </span>
        <h1 className="mt-5 max-w-4xl text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">
          Layanan inti WargaKu untuk membantu administrasi RT/RW berjalan lebih cepat dan tertata.
        </h1>
        <p className="mt-6 max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">
          Setiap layanan dirancang sebagai satu alur yang utuh, mulai dari pengajuan,
          pemantauan proses, pemberitahuan otomatis, catatan perbaikan, hingga surat selesai yang siap diunduh.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <LinkButton href="/dashboard">Lihat Akun Warga</LinkButton>
          <LinkButton href="/admin" variant="secondary">
            Lihat Panel Pengurus
          </LinkButton>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {services.map((service, index) => (
          <Card key={service.id}>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] text-lg font-extrabold text-[var(--color-primary)]">
                  0{index + 1}
                </span>
                <span className="rounded-full bg-[#fff2e8] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-accent)]">
                  Layanan
                </span>
              </div>
              <h2 className="mt-6 text-2xl font-bold text-slate-900">{service.title}</h2>
              {serviceImages[service.id] ? (
                <div className="mt-5 overflow-hidden rounded-[1.25rem] border border-slate-200 bg-slate-50 p-2">
                  <Image
                    src={serviceImages[service.id].src}
                    alt={serviceImages[service.id].alt}
                    width={640}
                    height={360}
                    className="h-auto max-h-40 w-full rounded-[0.9rem] object-contain"
                  />
                </div>
              ) : null}
              <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
                {service.description}
              </p>
              <div className="mt-6 rounded-[1.5rem] bg-slate-50 p-4">
                <p className="text-sm leading-7 text-slate-600">{service.detail}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
