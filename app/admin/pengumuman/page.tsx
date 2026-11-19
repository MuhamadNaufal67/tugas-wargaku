"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ToastContainer } from "@/components/Toast";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
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
      <div aria-busy="true" aria-label="Memuat halaman" className="animate-pulse space-y-6">
        <div className="h-8 w-56 rounded-md bg-slate-200" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-80 rounded-xl border border-[var(--color-line)] bg-white" />
          <div className="h-80 rounded-xl border border-[var(--color-line)] bg-white" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon="megaphone"
        title="Pengumuman"
        lead="Tulis informasi untuk warga. Setelah diterbitkan, pengumuman tampil di halaman warga dan dikirim sebagai notifikasi ke setiap akun warga."
      />

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_1fr]">
        <section
          aria-labelledby="new-announcement"
          className="rounded-xl border border-[var(--color-line)] bg-white p-5 sm:p-6"
        >
          <h2 id="new-announcement" className="section-title">
            Pengumuman baru
          </h2>
          <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="announcement-title" className="label">
                Judul
              </label>
              <input
                id="announcement-title"
                type="text"
                value={formData.title}
                onChange={(event) => updateField("title", event.target.value)}
                className="input"
                placeholder="Contoh: Kerja bakti hari Minggu"
              />
            </div>

            <div>
              <label htmlFor="announcement-category" className="label">
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
                className="input"
              >
                {announcementCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="announcement-content" className="label">
                Isi pengumuman
              </label>
              <textarea
                id="announcement-content"
                rows={7}
                value={formData.content}
                onChange={(event) => updateField("content", event.target.value)}
                className="input leading-6"
                placeholder="Tulis waktu, tempat, dan apa yang perlu disiapkan warga."
              />
            </div>

            <div className="flex justify-end border-t border-[var(--color-line)] pt-4">
              <Button type="submit" variant="accent" disabled={isSubmitting} className="w-full sm:w-auto">
                {isSubmitting ? "Menerbitkan…" : "Terbitkan"}
              </Button>
            </div>
          </form>
        </section>

        <section aria-labelledby="announcement-history" className="rounded-xl border border-[var(--color-line)] bg-white">
          <div className="flex items-center justify-between gap-3 px-5 pt-5 sm:px-6">
            <h2 id="announcement-history" className="section-title">
              Sudah diterbitkan
            </h2>
            <Button onClick={() => void loadAnnouncements()} variant="secondary" size="sm">
              Muat ulang
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-2 p-5 sm:px-6" aria-busy="true">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-20 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          ) : errorMessage ? (
            <div className="p-5 sm:px-6">
              <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            </div>
          ) : announcements.length === 0 ? (
            <div className="p-5 sm:px-6">
              <EmptyState
                title="Belum ada pengumuman"
                description="Pengumuman pertama yang Anda terbitkan akan muncul di sini."
              />
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-[var(--color-line)] border-t border-[var(--color-line)]">
              {announcements.map((announcement) => (
                <li key={announcement.id} className="px-5 py-3.5 sm:px-6">
                  <p className="text-xs text-slate-500">
                    {formatAnnouncementCategory(announcement.category)} &middot;{" "}
                    {formatAnnouncementDate(announcement.created_at)}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {announcement.title}
                  </p>
                  <p className="mt-0.5 line-clamp-3 text-sm leading-6 text-slate-500">
                    {announcement.content}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
