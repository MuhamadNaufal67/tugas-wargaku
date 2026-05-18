"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ToastContainer } from "@/components/Toast";
import { Button, LinkButton } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import {
  announcementCategories,
  createAnnouncement,
  formatAnnouncementCategory,
  formatAnnouncementDate,
  listAnnouncements,
  type AnnouncementCategory,
} from "@/lib/announcements";
import { logAuthError, logAuthWarning } from "@/lib/supabaseAuthErrors";
import type { AnnouncementRow } from "@/lib/supabaseClient";

type AnnouncementFormState = {
  category: AnnouncementCategory;
  content: string;
  title: string;
};

const initialFormState: AnnouncementFormState = {
  category: "Informasi RT",
  content: "",
  title: "",
};

export default function AdminAnnouncementsPage() {
  const router = useRouter();
  const { isAdmin, isLoading: isAuthLoading, supabase, user } = useAuth();
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [formData, setFormData] = useState<AnnouncementFormState>(initialFormState);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const { dismiss, showToast, toasts } = useToast();

  const loadAnnouncements = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const data = await listAnnouncements();
      setAnnouncements(data);
    } catch (error) {
      setErrorMessage("Daftar pengumuman belum dapat dimuat.");
      logAuthWarning("admin announcements.list failed", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!user) {
      router.replace("/login?redirect=/admin/pengumuman");
      return;
    }

    if (!isAdmin) {
      router.replace("/dashboard");
      return;
    }

    const timer = window.setTimeout(() => {
      void loadAnnouncements();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [isAdmin, isAuthLoading, loadAnnouncements, router, user]);

  useEffect(() => {
    if (!user || !isAdmin) {
      return;
    }

    const channel = supabase
      .channel(`admin-announcements:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "announcements",
        },
        () => {
          void loadAnnouncements();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isAdmin, loadAnnouncements, supabase, user]);

  function updateField<K extends keyof AnnouncementFormState>(
    key: K,
    value: AnnouncementFormState[K],
  ) {
    setFormData((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user || !isAdmin) {
      return;
    }

    const trimmedTitle = formData.title.trim();
    const trimmedContent = formData.content.trim();

    if (!trimmedTitle || !trimmedContent) {
      showToast(
        "warning",
        "Form belum lengkap",
        "Judul dan isi pengumuman wajib diisi.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const { announcement, notificationError } = await createAnnouncement({
        category: formData.category,
        content: trimmedContent,
        createdBy: user.id,
        title: trimmedTitle,
      });

      setAnnouncements((current) => [announcement, ...current]);
      setFormData(initialFormState);
      if (notificationError) {
        logAuthWarning(
          "admin announcements.notifyResidents failed",
          notificationError,
          { announcementId: announcement.id },
        );
        showToast(
          "warning",
          "Pengumuman diterbitkan",
          "Pengumuman sudah tersimpan, tetapi notifikasi warga belum semuanya terkirim.",
        );
      } else {
        showToast(
          "success",
          "Pengumuman diterbitkan",
          "Warga akan menerima notifikasi pengumuman baru.",
        );
      }
    } catch (error) {
      logAuthError("admin announcements.create failed", error, {
        category: formData.category,
      });
      showToast(
        "error",
        "Belum berhasil menerbitkan",
        "Pengumuman belum dapat disimpan. Silakan coba lagi.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isAuthLoading || (typeof window !== "undefined" && (!user || !isAdmin))) {
    return (
      <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="h-80 animate-pulse rounded-[1.7rem] border border-white/80 bg-white/95 shadow-sm" />
        <div className="h-80 animate-pulse rounded-[1.7rem] border border-white/80 bg-white/95 shadow-sm" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardContent className="space-y-5">
            <span className="inline-flex rounded-full bg-[var(--color-primary-soft)] px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-primary)]">
              Pengumuman Pengurus
            </span>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
                Bagikan kabar penting warga tanpa mengganggu alur layanan utama.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">
                Gunakan halaman ini untuk menerbitkan informasi RT, pengumuman
                layanan, agenda kegiatan, atau pemberitahuan darurat ke akun warga.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <LinkButton href="/admin">Kembali ke Dashboard</LinkButton>
              <LinkButton href="/pengumuman" variant="secondary">
                Lihat Halaman Warga
              </LinkButton>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-[1fr_13rem]">
                <div>
                  <label
                    htmlFor="announcement-title"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Judul Pengumuman
                  </label>
                  <input
                    id="announcement-title"
                    type="text"
                    value={formData.title}
                    onChange={(event) => updateField("title", event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-primary)] focus:bg-white"
                    placeholder="Contoh: Jadwal kerja bakti akhir pekan"
                  />
                </div>

                <div>
                  <label
                    htmlFor="announcement-category"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Kategori
                  </label>
                  <select
                    id="announcement-category"
                    value={formData.category}
                    onChange={(event) =>
                      updateField(
                        "category",
                        event.target.value as AnnouncementCategory,
                      )
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-primary)] focus:bg-white"
                  >
                    {announcementCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="announcement-content"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Isi Pengumuman
                </label>
                <textarea
                  id="announcement-content"
                  rows={7}
                  value={formData.content}
                  onChange={(event) => updateField("content", event.target.value)}
                  className="w-full rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-[var(--color-primary)] focus:bg-white"
                  placeholder="Tulis isi pengumuman yang ingin dibagikan ke warga..."
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-500">
                  Notifikasi akan otomatis dikirim ke akun warga aktif.
                </p>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Menerbitkan..." : "Terbitkan Pengumuman"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-950">Riwayat Pengumuman</h2>
              <p className="text-sm text-slate-500">
                Pengumuman terbaru yang telah diterbitkan untuk warga.
              </p>
            </div>
            <Button onClick={() => void loadAnnouncements()} variant="secondary">
              Refresh
            </Button>
          </div>

          {isLoading ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-36 animate-pulse rounded-[1.4rem] border border-slate-100 bg-slate-50"
                />
              ))}
            </div>
          ) : errorMessage ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {errorMessage}
            </div>
          ) : announcements.length === 0 ? (
            <EmptyState
              title="Belum ada pengumuman"
              description="Pengumuman pertama yang Anda terbitkan akan muncul di sini."
            />
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className="rounded-[1.4rem] border border-slate-200 bg-slate-50/80 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-bold text-slate-900">
                        {announcement.title}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {formatAnnouncementCategory(announcement.category)}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-slate-400">
                      {formatAnnouncementDate(announcement.created_at)}
                    </span>
                  </div>
                  <p className="mt-3 line-clamp-4 text-sm leading-6 text-slate-500">
                    {announcement.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
