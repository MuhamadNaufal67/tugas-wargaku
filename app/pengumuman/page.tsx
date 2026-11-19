"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ToastContainer } from "@/components/Toast";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import {
  formatAnnouncementCategory,
  formatAnnouncementDate,
  getAnnouncementById,
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
        <div className="h-8 w-48 rounded-md bg-slate-200" />
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
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
        title="Pengumuman RT"
        lead="Informasi dari pengurus, seperti jadwal kegiatan dan pemberitahuan penting. Pengumuman baru juga dikirim ke notifikasi Anda."
      />

      <div className="grid items-start gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <article
          aria-labelledby="announcement-detail-title"
          className="rounded-xl border border-[var(--color-line)] bg-white p-5 sm:p-7 lg:order-2"
        >
          {isDetailLoading ? (
            <div aria-busy="true" className="animate-pulse space-y-3">
              <div className="h-4 w-32 rounded bg-slate-200" />
              <div className="h-7 w-3/4 rounded bg-slate-200" />
              <div className="h-40 rounded bg-slate-100" />
            </div>
          ) : selectedCard ? (
            <>
              <p className="text-sm text-slate-500">
                <span className="font-semibold text-[var(--color-primary)]">
                  {formatAnnouncementCategory(selectedCard.category)}
                </span>{" "}
                &middot; {formatAnnouncementDate(selectedCard.created_at)}
              </p>
              <h2
                id="announcement-detail-title"
                className="mt-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"
              >
                {selectedCard.title}
              </h2>
              <p className="mt-4 max-w-prose whitespace-pre-line text-[0.95rem] leading-7 text-slate-700">
                {selectedCard.content}
              </p>
            </>
          ) : (
            <div id="announcement-detail-title">
              <EmptyState
                title={isLoading ? "Memuat pengumuman…" : "Belum ada pengumuman"}
                description="Pengumuman yang diterbitkan pengurus akan tampil di sini."
              />
            </div>
          )}
        </article>

        <section aria-labelledby="announcement-list-title" className="lg:order-1">
          <h2 id="announcement-list-title" className="mb-3 text-sm font-bold text-slate-900">
            Semua pengumuman
          </h2>

          {isLoading ? (
            <div className="space-y-2" aria-busy="true">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-20 animate-pulse rounded-lg border border-[var(--color-line)] bg-white"
                />
              ))}
            </div>
          ) : errorMessage ? (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : announcements.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada pengumuman.</p>
          ) : (
            <ul className="space-y-2">
              {announcements.map((item) => {
                const isActive = selectedCard?.id === item.id;

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
                      className={`w-full rounded-lg border px-4 py-3 text-left ${
                        isActive
                          ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]"
                          : "border-[var(--color-line)] bg-white hover:border-slate-300"
                      }`}
                    >
                      <p className="text-xs text-slate-500">
                        {formatAnnouncementCategory(item.category)} &middot;{" "}
                        {formatAnnouncementDate(item.created_at)}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-sm leading-6 text-slate-500">
                        {item.content}
                      </p>
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
