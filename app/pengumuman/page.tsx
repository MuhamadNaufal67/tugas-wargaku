"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ToastContainer } from "@/components/Toast";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { CategoryChip, CategoryTile } from "@/components/ui/CategoryChip";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import {
  formatAnnouncementCategory,
  formatAnnouncementDate,
  getAnnouncementById,
  isRecentAnnouncement,
  listAnnouncements,
} from "@/lib/announcements";
import { logAuthWarning } from "@/lib/supabaseAuthErrors";
import type { AnnouncementRow } from "@/lib/supabaseClient";

export default function PengumumanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: isAuthLoading, supabase, user } = useAuth();
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [remoteSelectedAnnouncement, setRemoteSelectedAnnouncement] =
    useState<AnnouncementRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const { dismiss, showToast, toasts } = useToast();

  const announcementId = searchParams.get("announcement");

  const loadAnnouncements = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const data = await listAnnouncements();
      setAnnouncements(data);
    } catch (error) {
      setErrorMessage("Pengumuman belum dapat dimuat.");
      logAuthWarning("announcements.list failed", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.replace("/login?redirect=/pengumuman");
    }
  }, [isAuthenticated, isAuthLoading, router]);

  useEffect(() => {
    if (isAuthLoading || !isAuthenticated) {
      return;
    }

    const timer = window.setTimeout(() => {
      void loadAnnouncements();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [isAuthenticated, isAuthLoading, loadAnnouncements]);

  useEffect(() => {
    if (!announcementId) {
      return;
    }

    const localMatch =
      announcements.find((item) => item.id === announcementId) ?? null;
    if (localMatch) {
      return;
    }

    const requestedAnnouncementId = announcementId;
    let isCancelled = false;

    async function loadAnnouncementDetail() {
      setIsDetailLoading(true);

      try {
        const item = await getAnnouncementById(requestedAnnouncementId);

        if (!isCancelled) {
          setRemoteSelectedAnnouncement(item ?? null);
        }
      } catch (error) {
        logAuthWarning("announcements.detail failed", error, {
          announcementId: requestedAnnouncementId,
        });

        if (!isCancelled) {
          showToast(
            "warning",
            "Detail belum tersedia",
            "Pengumuman tidak ditemukan.",
          );
        }
      } finally {
        if (!isCancelled) {
          setIsDetailLoading(false);
        }
      }
    }

    void loadAnnouncementDetail();

    return () => {
      isCancelled = true;
    };
  }, [announcementId, announcements, showToast]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const channel = supabase
      .channel(`announcements:${user.id}`)
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
  }, [loadAnnouncements, supabase, user]);

  const latestAnnouncement = announcements[0] ?? null;
  const localSelectedAnnouncement = announcementId
    ? announcements.find((item) => item.id === announcementId) ?? null
    : null;
  const selectedCard = useMemo(
    () =>
      localSelectedAnnouncement ??
      (remoteSelectedAnnouncement?.id === announcementId
        ? remoteSelectedAnnouncement
        : null) ??
      latestAnnouncement,
    [announcementId, latestAnnouncement, localSelectedAnnouncement, remoteSelectedAnnouncement],
  );

  if (isAuthLoading || (!isAuthenticated && typeof window !== "undefined")) {
    return (
      <div aria-busy="true" aria-label="Memuat pengumuman" className="animate-pulse space-y-6">
        <div className="h-36 rounded-2xl bg-slate-200" />
        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="h-96 rounded-xl border border-[var(--color-line)] bg-white" />
          <div className="h-96 rounded-xl border border-[var(--color-line)] bg-white" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon="megaphone"
        title="Pengumuman RT"
        lead="Informasi dari pengurus, seperti jadwal kegiatan dan pemberitahuan penting. Pengumuman baru juga dikirim ke notifikasi Anda."
      />

      <div className="grid items-start gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <article
          aria-labelledby="announcement-detail-title"
          className="overflow-hidden rounded-xl border border-[var(--color-line)] bg-white lg:sticky lg:top-24 lg:order-2"
        >
          {isDetailLoading ? (
            <div aria-busy="true" className="animate-pulse space-y-3 p-6">
              <div className="h-4 w-32 rounded bg-slate-200" />
              <div className="h-7 w-3/4 rounded bg-slate-200" />
              <div className="h-40 rounded bg-slate-100" />
            </div>
          ) : selectedCard ? (
            <>
              <div className="flex items-center gap-4 border-b border-[var(--color-line)] bg-slate-50/70 px-5 py-4 sm:px-7">
                <CategoryTile category={selectedCard.category} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <CategoryChip category={formatAnnouncementCategory(selectedCard.category)} />
                    {isRecentAnnouncement(selectedCard.created_at) ? (
                      <span className="rounded-md bg-[var(--color-accent)] px-2 py-0.5 text-xs font-semibold text-white">
                        Baru
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-500">
                    <Icon name="calendar" className="h-4 w-4" />
                    {formatAnnouncementDate(selectedCard.created_at)}
                  </p>
                </div>
              </div>
              <div className="px-5 py-6 sm:px-7">
                <h2
                  id="announcement-detail-title"
                  className="text-xl font-bold leading-snug tracking-tight text-slate-900 sm:text-2xl"
                >
                  {selectedCard.title}
                </h2>
                <p className="mt-4 max-w-prose whitespace-pre-line text-[0.95rem] leading-7 text-slate-700">
                  {selectedCard.content}
                </p>
              </div>
              <div className="flex items-center gap-2 border-t border-[var(--color-line)] px-5 py-3 text-xs text-slate-500 sm:px-7">
                <Icon name="bell" className="h-4 w-4" />
                Pengumuman ini juga dikirim ke notifikasi akun Anda.
              </div>
            </>
          ) : (
            <div id="announcement-detail-title" className="p-5 sm:p-6">
              <EmptyState
                icon={<Icon name="megaphone" className="h-8 w-8" strokeWidth={1.5} />}
                title={isLoading ? "Memuat pengumuman…" : "Belum ada pengumuman"}
                description="Pengumuman yang diterbitkan pengurus akan tampil di sini."
              />
            </div>
          )}
        </article>

        <section aria-labelledby="announcement-list-title" className="lg:order-1">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="announcement-list-title" className="font-bold text-slate-900">
              Semua pengumuman
            </h2>
            {!isLoading && !errorMessage ? (
              <span className="text-sm text-slate-500">{announcements.length} pengumuman</span>
            ) : null}
          </div>

          {isLoading ? (
            <div className="space-y-2" aria-busy="true">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-24 animate-pulse rounded-xl border border-[var(--color-line)] bg-white"
                />
              ))}
            </div>
          ) : errorMessage ? (
            <div role="alert" className="flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <Icon name="alert" className="mt-0.5 h-5 w-5 shrink-0" />
              {errorMessage}
            </div>
          ) : announcements.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[var(--color-line)] px-4 py-6 text-center text-sm text-slate-500">
              Belum ada pengumuman.
            </p>
          ) : (
            <ul className="space-y-2">
              {announcements.map((item) => {
                const isActive = selectedCard?.id === item.id;
                const isRecent = isRecentAnnouncement(item.created_at);

                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      aria-current={isActive ? "true" : undefined}
                      onClick={() => {
                        router.replace(`/pengumuman?announcement=${item.id}`, {
                          scroll: false,
                        });
                        if (window.matchMedia("(max-width: 1023px)").matches) {
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }
                      }}
                      className={`flex w-full gap-3 rounded-xl border bg-white p-3.5 text-left transition-colors ${
                        isActive
                          ? "border-[var(--color-primary)] ring-3 ring-[var(--color-primary)]/10"
                          : "border-[var(--color-line)] hover:border-[var(--color-sky)]"
                      }`}
                    >
                      <CategoryTile category={item.category} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-xs text-slate-500">
                          <span className="font-semibold text-slate-600">
                            {formatAnnouncementCategory(item.category)}
                          </span>
                          {isRecent ? (
                            <span className="rounded bg-[var(--color-accent)] px-1.5 py-px text-[0.65rem] font-semibold text-white">
                              Baru
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-0.5 block text-sm font-semibold text-slate-900">{item.title}</span>
                        <span className="mt-0.5 line-clamp-2 block text-sm leading-6 text-slate-500">
                          {item.content}
                        </span>
                        <span className="mt-1.5 block text-xs text-slate-400">
                          {formatAnnouncementDate(item.created_at)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
