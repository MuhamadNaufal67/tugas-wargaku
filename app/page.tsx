import Link from "next/link";
import { LinkButton } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { LETTER_TEMPLATE_META, type LetterTemplateKey } from "@/constants/templateSurat";

const letterIcons: Record<LetterTemplateKey, IconName> = {
  domisili: "home",
  usaha: "briefcase",
  tidak_mampu: "heart",
  pengantar_rt: "send",
  umum: "clipboard",
};

const letterTypes = (Object.keys(LETTER_TEMPLATE_META) as LetterTemplateKey[]).map((key) => ({
  key,
  icon: letterIcons[key],
  ...LETTER_TEMPLATE_META[key],
}));

const steps: { icon: IconName; title: string; description: string }[] = [
  {
    icon: "userPlus",
    title: "Buat akun",
    description: "Daftar dengan email, NIK, dan alamat. Data ini dipakai untuk mengisi formulir surat.",
  },
  {
    icon: "file",
    title: "Ajukan surat",
    description: "Pilih jenis surat, periksa data diri, lalu kirim. Tidak perlu datang ke rumah pengurus.",
  },
  {
    icon: "bell",
    title: "Pantau statusnya",
    description: "Anda diberi tahu setiap kali status berubah: menunggu, diproses, selesai, atau ditolak.",
  },
  {
    icon: "download",
    title: "Unduh surat",
    description: "Setelah selesai, surat tersedia dalam bentuk PDF dan siap dicetak.",
  },
];

const adminTasks = [
  "Melihat semua pengajuan warga dan mencarinya berdasarkan nama atau NIK",
  "Mengubah status dan menulis catatan jika data perlu diperbaiki",
  "Membuat surat PDF bernomor otomatis saat pengajuan selesai",
  "Mengirim pengumuman yang langsung masuk ke notifikasi warga",
];

