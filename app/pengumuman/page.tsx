"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ToastContainer } from "@/components/Toast";
import { LinkButton } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
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
              Pengumuman Warga
            </span>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
                Informasi lingkungan terbaru, langsung dari pengurus.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">
                Gunakan halaman ini untuk melihat pengumuman terbaru, agenda
                lingkungan, dan informasi layanan yang perlu Anda ketahui.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <LinkButton href="/dashboard">Kembali ke Dashboard</LinkButton>
              <LinkButton href="/status" variant="secondary">
                Buka Status Pengajuan
              </LinkButton>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-500">Pengumuman terbaru</p>
                <p className="mt-1 text-xl font-bold text-slate-950">
                  {latestAnnouncement?.title ?? "Belum ada pengumuman"}
                </p>
              </div>
              {latestAnnouncement ? (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                  {formatAnnouncementCategory(latestAnnouncement.category)}
                </span>
              ) : null}
            </div>
            <p className="text-sm leading-7 text-slate-500">
              {latestAnnouncement?.content ??
                "Pengumuman baru dari pengurus akan tampil di sini beserta notifikasi ke akun warga."}
            </p>
            {latestAnnouncement ? (
              <p className="text-xs text-slate-400">
                Diterbitkan {formatAnnouncementDate(latestAnnouncement.created_at)}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-950">Daftar Pengumuman</h2>
                <p className="text-sm text-slate-500">
                  Semua informasi yang telah dibagikan untuk warga.
                </p>
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-28 animate-pulse rounded-[1.3rem] border border-slate-100 bg-slate-50"
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
                description="Saat pengurus membuat pengumuman baru, daftar ini akan terisi otomatis."
              />
            ) : (
              <div className="space-y-3">
                {announcements.map((item) => {
                  const isActive = selectedCard?.id === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        router.replace(`/pengumuman?announcement=${item.id}`, {
                          scroll: false,
                        })
                      }
                      className={`w-full rounded-[1.35rem] border p-4 text-left transition ${
                        isActive
                          ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]/70"
                          : "border-slate-200 bg-white hover:border-[var(--color-primary)]/40 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-bold text-slate-900">{item.title}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            {formatAnnouncementCategory(item.category)}
                          </p>
                        </div>
                        <span className="text-xs text-slate-400">
                          {formatAnnouncementDate(item.created_at)}
                        </span>
                      </div>
                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-500">
                        {item.content}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-500">Detail pengumuman</p>
                <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">
                  {selectedCard?.title ?? "Pilih pengumuman"}
                </h2>
              </div>
              {selectedCard ? (
                <span className="rounded-full bg-[var(--color-primary-soft)] px-3 py-1 text-xs font-bold text-[var(--color-primary)]">
                  {formatAnnouncementCategory(selectedCard.category)}
                </span>
              ) : null}
            </div>

            {isDetailLoading ? (
              <div className="h-64 animate-pulse rounded-[1.5rem] bg-slate-50" />
            ) : selectedCard ? (
              <>
                <p className="text-sm text-slate-400">
                  Diterbitkan {formatAnnouncementDate(selectedCard.created_at)}
                </p>
                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-5">
                  <p className="whitespace-pre-line text-sm leading-7 text-slate-600">
                    {selectedCard.content}
                  </p>
                </div>
              </>
            ) : (
              <EmptyState
                title="Belum ada detail"
                description="Pilih salah satu pengumuman dari daftar untuk membaca isi lengkapnya."
              />
            )}

            <div className="flex flex-wrap gap-3">
              <LinkButton href="/dashboard" variant="secondary">
                Ringkasan Akun
              </LinkButton>
              <Link href="/status" className="inline-flex min-h-11 items-center rounded-full px-1 text-sm font-semibold text-[var(--color-primary)]">
                Lanjut ke status pengajuan
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
