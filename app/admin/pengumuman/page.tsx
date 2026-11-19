"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ToastContainer } from "@/components/Toast";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { CategoryChip, CategoryTile, getCategoryStyle } from "@/components/ui/CategoryChip";
import { Icon } from "@/components/ui/Icon";
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
        <div className="h-36 rounded-2xl bg-slate-200" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-96 rounded-xl border border-[var(--color-line)] bg-white" />
          <div className="h-96 rounded-xl border border-[var(--color-line)] bg-white" />
        </div>
      </div>
    );
  }

  const previewTitle = formData.title.trim() || "Judul pengumuman";
  const previewContent =
    formData.content.trim() || "Isi pengumuman akan tampil di sini saat Anda mulai menulis.";

  return (
    <div className="space-y-6">
      <PageHeader
        icon="megaphone"
        title="Pengumuman"
        lead="Tulis informasi untuk warga. Setelah diterbitkan, pengumuman tampil di halaman warga dan dikirim sebagai notifikasi ke setiap akun warga."
      />

      <div className="grid items-start gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <section
            aria-labelledby="new-announcement"
            className="rounded-xl border border-[var(--color-line)] bg-white p-5 sm:p-6"
          >
            <h2 id="new-announcement" className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Icon name="file" className="h-5 w-5 text-[var(--color-primary)]" />
              Tulis pengumuman baru
            </h2>
            <form className="mt-5 space-y-5" onSubmit={handleSubmit}>
              <fieldset>
                <legend className="label">Kategori</legend>
                <div className="flex flex-wrap gap-2">
                  {announcementCategories.map((category) => {
                    const isSelected = formData.category === category;
                    const style = getCategoryStyle(category);

                    return (
                      <label
                        key={category}
                        className={`flex min-h-11 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-3.5 text-sm font-semibold has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-[var(--color-primary)]/30 ${
                          isSelected
                            ? `${style.tile} border-current`
                            : "border-[var(--color-line)] text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="announcement-category"
                          value={category}
                          checked={isSelected}
                          onChange={(event) =>
                            updateField("category", event.target.value as AnnouncementCategory)
                          }
                          className="sr-only"
                        />
                        <Icon name={style.icon} className="h-4 w-4" />
                        {category}
                      </label>
                    );
                  })}
                </div>
              </fieldset>

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
                <div className="flex items-baseline justify-between">
                  <label htmlFor="announcement-content" className="label">
                    Isi pengumuman
                  </label>
                  <span className="text-xs tabular-nums text-slate-400">
                    {formData.content.length} karakter
                  </span>
                </div>
                <textarea
                  id="announcement-content"
                  rows={7}
                  value={formData.content}
                  onChange={(event) => updateField("content", event.target.value)}
                  className="input leading-6"
                  placeholder="Tulis waktu, tempat, dan apa yang perlu disiapkan warga."
                />
              </div>

              <div className="flex flex-col gap-3 border-t border-[var(--color-line)] pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-center gap-2 text-sm text-slate-500">
                  <Icon name="bell" className="h-4 w-4 shrink-0" />
                  Semua warga akan menerima notifikasi.
                </p>
                <Button type="submit" variant="accent" disabled={isSubmitting} className="w-full sm:w-auto" icon={<Icon name="send" className="h-4 w-4" />}>
                  {isSubmitting ? "Menerbitkan…" : "Terbitkan"}
                </Button>
              </div>
            </form>
          </section>

          <section aria-labelledby="preview-title">
            <h2 id="preview-title" className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
              <Icon name="eye" className="h-4 w-4 text-slate-500" />
              Pratinjau untuk warga
            </h2>
            <div className="overflow-hidden rounded-xl border border-dashed border-[var(--color-sky)] bg-white">
              <div className="flex items-center gap-3 border-b border-[var(--color-line)] bg-slate-50/70 px-5 py-3">
                <CategoryTile category={formData.category} size="sm" />
                <CategoryChip category={formData.category} />
              </div>
              <div className="px-5 py-4">
                <p className={`font-bold ${formData.title.trim() ? "text-slate-900" : "text-slate-400"}`}>
                  {previewTitle}
                </p>
                <p
                  className={`mt-2 whitespace-pre-line text-sm leading-6 ${
                    formData.content.trim() ? "text-slate-700" : "text-slate-400"
                  }`}
                >
                  {previewContent}
                </p>
              </div>
            </div>
          </section>
        </div>

        <section aria-labelledby="announcement-history" className="rounded-xl border border-[var(--color-line)] bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--color-line)] px-5 py-3 sm:px-6">
            <h2 id="announcement-history" className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Icon name="clock" className="h-5 w-5 text-[var(--color-accent)]" />
              Sudah diterbitkan
              {!isLoading && !errorMessage ? (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
                  {announcements.length}
                </span>
              ) : null}
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
              <div role="alert" className="flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <Icon name="alert" className="mt-0.5 h-5 w-5 shrink-0" />
                {errorMessage}
              </div>
            </div>
          ) : announcements.length === 0 ? (
            <div className="p-5 sm:px-6">
              <EmptyState
                icon={<Icon name="megaphone" className="h-8 w-8" strokeWidth={1.5} />}
                title="Belum ada pengumuman"
                description="Pengumuman pertama yang Anda terbitkan akan muncul di sini."
              />
            </div>
          ) : (
            <ul className="divide-y divide-[var(--color-line)]">
              {announcements.map((announcement) => (
                <li key={announcement.id} className="flex gap-3 px-5 py-4 sm:px-6">
                  <CategoryTile category={announcement.category} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <CategoryChip category={formatAnnouncementCategory(announcement.category)} />
                      <span className="text-xs text-slate-400">
                        {formatAnnouncementDate(announcement.created_at)}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm font-semibold text-slate-900">{announcement.title}</p>
                    <p className="mt-0.5 line-clamp-3 text-sm leading-6 text-slate-500">
                      {announcement.content}
                    </p>
                  </div>
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
