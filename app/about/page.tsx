import { Card, CardContent } from "@/components/ui/Card";

const tujuanItems = [
  "Memodernisasi layanan administrasi tingkat RT agar lebih cepat, terdokumentasi, dan mudah dipantau.",
  "Mengurangi proses manual yang rawan antrean, salah catat, dan duplikasi pertanyaan dari warga.",
  "Menyediakan pengalaman digital yang tetap sederhana bagi warga, namun tetap memudahkan pengurus dalam melayani.",
];

const benefitItems = [
  "Pengajuan surat lebih tertib dari sisi data, status, dan histori perubahan.",
  "Warga memperoleh transparansi progres layanan tanpa harus menunggu kabar manual.",
  "Pengurus RT memiliki kendali yang lebih rapi atas status layanan, catatan perbaikan, pemberitahuan, dan penyelesaian surat.",
];

const values = [
  {
    title: "Rapi",
    description: "Semua proses tersusun dari form, status, alasan penolakan, hingga download surat jadi.",
  },
  {
    title: "Jelas",
    description: "Setiap perubahan status disertai notifikasi dan jalur tindak lanjut yang mudah dipahami.",
  },
  {
    title: "Mudah Dipakai",
    description: "Bahasa, alur, dan tampilan dirancang agar terasa akrab bagi warga dan tetap efisien bagi pengurus.",
  },
];

export default function AboutPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/80 bg-white/92 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-8 lg:p-10">
        <span className="inline-flex rounded-full bg-[var(--color-primary-soft)] px-4 py-2 text-sm font-semibold text-[var(--color-primary)]">
          Tentang WargaKu
        </span>
        <h1 className="mt-5 max-w-4xl text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">
          Platform administrasi RT digital yang dirancang agar layanan warga lebih cepat, transparan, dan siap tumbuh.
        </h1>
        <p className="mt-6 max-w-4xl text-base leading-8 text-slate-600 sm:text-lg">
          WargaKu menghadirkan pengajuan surat, pemantauan proses, pemberitahuan otomatis,
          catatan perbaikan yang jelas, dan unduhan surat selesai dalam satu pengalaman yang modern
          namun tetap mudah digunakan.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">Tujuan</h2>
            <div className="space-y-3">
              {tujuanItems.map((item, index) => (
                <article
                  key={item}
                  className="flex items-start gap-4 rounded-[1.4rem] border border-slate-200 bg-slate-50/80 p-4"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] text-sm font-bold text-[var(--color-primary)]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <p className="text-sm leading-7 text-slate-600 sm:text-base">{item}</p>
                </article>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">Manfaat</h2>
            <div className="space-y-3">
              {benefitItems.map((item, index) => (
                <article
                  key={item}
                  className="flex items-start gap-4 rounded-[1.4rem] border border-orange-100 bg-[linear-gradient(135deg,_#fff4ea_0%,_#ffffff_60%)] p-4"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-sm font-bold text-orange-500">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <p className="text-sm leading-7 text-slate-600 sm:text-base">{item}</p>
                </article>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {values.map((item) => (
          <Card key={item.title}>
            <CardContent>
              <p className="text-2xl font-extrabold text-slate-950">{item.title}</p>
              <p className="mt-3 text-sm leading-7 text-slate-500">{item.description}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
