import Image from "next/image";
import Link from "next/link";

const featureCards = [
  {
    title: "Ajukan Surat",
    description:
      "Warga dapat mengirim permohonan surat secara online tanpa harus datang berkali-kali ke pengurus RT.",
  },
  {
    title: "Status Realtime",
    description:
      "Pantau progres pengajuan dengan jelas, dari diterima, diproses, sampai siap diunduh.",
  },
  {
    title: "Pengumuman RT",
    description:
      "Informasi agenda kerja bakti, rapat warga, dan pemberitahuan penting tampil dalam satu dashboard.",
  },
];

const highlightPoints = [
  "Alur layanan mudah dipahami oleh warga dan pengurus",
  "Tampilan bersih, nyaman, dan konsisten di seluruh halaman",
  "Responsif dan rapi di ponsel, tablet, maupun desktop",
];

const workflowSteps = [
  {
    title: "Masuk ke akun",
    description: "Warga masuk dengan akun sendiri agar riwayat pengajuan dan pemberitahuan tetap tersimpan rapi.",
  },
  {
    title: "Ajukan surat",
    description: "Form pengajuan membantu warga mengirim data penting seperti nama, NIK, alamat, dan jenis surat dengan lengkap.",
  },
  {
    title: "Pengurus meninjau layanan",
    description: "Pengurus dapat memproses, menolak dengan alasan yang jelas, atau menyelesaikan pengajuan dari satu panel kerja.",
  },
  {
    title: "Surat siap diambil",
    description: "Saat selesai, warga menerima pemberitahuan dan dapat mengunduh surat PDF yang siap dicetak.",
  },
];

const cardClassName =
  "flex h-full flex-col rounded-[1.75rem] border border-slate-200/80 bg-white/92 shadow-[0_16px_38px_rgba(15,23,42,0.06)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_22px_52px_rgba(15,23,42,0.1)]";

