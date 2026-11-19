import { LinkButton } from "@/components/ui/Button";
import { LETTER_TEMPLATE_META } from "@/constants/templateSurat";

const letterTypes = Object.values(LETTER_TEMPLATE_META);

const steps = [
  {
    title: "Buat akun",
    description: "Daftar dengan email, NIK, dan alamat. Data ini dipakai untuk mengisi formulir surat.",
  },
  {
    title: "Ajukan surat",
    description: "Pilih jenis surat, periksa data diri, lalu kirim. Tidak perlu datang ke rumah pengurus.",
  },
  {
    title: "Pantau statusnya",
    description: "Lihat apakah pengajuan masih menunggu, sedang diproses, selesai, atau perlu diperbaiki.",
  },
  {
    title: "Unduh surat",
    description: "Setelah disetujui, surat tersedia dalam bentuk PDF dan siap dicetak.",
  },
];

const adminTasks = [
  "Melihat semua pengajuan warga dan mencarinya berdasarkan nama atau NIK",
  "Mengubah status dan menulis catatan jika data perlu diperbaiki",
  "Membuat surat PDF bernomor otomatis saat pengajuan selesai",
  "Mengirim pengumuman yang langsung masuk ke notifikasi warga",
];

export default function HomePage() {
  return (
    <div className="space-y-16 sm:space-y-20">
      <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
        <div>
          <h1 className="max-w-xl text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]">
            Ajukan surat RT dari rumah, pantau sampai suratnya jadi.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-slate-600">
            WargaKu menghubungkan warga dengan pengurus RT. Kirim pengajuan
            surat secara online, lihat perkembangannya, dan unduh suratnya
            dalam bentuk PDF ketika sudah selesai.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <LinkButton href="/ajukan-surat" variant="accent" className="sm:px-6">
              Ajukan surat
            </LinkButton>
            <LinkButton href="/login" variant="secondary" className="sm:px-6">
              Masuk atau daftar
            </LinkButton>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--color-line)] bg-white">
          <div className="rounded-t-xl bg-[var(--color-primary)] px-5 py-4 text-white">
            <p className="text-base font-bold">Surat yang bisa diajukan</p>
            <p className="mt-0.5 text-sm text-white/80">
              {letterTypes.length} jenis surat dengan format resmi RT
            </p>
          </div>
          <ul className="divide-y divide-[var(--color-line)]">
            {letterTypes.map((letter) => (
              <li key={letter.code} className="flex gap-4 px-5 py-3.5">
                <span className="mt-0.5 w-12 shrink-0 text-sm font-bold text-[var(--color-primary)]">
                  {letter.code}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{letter.shortTitle}</p>
                  <p className="mt-0.5 text-sm leading-6 text-slate-500">{letter.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="cara-kerja">
        <h2 id="cara-kerja" className="text-2xl font-bold tracking-tight text-slate-900">
          Cara kerjanya
        </h2>
        <ol className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {steps.map((step, index) => (
            <li key={step.title} className="border-t-2 border-[var(--color-sky)] pt-4">
              <span className="text-sm font-bold text-[var(--color-primary)]">
                Langkah {index + 1}
              </span>
              <h3 className="mt-1 text-base font-bold text-slate-900">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{step.description}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-8 rounded-xl bg-[var(--color-primary)] px-5 py-10 text-white sm:px-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Untuk pengurus RT</h2>
          <p className="mt-3 text-sm leading-6 text-white/85 sm:text-base sm:leading-7">
            Semua pengajuan warga masuk ke satu tempat, jadi tidak ada lagi
            berkas yang tercecer di chat atau buku catatan.
          </p>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2">
          {adminTasks.map((task) => (
            <li key={task} className="flex gap-3 text-sm leading-6 text-white/95">
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-sky)]"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0Z"
                  clipRule="evenodd"
                />
              </svg>
              {task}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
