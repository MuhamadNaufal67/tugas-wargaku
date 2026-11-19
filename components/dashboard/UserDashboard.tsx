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
  const { isAdmin, isLoading: isAuthLoading, profile, supabase, user } = useAuth();
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
      <div aria-busy="true" aria-label="Memuat dashboard" className="animate-pulse space-y-6">
        <div className="h-44 rounded-xl bg-slate-200" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-72 rounded-xl border border-[var(--color-line)] bg-white" />
          <div className="h-72 rounded-xl border border-[var(--color-line)] bg-white" />
        </div>
      </div>
    );
  }

  const latestAnnouncements = data.announcements;
  const unreadCount = data.notifications.filter(isUnread).length;
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] ?? "";

  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-[var(--color-primary)] px-5 py-7 text-white sm:px-8 sm:py-9">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {firstName ? `Halo, ${firstName}` : "Halo"}
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-white/85 sm:text-base sm:leading-7">
          Ajukan surat baru atau lihat perkembangan pengajuan Anda.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <LinkButton href="/ajukan-surat" variant="accent">
            Ajukan surat
          </LinkButton>
          <Link
            href="/status"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/50 px-4 text-sm font-semibold text-white hover:bg-white/10"
          >
            Lihat status
          </Link>
        </div>

        <dl className="mt-8 grid grid-cols-3 gap-4 border-t border-white/20 pt-5 sm:max-w-lg">
          <div>
            <dt className="text-xs text-white/75 sm:text-sm">Pengajuan</dt>
            <dd className="mt-0.5 text-xl font-bold tabular-nums">{data.pengajuan.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-white/75 sm:text-sm">Surat selesai</dt>
            <dd className="mt-0.5 text-xl font-bold tabular-nums">{countDone(data.pengajuan)}</dd>
          </div>
          <div>
            <dt className="text-xs text-white/75 sm:text-sm">Belum dibaca</dt>
            <dd className="mt-0.5 text-xl font-bold tabular-nums">{unreadCount}</dd>
          </div>
        </dl>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="my-submissions" className="rounded-xl border border-[var(--color-line)] bg-white">
          <div className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-5 sm:pt-5">
            <h2 id="my-submissions" className="section-title">Pengajuan saya</h2>
            {data.pengajuan.length > 0 ? (
              <Link href="/status" className="text-link inline-flex min-h-10 items-center text-sm">
                Lihat semua
              </Link>
            ) : null}
          </div>

          {data.pengajuan.length === 0 ? (
            <div className="p-4 sm:p-5">
              <EmptyState
                title="Belum ada pengajuan"
                description="Surat yang Anda ajukan akan muncul di sini beserta statusnya."
                action={<LinkButton href="/ajukan-surat" size="sm">Ajukan surat pertama</LinkButton>}
              />
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-[var(--color-line)] border-t border-[var(--color-line)]">
              {data.pengajuan.slice(0, 5).map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/status?highlight=${item.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-slate-50 sm:px-5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{item.jenis_surat}</p>
                      <p className="text-sm text-slate-500">
                        {item.status.toLowerCase() === "selesai"
                          ? "Siap diunduh"
                          : item.status.toLowerCase() === "ditolak"
                            ? "Perlu diperbaiki"
                            : "Sedang ditangani pengurus"}
                      </p>
                    </div>
                    <StatusBadge status={item.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="announcements" className="rounded-xl border border-[var(--color-line)] bg-white">
          <div className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-5 sm:pt-5">
            <h2 id="announcements" className="section-title">Pengumuman RT</h2>
            {latestAnnouncements.length > 0 ? (
              <Link href="/pengumuman" className="text-link inline-flex min-h-10 items-center text-sm">
                Lihat semua
              </Link>
            ) : null}
          </div>

          {latestAnnouncements.length === 0 ? (
            <div className="p-4 sm:p-5">
              <EmptyState
                title="Belum ada pengumuman"
                description="Pengumuman dari pengurus akan muncul di sini dan dikirim ke notifikasi Anda."
              />
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-[var(--color-line)] border-t border-[var(--color-line)]">
              {latestAnnouncements.map((announcement) => {
                const isRecent = isRecentAnnouncement(announcement.created_at);

                return (
                  <li key={announcement.id}>
                    <Link
                      href={`/pengumuman?announcement=${announcement.id}`}
                      className="block px-4 py-3.5 hover:bg-slate-50 sm:px-5"
                    >
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="font-semibold text-[var(--color-primary)]">
                          {formatAnnouncementCategory(announcement.category)}
                        </span>
                        <span aria-hidden="true">&middot;</span>
                        <span>{formatAnnouncementDate(announcement.created_at)}</span>
                        {isRecent ? (
                          <span className="rounded-full bg-[var(--color-accent)] px-2 py-0.5 text-[0.7rem] font-semibold text-white">
                            Baru
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{announcement.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-sm leading-6 text-slate-500">
                        {getAnnouncementPreview(announcement.content, 150)}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <section aria-labelledby="notifications" className="rounded-xl border border-[var(--color-line)] bg-white">
        <div className="px-4 pt-4 sm:px-5 sm:pt-5">
          <h2 id="notifications" className="section-title">Pemberitahuan</h2>
        </div>

        {data.notifications.length === 0 ? (
          <div className="p-4 sm:p-5">
            <EmptyState
              title="Belum ada pemberitahuan"
              description="Anda akan diberi tahu di sini setiap kali status pengajuan berubah."
            />
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-[var(--color-line)] border-t border-[var(--color-line)]">
            {data.notifications.map((item) => {
              const pengajuanId = getNotificationPengajuanId(item);
              const announcementId = getNotificationAnnouncementId(item);
              const targetHref =
                announcementId
                  ? `/pengumuman?announcement=${announcementId}`
                  : pengajuanId !== null
                    ? `/status?highlight=${pengajuanId}`
                    : null;
              const content = (
                <div className="flex gap-3">
                  <span
                    aria-hidden="true"
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      item.read ? "bg-transparent" : "bg-[var(--color-primary)]"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className={`text-sm ${item.read ? "text-slate-700" : "font-semibold text-slate-900"}`}>
                      {item.title}
                      {!item.read ? <span className="sr-only"> (belum dibaca)</span> : null}
                    </p>
                    <p className="mt-0.5 text-sm leading-6 text-slate-500">{item.message}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {formatNotificationTime(item.created_at)}
                    </p>
                  </div>
                </div>
              );

              return (
                <li key={item.id}>
                  {targetHref ? (
                    <Link href={targetHref} className="block px-4 py-3.5 hover:bg-slate-50 sm:px-5">
                      {content}
                    </Link>
                  ) : (
                    <div className="px-4 py-3.5 sm:px-5">{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