export default function HomePage() {
  return (
    <div className="space-y-16 lg:space-y-20">
      <section className="grid items-start gap-12 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] lg:gap-16">
        <div className="max-w-2xl space-y-10 pt-2 md:space-y-12 lg:pt-6">
          <span className="inline-flex rounded-full bg-[var(--color-primary-soft)] px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-[var(--color-primary)] sm:text-sm">
            Solusi Administrasi RT Modern
          </span>
          <div className="max-w-xl space-y-5 md:max-w-2xl md:space-y-6">
            <h1 className="text-4xl font-extrabold tracking-[-0.04em] text-slate-950 sm:text-5xl md:text-[3.4rem] lg:text-6xl lg:leading-[1.05]">
              Administrasi RT digital yang rapi, cepat, dan mudah dipakai
              warga.
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
              WargaKu membantu pengurus RT dan warga mengelola surat, memantau
              status pengajuan, dan mengakses informasi lingkungan dalam satu
              dashboard yang modern dan responsif.
            </p>
          </div>

          <div className="flex flex-wrap gap-4 md:gap-5">
            <Link
              href="/services"
              className="rounded-full bg-[var(--color-accent)] px-7 py-4 text-base font-bold text-white shadow-[0_18px_38px_rgba(255,138,61,0.28)] hover:-translate-y-0.5 hover:shadow-[0_24px_48px_rgba(255,138,61,0.34)]"
            >
              Lihat Layanan
            </Link>
            <Link
              href="/contact"
              className="rounded-full border border-slate-200 bg-white px-7 py-4 text-base font-bold text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.05)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] hover:shadow-[0_16px_32px_rgba(15,23,42,0.08)]"
            >
              Butuh Bantuan?
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {featureCards.map((feature) => (
              <article key={feature.title} className={`${cardClassName} p-6 md:p-7`}>
                <h2 className="text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">
                  {feature.title}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>

        <div className="relative lg:pl-2 xl:pl-4">
          <div className="rounded-[2.5rem] border border-white/80 bg-white/90 p-4 shadow-[0_24px_80px_rgba(45,129,193,0.16)] sm:p-5">
            <div className="rounded-[2rem] bg-[linear-gradient(180deg,_#f7fbff_0%,_#edf5fb_100%)] p-4 sm:p-5 lg:p-6">
              <div className="inline-flex items-center gap-3 rounded-full bg-[var(--color-primary-soft)] px-4 py-3 text-sm font-semibold text-[var(--color-primary)]">
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-accent)]" />
                Sekilas Tampilan Aplikasi
              </div>

              <div className="mt-5 overflow-hidden rounded-[1.75rem] border border-slate-200/90 bg-white">
                <div className="min-h-[27rem] p-4 sm:p-5">
                  <div>
                    <div className="overflow-hidden rounded-[1.5rem] border border-white/60 bg-[var(--color-dashboard)] shadow-[0_16px_36px_rgba(45,129,193,0.15)]">
                      <Image
                        src="/HI-FI%20DASHBOARD.png"
                        alt="Tampilan dashboard aplikasi WargaKu"
                        width={900}
                        height={960}
                        className="h-auto w-full object-contain"
                        priority
                      />
                    </div>

                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <div className={`${cardClassName} p-5`}>
                        <p className="text-2xl font-extrabold tracking-tight text-slate-900">
                          4 Modul Inti
                        </p>
                        <p className="mt-3 text-sm leading-relaxed text-slate-600">
                          Dashboard, pengajuan surat, cek status, dan unduh
                          surat dalam satu aplikasi.
                        </p>
                      </div>
                      <div className={`${cardClassName} p-5`}>
                        <p className="text-2xl font-extrabold tracking-tight text-slate-900">
                          Realtime
                        </p>
                        <p className="mt-3 text-sm leading-relaxed text-slate-600">
                          Status pengajuan bisa dipantau langsung tanpa proses
                          manual yang berulang.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute -bottom-52 right-6 hidden w-[560px] rounded-[2rem] border border-white/85 bg-white/95 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.12)] lg:block">
            <span className="inline-flex rounded-full bg-[#d7f0df] px-4 py-2 text-sm font-semibold text-[#2d8b57]">
              Keunggulan Utama
            </span>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-slate-600">
              {highlightPoints.map((point) => (
                <li key={point} className="flex gap-3">
                  <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
                  <span className="whitespace-nowrap">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="grid gap-8 rounded-[2.5rem] bg-[linear-gradient(135deg,_#1f6ba5_0%,_#2d81c1_58%,_#5fa5da_100%)] px-6 py-16 text-white shadow-[0_20px_70px_rgba(31,107,165,0.22)] lg:grid-cols-[0.9fr_1.1fr] lg:px-10 lg:py-16">
        <div className="space-y-4">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-white/80">
            Mengapa WargaKu
          </p>
          <h2 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
            Fitur penting untuk layanan administrasi lingkungan yang lebih tertib.
          </h2>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          <div className="rounded-[1.75rem] bg-white/14 p-6 backdrop-blur-sm">
            <h3 className="text-lg font-bold">Cepat</h3>
            <p className="mt-3 text-sm leading-relaxed text-white/88">
              Permohonan surat dikirim dalam hitungan menit tanpa alur yang
              membingungkan.
            </p>
          </div>
          <div className="rounded-[1.75rem] bg-white/14 p-6 backdrop-blur-sm">
            <h3 className="text-lg font-bold">Transparan</h3>
            <p className="mt-3 text-sm leading-relaxed text-white/88">
              Pengurus dan warga dapat melihat status layanan dengan informasi
              yang lebih jelas.
            </p>
          </div>
          <div className="rounded-[1.75rem] bg-white/14 p-6 backdrop-blur-sm">
            <h3 className="text-lg font-bold">Terpusat</h3>
            <p className="mt-3 text-sm leading-relaxed text-white/88">
              Pengumuman RT, layanan surat, dan arsip digital berada dalam satu
              ekosistem.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="max-w-3xl">
          <span className="inline-flex rounded-full bg-[var(--color-primary-soft)] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-primary)]">
            Workflow Lengkap
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
            Alur aplikasi disusun untuk skenario administrasi warga yang nyata.
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {workflowSteps.map((step, index) => (
            <article key={step.title} className={`${cardClassName} p-6`}>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] text-sm font-extrabold text-[var(--color-primary)]">
                0{index + 1}
              </span>
              <h3 className="mt-4 text-lg font-extrabold text-slate-900">{step.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{step.description}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
