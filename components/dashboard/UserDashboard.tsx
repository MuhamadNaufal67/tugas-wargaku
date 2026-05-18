"use client";

import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  formatAnnouncementCategory,
  formatAnnouncementDate,
  getAnnouncementPreview,
  isRecentAnnouncement,
} from "@/lib/announcements";
import {
  formatNotificationTime,
  getNotificationAnnouncementId,
  getNotificationPengajuanId,
  isUnread,
} from "@/lib/notifications";
import { logAuthWarning } from "@/lib/supabaseAuthErrors";
import type {
  AnnouncementRow,
  NotificationRow,
  PengajuanRow,
} from "@/lib/supabaseClient";
import { LinkButton } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";

type UserDashboardState = {
  announcements: AnnouncementRow[];
  notifications: NotificationRow[];
  pengajuan: PengajuanRow[];
};

function countDone(items: PengajuanRow[]) {
  return items.filter((item) => item.status.toLowerCase() === "selesai").length;
}

export default function UserDashboard() {
  const router = useRouter();
  const { isAdmin, isLoading: isAuthLoading, supabase, user } = useAuth();
  const realtimeReloadRef = useRef<number | null>(null);
  const [data, setData] = useState<UserDashboardState>({
    announcements: [],
    notifications: [],
    pengajuan: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const [pengajuanResponse, notificationResponse, announcementResponse] =
        await Promise.all([
          supabase
            .from("pengajuan_surat")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("notifications")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(8),
          supabase
            .from("announcements")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(3),
        ]);

      if (pengajuanResponse.error) {
        throw pengajuanResponse.error;
      }

      if (notificationResponse.error) {
        throw notificationResponse.error;
      }

      if (announcementResponse.error) {
        throw announcementResponse.error;
      }

      startTransition(() => {
        setData({
          announcements: announcementResponse.data ?? [],
          notifications: notificationResponse.data ?? [],
          pengajuan: pengajuanResponse.data ?? [],
        });
      });
    } catch (error) {
      logAuthWarning("user dashboard load failed", error, {
        userId: user.id,
      });
    } finally {
      setIsLoading(false);
    }
  }, [supabase, user]);

  const scheduleDashboardReload = useCallback(() => {
    if (realtimeReloadRef.current) {
      window.clearTimeout(realtimeReloadRef.current);
    }

    realtimeReloadRef.current = window.setTimeout(() => {
      realtimeReloadRef.current = null;
      void loadDashboard();
    }, 120);
  }, [loadDashboard]);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!user) {
      router.replace("/login?redirect=/dashboard");
      return;
    }

    if (isAdmin) {
      router.replace("/admin");
      return;
    }

    const timer = window.setTimeout(() => {
      void loadDashboard();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [isAdmin, isAuthLoading, loadDashboard, router, user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const channelsToCleanup = supabase.getChannels().filter((channel) =>
      channel.topic.startsWith(`realtime:user-dashboard:announcements:${user.id}`) ||
      channel.topic.startsWith(`realtime:user-dashboard:notifications:${user.id}`),
    );

    for (const channel of channelsToCleanup) {
      void supabase.removeChannel(channel);
    }

    const announcementsChannel = supabase
      .channel(`user-dashboard:announcements:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "announcements",
        },
        scheduleDashboardReload,
      )
      .subscribe();

    const notificationsChannel = supabase
      .channel(`user-dashboard:notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        scheduleDashboardReload,
      )
      .subscribe();

    return () => {
      if (realtimeReloadRef.current) {
        window.clearTimeout(realtimeReloadRef.current);
        realtimeReloadRef.current = null;
      }

      void supabase.removeChannel(announcementsChannel);
      void supabase.removeChannel(notificationsChannel);
    };
  }, [scheduleDashboardReload, supabase, user]);

  if (isAuthLoading || isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-36 animate-pulse rounded-[1.7rem] border border-white/80 bg-white/95 shadow-sm"
          />
        ))}
      </div>
    );
  }

  const latestPengajuan = data.pengajuan[0] ?? null;
  const latestAnnouncements = data.announcements;
  const unreadCount = data.notifications.filter(isUnread).length;
  const completedItems = data.pengajuan.filter(
    (item) => item.status.toLowerCase() === "selesai",
  );

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardContent className="space-y-5">
            <span className="inline-flex rounded-full bg-[var(--color-primary-soft)] px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-primary)]">
              Akun Warga
            </span>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
                Pantau pengajuan, notifikasi, dan surat selesai Anda dalam satu tempat.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">
                Dashboard ini memudahkan warga untuk mengirim surat baru,
                mengecek progres layanan, dan langsung mengunduh dokumen yang sudah selesai.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <LinkButton href="/ajukan-surat">Ajukan Surat Baru</LinkButton>
              <LinkButton href="/status" variant="secondary">
                Lihat Semua Proses
              </LinkButton>
              <LinkButton href="/pengumuman" variant="ghost">
                Baca Pengumuman
              </LinkButton>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.35rem] bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-500">Total Pengajuan</p>
              <p className="mt-2 text-3xl font-extrabold text-slate-950">
                {data.pengajuan.length}
              </p>
            </div>
            <div className="rounded-[1.35rem] bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-500">Notifikasi Baru</p>
              <p className="mt-2 text-3xl font-extrabold text-slate-950">
                {unreadCount}
              </p>
            </div>
            <div className="rounded-[1.35rem] bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-500">Surat Selesai</p>
              <p className="mt-2 text-3xl font-extrabold text-slate-950">
                {countDone(data.pengajuan)}
              </p>
            </div>
            <div className="rounded-[1.35rem] bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-500">Status Terakhir</p>
              <p className="mt-2 text-sm font-bold text-slate-900">
                {latestPengajuan ? latestPengajuan.jenis_surat : "Belum ada"}
              </p>
              {latestPengajuan ? (
                <div className="mt-2">
                  <StatusBadge status={latestPengajuan.status} />
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-950">Pengumuman Terbaru</h2>
                <p className="text-sm text-slate-500">
                  Kabar terbaru dari pengurus untuk warga.
                </p>
              </div>
              <Link
                href="/pengumuman"
                className="text-sm font-semibold text-[var(--color-primary)]"
              >
                Lihat Semua
              </Link>
            </div>

            {latestAnnouncements.length === 0 ? (
              <EmptyState
                title="Belum ada pengumuman"
                description="Pengumuman dari pengurus akan muncul di sini dan otomatis masuk ke notifikasi akun Anda."
              />
            ) : (
              <div className="space-y-3">
                {latestAnnouncements.map((announcement) => {
                  const isRecent = isRecentAnnouncement(announcement.created_at);

                  return (
                    <Link
                      key={announcement.id}
                      href={`/pengumuman?announcement=${announcement.id}`}
                      className={`block rounded-[1.35rem] border p-4 transition ${
                        isRecent
                          ? "border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)]/55 shadow-[0_12px_28px_rgba(45,129,193,0.08)]"
                          : "border-slate-200 bg-white hover:border-[var(--color-primary)]/30 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-slate-600">
                            {formatAnnouncementCategory(announcement.category)}
                          </span>
                          {isRecent ? (
                            <span className="rounded-full bg-[var(--color-accent)] px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-white">
                              Baru
                            </span>
                          ) : null}
                        </div>
                        <span className="shrink-0 text-xs text-slate-400">
                          {formatAnnouncementDate(announcement.created_at)}
                        </span>
                      </div>

                      <p className="mt-3 text-base font-bold text-slate-900">
                        {announcement.title}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        {getAnnouncementPreview(announcement.content, 150)}
                      </p>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-950">Pemberitahuan Terbaru</h2>
                <p className="text-sm text-slate-500">
                  Pemberitahuan terbaru terkait layanan Anda.
                </p>
              </div>
            </div>

            {data.notifications.length === 0 ? (
              <EmptyState
                title="Belum ada pemberitahuan"
                description="Pemberitahuan tentang pengajuan dan perubahan layanan akan muncul di sini."
              />
            ) : (
              <div className="space-y-3">
                {data.notifications.map((item) => {
                  const pengajuanId = getNotificationPengajuanId(item);
                  const announcementId = getNotificationAnnouncementId(item);
                  const targetHref =
                    announcementId
                      ? `/pengumuman?announcement=${announcementId}`
                      : pengajuanId !== null
                        ? `/status?highlight=${pengajuanId}`
                        : null;

                  return (
                    <div
                      key={item.id}
                      className={`rounded-[1.3rem] border p-4 ${
                        item.read
                          ? "border-slate-200 bg-white"
                          : "border-blue-200 bg-blue-50/70"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-slate-900">{item.title}</p>
                          <p className="mt-1 text-sm leading-6 text-slate-500">
                            {item.message}
                          </p>
                        </div>
                        {!item.read ? (
                          <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[var(--color-primary)]">
                            Baru
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <p className="text-xs text-slate-400">
                          {formatNotificationTime(item.created_at)}
                        </p>
                        {targetHref ? (
                          <Link
                            href={targetHref}
                            className="text-xs font-semibold text-[var(--color-primary)]"
                          >
                            Buka detail
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-950">Riwayat Pengajuan</h2>
                <p className="text-sm text-slate-500">
                  Pengajuan terbaru milik Anda.
                </p>
              </div>
              <Link
                href="/status"
                className="text-sm font-semibold text-[var(--color-primary)]"
              >
                Lihat semua
              </Link>
            </div>

            {data.pengajuan.length === 0 ? (
              <EmptyState
                title="Belum ada pengajuan"
                description="Mulai dari surat pertama Anda agar proses layanan dapat dipantau dengan lebih mudah dari halaman ini."
                action={<LinkButton href="/ajukan-surat">Ajukan Sekarang</LinkButton>}
              />
            ) : (
              <div className="space-y-3">
                {data.pengajuan.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="rounded-[1.3rem] border border-slate-200 bg-slate-50/80 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-bold text-slate-900">{item.jenis_surat}</p>
                        <p className="text-sm text-slate-500">
                          {item.nama} • NIK {item.nik}
                        </p>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        href={`/status?highlight=${item.id}`}
                        className="inline-flex min-h-10 items-center justify-center rounded-full bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-white"
                      >
                        Lihat Detail
                      </Link>
                      {item.status.toLowerCase() === "selesai" && item.file_surat ? (
                        <Link
                          href={`/status?highlight=${item.id}`}
                          className="inline-flex min-h-10 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700"
                        >
                          Download Surat
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {completedItems.length > 0 ? (
          <Card>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-950">Surat Siap Diunduh</h2>
                  <p className="text-sm text-slate-500">
                    Akses cepat ke dokumen yang sudah selesai diproses.
                  </p>
                </div>
              </div>
              <div className="grid gap-3">
                {completedItems.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    className="rounded-[1.3rem] border border-emerald-200 bg-emerald-50/70 p-4"
                  >
                    <p className="font-bold text-slate-900">{item.jenis_surat}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Dokumen siap dibuka atau diunduh.
                    </p>
                    <div className="mt-3">
                      <Link
                        href={`/status?highlight=${item.id}`}
                        className="inline-flex min-h-10 items-center justify-center rounded-full border border-emerald-200 bg-white px-4 py-2 text-xs font-semibold text-emerald-700"
                      >
                        Buka Surat
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent>
              <EmptyState
                title="Belum ada surat selesai"
                description="Saat surat Anda selesai diproses, tautan unduhan cepat akan muncul di area ini."
              />
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
