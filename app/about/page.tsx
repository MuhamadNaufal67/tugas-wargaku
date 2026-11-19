import { LinkButton } from "@/components/ui/Button";

const problems = [
  {
    title: "Antre dan bolak-balik",
    description:
      "Warga harus datang ke rumah pengurus, kadang lebih dari sekali, hanya untuk satu surat pengantar.",
  },
  {
    title: "Tidak tahu progresnya",
    description:
      "Setelah berkas diserahkan, warga tidak tahu apakah suratnya sedang diproses atau ada data yang kurang.",
  },
  {
    title: "Catatan tercecer",
    description:
      "Pengurus mencatat pengajuan di buku atau chat, sehingga sulit dicari ketika dibutuhkan lagi.",
  },
];

const answers = [
  {
    title: "Pengajuan online",
    description: "Formulir surat bisa diisi kapan saja dari ponsel, dengan data diri yang sudah tersimpan di akun.",
  },
  {
    title: "Status yang jelas",
    description:
      "Setiap pengajuan punya status: menunggu, diproses, selesai, atau ditolak dengan catatan perbaikan.",
  },
  {
    title: "Surat langsung jadi",
    description: "Saat pengurus menyelesaikan pengajuan, surat PDF dibuat otomatis dan bisa diunduh warga.",
  },
];

export default function AboutPage() {
  return (
    <div className="space-y-12">
      <header className="max-w-2xl">
        <h1 className="page-title">Tentang WargaKu</h1>
        <p className="page-lead">
          WargaKu adalah aplikasi administrasi untuk satu lingkungan RT. Tujuannya
          sederhana: membuat urusan surat-menyurat antara warga dan pengurus
          lebih cepat dan bisa dipantau.
        </p>
      </header>

      <section className="grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="section-title">Masalah yang ingin diselesaikan</h2>
          <dl className="mt-4 space-y-5">
            {problems.map((item) => (
              <div key={item.title}>
                <dt className="text-sm font-semibold text-slate-900">{item.title}</dt>
                <dd className="mt-1 text-sm leading-6 text-slate-600">{item.description}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="rounded-xl border border-[var(--color-line)] bg-white p-5 sm:p-6">
          <h2 className="section-title">Yang dilakukan WargaKu</h2>
          <dl className="mt-4 space-y-5">
            {answers.map((item) => (
              <div key={item.title} className="border-l-2 border-[var(--color-primary)] pl-4">
                <dt className="text-sm font-semibold text-slate-900">{item.title}</dt>
                <dd className="mt-1 text-sm leading-6 text-slate-600">{item.description}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-xl bg-[var(--color-primary-soft)] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <p className="text-sm font-medium text-slate-800 sm:text-base">
          Sudah punya akun warga? Langsung ajukan surat pertama Anda.
        </p>
        <LinkButton href="/ajukan-surat" variant="accent">
          Ajukan surat
        </LinkButton>
      </section>
    </div>
  );
}
