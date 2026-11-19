import { LinkButton } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";

const comparisons = [
  {
    before: "Warga datang ke rumah pengurus, kadang lebih dari sekali, hanya untuk satu surat pengantar.",
    after: "Formulir surat diisi dari ponsel kapan saja, dengan data diri yang sudah tersimpan di akun.",
    topic: "Mengajukan surat",
  },
  {
    before: "Setelah berkas diserahkan, warga tidak tahu apakah suratnya sedang diproses atau ada data yang kurang.",
    after: "Setiap pengajuan punya status yang jelas, dan warga mendapat notifikasi setiap kali status berubah.",
    topic: "Mengetahui progres",
  },
  {
    before: "Pengajuan dicatat di buku atau chat, sehingga sulit dicari ketika dibutuhkan lagi.",
    after: "Semua pengajuan tersimpan di satu daftar yang bisa dicari berdasarkan nama atau NIK.",
    topic: "Mencatat pengajuan",
  },
  {
    before: "Surat diketik ulang satu per satu, dan nomor suratnya diatur manual.",
    after: "Surat PDF dibuat otomatis dengan kop RT dan nomor surat saat pengajuan selesai.",
    topic: "Membuat surat",
  },
];

export default function AboutPage() {
  return (
    <div className="space-y-12 sm:space-y-16">
      <PageHeader
        icon="users"
        title="Tentang WargaKu"
        lead="WargaKu adalah aplikasi administrasi untuk satu lingkungan RT. Tujuannya sederhana: membuat urusan surat-menyurat antara warga dan pengurus lebih cepat dan bisa dipantau."
      />

      <section aria-labelledby="perbandingan">
        <h2 id="perbandingan" className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          Apa yang berubah dengan WargaKu
        </h2>

        <div className="mt-6 overflow-hidden rounded-xl border border-[var(--color-line)] bg-white">
          <div className="hidden grid-cols-[12rem_1fr_1fr] border-b border-[var(--color-line)] bg-slate-50 text-sm font-semibold md:grid">
            <div className="px-5 py-3 text-slate-500">Urusan</div>
            <div className="px-5 py-3 text-slate-500">Sebelumnya</div>
            <div className="px-5 py-3 text-[var(--color-primary)]">Dengan WargaKu</div>
          </div>
          <ul className="divide-y divide-[var(--color-line)]">
            {comparisons.map((item) => (
              <li key={item.topic} className="grid gap-3 p-5 md:grid-cols-[12rem_1fr_1fr] md:gap-0 md:p-0">
                <p className="font-semibold text-slate-900 md:px-5 md:py-4 md:text-sm">{item.topic}</p>
                <p className="flex gap-3 text-sm leading-6 text-slate-500 md:px-5 md:py-4">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500">
                    <Icon name="x" className="h-3 w-3" strokeWidth={3} />
                  </span>
                  {item.before}
                </p>
                <p className="flex gap-3 text-sm leading-6 text-slate-800 md:bg-[var(--color-primary-soft)]/40 md:px-5 md:py-4">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <Icon name="check" className="h-3 w-3" strokeWidth={3} />
                  </span>
                  {item.after}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-[var(--color-line)] bg-white p-6">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
            <Icon name="home" />
          </span>
          <h2 className="mt-4 text-lg font-bold text-slate-900">Untuk warga</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Ajukan surat tanpa antre, lihat posisinya kapan saja, dan unduh
            suratnya sendiri saat sudah jadi. Pengumuman RT juga masuk langsung
            ke akun Anda.
          </p>
        </div>
        <div className="rounded-xl border border-[var(--color-line)] bg-white p-6">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-[var(--color-accent)]">
            <Icon name="clipboard" />
          </span>
          <h2 className="mt-4 text-lg font-bold text-slate-900">Untuk pengurus</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Periksa pengajuan dari satu daftar, kembalikan dengan catatan jika
            ada yang kurang, dan terbitkan surat PDF dengan sekali klik.
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-5 rounded-2xl bg-[var(--color-primary)] p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <p className="text-lg font-bold">Sudah punya akun warga?</p>
          <p className="mt-1 text-white/85">Langsung ajukan surat pertama Anda.</p>
        </div>
        <LinkButton href="/ajukan-surat" variant="accent" className="sm:px-6">
          Ajukan surat
        </LinkButton>
      </section>
    </div>
  );
}