function LetterIllustration() {
  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-sm select-none lg:max-w-none">
      <div className="absolute -right-6 -top-8 h-40 w-40 rounded-full bg-[var(--color-sky)]/50" />
      <div className="absolute -bottom-6 -left-4 h-24 w-24 rounded-full bg-[var(--color-accent)]/80" />

      <div className="relative rotate-[1.5deg] rounded-lg bg-white p-5 shadow-[0_20px_50px_-12px_rgba(13,51,76,0.45)] sm:p-6">
        <div className="flex items-center gap-3 border-b-2 border-double border-slate-300 pb-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-white">
            <Icon name="users" className="h-4 w-4" />
          </div>
          <div className="flex-1 space-y-1.5">
            <div className="mx-auto h-1.5 w-3/5 rounded bg-slate-300" />
            <div className="mx-auto h-2 w-4/5 rounded bg-slate-400" />
            <div className="mx-auto h-1.5 w-2/5 rounded bg-slate-200" />
          </div>
        </div>

        <p className="mt-4 text-center text-[0.7rem] font-extrabold tracking-wide text-slate-800">
          SURAT KETERANGAN DOMISILI
        </p>
        <p className="mt-0.5 text-center text-[0.6rem] text-slate-400">Nomor: 012/SKD/XI/2026</p>

        <div className="mt-4 space-y-2">
          {["w-full", "w-11/12", "w-4/5"].map((width) => (
            <div key={width} className={`h-1.5 rounded bg-slate-200 ${width}`} />
          ))}
        </div>
        <div className="mt-3 space-y-2">
          {[
            ["Nama", "w-28"],
            ["NIK", "w-32"],
            ["Alamat", "w-24"],
          ].map(([label, width]) => (
            <div key={label} className="flex items-center gap-3">
              <span className="w-12 text-[0.6rem] text-slate-400">{label}</span>
              <div className={`h-1.5 rounded bg-slate-300 ${width}`} />
            </div>
          ))}
        </div>
        <div className="mt-3 space-y-2">
          <div className="h-1.5 w-full rounded bg-slate-200" />
          <div className="h-1.5 w-3/4 rounded bg-slate-200" />
        </div>

        <div className="mt-5 flex justify-end">
          <div className="relative w-28 text-center">
            <p className="text-[0.6rem] text-slate-500">Ketua RT</p>
            <div className="absolute -left-4 top-2 flex h-12 w-12 -rotate-12 items-center justify-center rounded-full border-2 border-[var(--color-primary)]/50 text-[0.5rem] font-bold text-[var(--color-primary)]/60">
              RT
            </div>
            <svg viewBox="0 0 100 30" className="mx-auto mt-1 h-7 w-20 text-slate-700" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M5 20c8-14 14-14 16-4s6 8 12-6 10-6 12 4 8 6 14-8 12-2 14 6 8 4 22-2" />
            </svg>
            <div className="mx-auto mt-1 h-1.5 w-20 rounded bg-slate-300" />
          </div>
        </div>
      </div>

      <div className="absolute -bottom-5 -left-3 flex items-center gap-3 rounded-xl bg-white px-3.5 py-3 shadow-lg sm:-left-10">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <Icon name="check" className="h-5 w-5" strokeWidth={2.5} />
        </span>
        <div>
          <p className="text-xs font-bold text-slate-900">Surat selesai</p>
          <p className="text-[0.7rem] text-slate-500">Siap diunduh sebagai PDF</p>
        </div>
      </div>

      <div className="absolute -right-3 -top-6 hidden items-center gap-2.5 rounded-xl bg-white px-3 py-2.5 shadow-lg sm:flex lg:-right-10">
        <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
          <Icon name="bell" className="h-4 w-4" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[var(--color-accent)]" />
        </span>
        <p className="text-[0.7rem] font-semibold text-slate-700">Status berubah: Diproses</p>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="space-y-16 sm:space-y-24">
      <section className="relative overflow-hidden rounded-2xl bg-[var(--color-primary)] px-5 py-10 text-white sm:px-10 sm:py-14 lg:px-14">
        <div aria-hidden="true" className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-white/5" />
        <div className="relative grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-white/90">
              <Icon name="smartphone" className="h-4 w-4" />
              Bisa dari HP, kapan saja
            </p>
            <h1 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-[2.85rem] lg:leading-[1.12]">
              Ajukan surat RT dari rumah, pantau sampai suratnya jadi.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-white/85">
              WargaKu menghubungkan warga dengan pengurus RT. Kirim pengajuan
              surat secara online, lihat perkembangannya, dan unduh suratnya
              dalam bentuk PDF ketika sudah selesai.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <LinkButton href="/ajukan-surat" variant="accent" className="sm:px-6">
                Ajukan surat
              </LinkButton>
              <Link
                href="/login"
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/40 px-6 text-sm font-semibold text-white hover:bg-white/10"
              >
                Masuk atau daftar
              </Link>
            </div>
          </div>

          <div className="px-4 pb-4 sm:px-8 lg:px-4">
            <LetterIllustration />
          </div>
        </div>
      </section>

      <section aria-labelledby="jenis-surat">
        <div className="max-w-2xl">
          <h2 id="jenis-surat" className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {letterTypes.length} jenis surat yang bisa diajukan
          </h2>
          <p className="mt-2 text-slate-600">
            Setiap surat dibuat dengan kop resmi RT dan nomor surat otomatis.
          </p>
        </div>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {letterTypes.map((letter) => (
            <li
              key={letter.key}
              className="flex flex-col rounded-xl border border-[var(--color-line)] bg-white p-5 hover:border-[var(--color-sky)]"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                  <Icon name={letter.icon} className="h-5 w-5" />
                </span>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">
                  {letter.code}
                </span>
              </div>
              <h3 className="mt-4 text-[0.95rem] font-bold leading-snug text-slate-900">
                {letter.shortTitle}
              </h3>
              <p className="mt-1.5 text-sm leading-6 text-slate-500">{letter.description}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="cara-kerja">
        <div className="max-w-2xl">
          <h2 id="cara-kerja" className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Cara kerjanya
          </h2>
          <p className="mt-2 text-slate-600">Empat langkah dari daftar sampai surat di tangan.</p>
        </div>
        <div className="relative mt-10">
        <ol className="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <li key={step.title} className="relative flex gap-4 lg:block">
              {index < steps.length - 1 ? (
                <span
                  aria-hidden="true"
                  className="absolute left-[4.25rem] right-[-1.75rem] top-7 hidden border-t-2 border-dashed border-[var(--color-sky)] lg:block"
                />
              ) : null}
              <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-4 border-[var(--color-surface)] bg-[var(--color-primary)] text-white">
                <Icon name={step.icon} className="h-6 w-6" />
                <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-accent)] text-xs font-bold text-white">
                  {index + 1}
                </span>
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900 lg:mt-5">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-slate-600">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
        </div>
      </section>

      <section className="grid gap-8 rounded-2xl border border-[var(--color-line)] bg-white p-6 sm:p-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
        <div>
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
            <Icon name="users" className="h-6 w-6" />
          </span>
          <h2 className="mt-5 text-2xl font-bold tracking-tight text-slate-900">Untuk pengurus RT</h2>
          <p className="mt-3 leading-7 text-slate-600">
            Semua pengajuan warga masuk ke satu tempat, jadi tidak ada lagi
            berkas yang tercecer di chat atau buku catatan.
          </p>
        </div>
        <ul className="grid gap-x-8 gap-y-5 self-center sm:grid-cols-2">
          {adminTasks.map((task) => (
            <li key={task} className="flex gap-3 text-sm leading-6 text-slate-700">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <Icon name="check" className="h-3.5 w-3.5" strokeWidth={3} />
              </span>
              {task}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col items-start gap-6 rounded-2xl bg-[var(--color-accent)] px-6 py-9 text-white sm:flex-row sm:items-center sm:justify-between sm:px-10">
        <div>
          <h2 className="text-xl font-bold sm:text-2xl">Butuh surat pengantar hari ini?</h2>
          <p className="mt-1.5 text-white/90">Isi formulirnya sekarang, pengurus akan langsung menerimanya.</p>
        </div>
        <Link
          href="/ajukan-surat"
          className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-6 text-sm font-bold text-[var(--color-accent-strong)] hover:bg-orange-50 sm:w-auto"
        >
          Mulai pengajuan
          <Icon name="chevronRight" className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}
