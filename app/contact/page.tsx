"use client";

import { useState, type FormEvent } from "react";
import { ToastContainer } from "@/components/Toast";
import { useToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";

const contactDetails: { icon: IconName; label: string; value: string }[] = [
  { icon: "mail", label: "Email", value: "halo@wargaku.id" },
  { icon: "clock", label: "Jam layanan", value: "08.00–17.00 WIB" },
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
    <div className="space-y-10 sm:space-y-12">
      <PageHeader
        icon="help"
        title="Bantuan"
        lead="Cari jawabannya di bawah, atau kirim pesan ke pengurus jika masih ada yang belum jelas."
      />

      <div className="grid items-start gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-8">
          <section aria-labelledby="faq-title">
            <h2 id="faq-title" className="text-xl font-bold tracking-tight text-slate-900">
              Pertanyaan yang sering diajukan
            </h2>
            <div className="mt-4 space-y-3">
              {faqs.map((item, index) => (
                <details
                  key={item.question}
                  open={index === 0}
                  className="group rounded-xl border border-[var(--color-line)] bg-white open:border-[var(--color-sky)]"
                >
                  <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-900 sm:px-5 [&::-webkit-details-marker]:hidden">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                      <Icon name="help" className="h-4 w-4" />
                    </span>
                    <span className="flex-1">{item.question}</span>
                    <Icon
                      name="chevronRight"
                      className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-90"
                    />
                  </summary>
                  <p className="px-4 pb-4 pl-[3.75rem] text-sm leading-6 text-slate-600 sm:px-5 sm:pl-[4.25rem]">
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          </section>

          <section aria-label="Kontak" className="grid gap-4 sm:grid-cols-2">
            {contactDetails.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-4 rounded-xl border border-[var(--color-line)] bg-white p-4"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[var(--color-accent)]">
                  <Icon name={item.icon} />
                </span>
                <div>
                  <p className="text-sm text-slate-500">{item.label}</p>
                  <p className="text-sm font-semibold text-slate-900">{item.value}</p>
                </div>
              </div>
            ))}
          </section>
        </div>

        <section
          aria-labelledby="message-title"
          className="rounded-xl border border-[var(--color-line)] bg-white p-5 sm:p-6 lg:sticky lg:top-24"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)] text-white">
              <Icon name="mail" />
            </span>
            <div>
              <h2 id="message-title" className="text-lg font-bold text-slate-900">
                Kirim pesan
              </h2>
              <p className="text-sm text-slate-500">Pesan akan dibuka di aplikasi email Anda.</p>
            </div>
          </div>
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
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
                placeholder="Tulis pertanyaan atau kendala Anda"
                className="input"
              />
            </div>

            <Button type="submit" variant="accent" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Membuka email…" : "Kirim pesan"}
            </Button>
          </form>
        </section>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
