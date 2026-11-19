"use client";

import { useState, type FormEvent } from "react";
import { ToastContainer } from "@/components/Toast";
import { useToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/Button";

const contactDetails = [
  { label: "Email", value: "halo@wargaku.id" },
  { label: "Jam layanan", value: "08.00–17.00 WIB" },
];

const faqs = [
  {
    question: "Berapa lama surat saya diproses?",
    answer:
      "Tergantung kesibukan pengurus. Anda bisa melihat posisinya kapan saja di halaman Status Pengajuan, dan akan mendapat notifikasi setiap kali statusnya berubah.",
  },
  {
    question: "Pengajuan saya ditolak. Apa yang harus dilakukan?",
    answer:
      "Buka pengajuan tersebut di halaman Status Pengajuan untuk membaca catatan dari pengurus. Tekan Ajukan ulang, perbaiki datanya, lalu kirim kembali.",
  },
  {
    question: "Di mana saya mengambil suratnya?",
    answer:
      "Tidak perlu diambil. Setelah statusnya Selesai, tombol Unduh surat muncul dan surat bisa disimpan sebagai PDF lalu dicetak.",
  },
  {
    question: "Data NIK saya salah saat mendaftar.",
    answer:
      "Anda bisa memperbaikinya langsung di formulir pengajuan. Data yang dikirim bersama pengajuan terakhir akan tersimpan ke akun Anda.",
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
      showToast("warning", "Formulir belum lengkap", "Isi nama, email, dan pesan terlebih dahulu.");
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
      "Membuka aplikasi email",
      "Pesan Anda sudah disiapkan. Tekan kirim di aplikasi email.",
    );
    setFormData({
      email: "",
      message: "",
      name: "",
    });
    setIsSubmitting(false);
  }

  return (
    <div className="space-y-12">
      <header className="max-w-2xl">
        <h1 className="page-title">Bantuan</h1>
        <p className="page-lead">
          Cari jawabannya di bawah, atau kirim pesan ke pengurus jika masih
          ada yang belum jelas.
        </p>
      </header>

      <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <section aria-labelledby="faq-title">
          <h2 id="faq-title" className="section-title">
            Pertanyaan yang sering diajukan
          </h2>
          <div className="mt-4 divide-y divide-[var(--color-line)] rounded-xl border border-[var(--color-line)] bg-white">
            {faqs.map((item) => (
              <details key={item.question} className="group px-4 sm:px-5">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 text-sm font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
                  {item.question}
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180"
                    fill="currentColor"
                  >
                    <path d="M5.2 7.2a1 1 0 0 1 1.4 0L10 10.6l3.4-3.4a1 1 0 1 1 1.4 1.4l-4.1 4.1a1 1 0 0 1-1.4 0L5.2 8.6a1 1 0 0 1 0-1.4Z" />
                  </svg>
                </summary>
                <p className="pb-4 text-sm leading-6 text-slate-600">{item.answer}</p>
              </details>
            ))}
          </div>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            {contactDetails.map((item) => (
              <div key={item.label}>
                <dt className="text-sm text-slate-500">{item.label}</dt>
                <dd className="mt-0.5 text-sm font-semibold text-slate-900">{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section
          aria-labelledby="message-title"
          className="rounded-xl border border-[var(--color-line)] bg-white p-5 sm:p-6"
        >
          <h2 id="message-title" className="section-title">
            Kirim pesan
          </h2>
          <p className="section-lead">
            Pesan akan dibuka di aplikasi email Anda.
          </p>
          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="name" className="label">
                Nama
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                value={formData.name}
                onChange={(event) => updateField("name", event.target.value)}
                className="input"
              />
            </div>
            <div>
              <label htmlFor="email" className="label">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={formData.email}
                onChange={(event) => updateField("email", event.target.value)}
                placeholder="nama@email.com"
                className="input"
              />
            </div>
            <div>
              <label htmlFor="message" className="label">
                Pesan
              </label>
              <textarea
                id="message"
                name="message"
                rows={5}
                value={formData.message}
                onChange={(event) => updateField("message", event.target.value)}
                className="input"
              />
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? "Membuka email…" : "Kirim pesan"}
            </Button>
          </form>
        </section>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
