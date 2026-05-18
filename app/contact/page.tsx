"use client";

import { useState, type FormEvent } from "react";
import { ToastContainer } from "@/components/Toast";
import { useToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";

const infoCards = [
  {
    title: "Email Layanan",
    value: "halo@wargaku.id",
    detail: "Untuk bantuan penggunaan aplikasi dan pertanyaan layanan warga.",
  },
  {
    title: "Jam Pelayanan",
    value: "08.00 - 17.00 WIB",
    detail: "Waktu layanan utama untuk membantu pengajuan dan kebutuhan administrasi warga.",
  },
  {
    title: "Kontak Pengurus",
    value: "WhatsApp / Email",
    detail: "Saluran yang memudahkan warga menghubungi pengurus lingkungan.",
  },
];

const faqs = [
  {
    question: "Bagaimana jika saya butuh bantuan saat mengajukan surat?",
    answer:
      "Silakan hubungi pengurus atau petugas layanan melalui kontak yang tersedia. Tim akan membantu memeriksa data dan langkah yang perlu dilakukan.",
  },
  {
    question: "Apakah saya bisa memantau perkembangan pengajuan dari aplikasi?",
    answer:
      "Bisa. Setiap pengajuan memiliki status yang dapat dipantau, sehingga warga mengetahui apakah layanan sedang diperiksa, perlu perbaikan, atau sudah selesai.",
  },
  {
    question: "Bagaimana jika data pengajuan saya perlu diperbaiki?",
    answer:
      "Jika pengajuan perlu diperbaiki, Anda akan menerima pemberitahuan beserta catatan yang membantu Anda melengkapi data sebelum mengajukan ulang.",
  },
];

export default function ContactPage() {
  const { toasts, showToast, dismiss } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    message: "",
    name: "",
  });

  function updateField(key: "email" | "message" | "name", value: string) {
    setFormData((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      showToast("warning", "Form belum lengkap", "Lengkapi nama, email, dan pesan terlebih dahulu.");
      return;
    }

    setIsSubmitting(true);

    const subject = encodeURIComponent(`Kontak WargaKu dari ${formData.name.trim()}`);
    const body = encodeURIComponent(
      `Nama: ${formData.name.trim()}\nEmail: ${formData.email.trim()}\n\nPesan:\n${formData.message.trim()}`,
    );

    window.location.href = `mailto:halo@wargaku.id?subject=${subject}&body=${body}`;

    showToast(
      "success",
      "Pesan siap dikirim",
      "Aplikasi email Anda akan terbuka untuk menghubungi pengurus atau petugas layanan.",
    );
    setFormData({
      email: "",
      message: "",
      name: "",
    });
    setIsSubmitting(false);
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="overflow-hidden bg-[linear-gradient(160deg,_#1f6ba5_0%,_#2d81c1_55%,_#69addf_100%)] text-white shadow-[0_20px_70px_rgba(31,107,165,0.24)]">
          <CardContent className="space-y-5">
            <span className="inline-flex rounded-full bg-white/16 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/84">
              Bantuan Layanan
            </span>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
              Butuh bantuan administrasi atau informasi layanan warga?
            </h1>
            <p className="max-w-xl text-base leading-8 text-white/82 sm:text-lg">
              Gunakan form di samping untuk menghubungi pengurus atau petugas layanan terkait
              pengajuan surat, informasi warga, atau bantuan penggunaan aplikasi.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h2 className="text-2xl font-bold text-slate-900">Kirim Pesan</h2>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              Pesan akan diarahkan ke aplikasi email Anda agar dapat langsung dikirim.
            </p>
            <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="name" className="mb-2 block text-sm font-semibold text-slate-700">
                  Nama
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="Masukkan nama Anda"
                  className="w-full rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none transition focus:border-[var(--color-primary)] focus:bg-white"
                />
              </div>
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-700">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  placeholder="Masukkan email Anda"
                  className="w-full rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none transition focus:border-[var(--color-primary)] focus:bg-white"
                />
              </div>
              <div>
                <label htmlFor="message" className="mb-2 block text-sm font-semibold text-slate-700">
                  Pesan
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={6}
                  value={formData.message}
                  onChange={(event) => updateField("message", event.target.value)}
                  placeholder="Tulis pesan Anda"
                  className="w-full rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none transition focus:border-[var(--color-primary)] focus:bg-white"
                />
              </div>

              <Button type="submit" disabled={isSubmitting} variant="primary">
                {isSubmitting ? "Memproses..." : "Kirim Pesan"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {infoCards.map((item) => (
          <Card key={item.title}>
            <CardContent>
              <p className="text-sm font-semibold text-slate-500">{item.title}</p>
              <p className="mt-2 text-xl font-extrabold text-slate-950">{item.value}</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">{item.detail}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {faqs.map((item) => (
          <Card key={item.question}>
            <CardContent>
              <h2 className="text-lg font-bold text-slate-900">{item.question}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-500">{item.answer}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
