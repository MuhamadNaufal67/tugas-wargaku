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
import { Icon } from "@/components/ui/Icon";
import { LetterIcon } from "@/components/ui/LetterIcon";
import { StatusTracker } from "@/components/ui/StatusTracker";

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
        <div className="h-60 rounded-2xl bg-slate-200" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-24 rounded-xl border border-[var(--color-line)] bg-white" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-72 rounded-xl border border-[var(--color-line)] bg-white" />
          <div className="h-72 rounded-xl border border-[var(--color-line)] bg-white" />
        </div>
      </div>
    );
  }

  const latestPengajuan = data.pengajuan[0] ?? null;
  const latestAnnouncements = data.announcements;
  const unreadCount = data.notifications.filter(isUnread).length;
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] ?? "";
  const stats = [
    {
      icon: "file" as const,
      label: "Total pengajuan",
      tile: "bg-[var(--color-primary-soft)] text-[var(--color-primary)]",
      value: data.pengajuan.length,
    },
    {
      icon: "check" as const,
      label: "Surat selesai",
      tile: "bg-emerald-50 text-emerald-600",
      value: countDone(data.pengajuan),
    },
    {
      icon: "bell" as const,
      label: "Belum dibaca",
      tile: "bg-orange-50 text-[var(--color-accent)]",
      value: unreadCount,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl bg-[var(--color-primary)] px-5 py-7 text-white sm:px-8 sm:py-9">
        <div aria-hidden="true" className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10" />

        <div className="relative grid items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              {firstName ? `Halo, ${firstName}` : "Halo"}
            </h1>
            <p className="mt-2 max-w-md leading-7 text-white/85">
              Ajukan surat baru atau lihat perkembangan pengajuan Anda di sini.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <LinkButton href="/ajukan-surat" variant="accent" className="sm:px-6">
                Ajukan surat
              </LinkButton>
              <Link
                href="/status"
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/40 px-5 text-sm font-semibold text-white hover:bg-white/10"
              >
                Lihat semua status
              </Link>
            </div>
          </div>

          <div className="rounded-xl border border-white/25 bg-white/10 p-5 backdrop-blur-md">
            <p className="text-sm font-semibold text-white/75">Pengajuan terakhir</p>
            {latestPengajuan ? (
              <>
                <div className="mt-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-bold">{latestPengajuan.jenis_surat}</p>
                    <p className="text-sm text-white/70">
                      Diajukan {formatNotificationTime(latestPengajuan.created_at)}
                    </p>
                  </div>
                  <Link
                    href={`/status?highlight=${latestPengajuan.id}`}
                    className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg bg-white/15 px-3 text-sm font-semibold hover:bg-white/25"
                  >
                    Detail
                    <Icon name="chevronRight" className="h-4 w-4" />
                  </Link>
                </div>
                <div className="mt-5">
                  <StatusTracker status={latestPengajuan.status} tone="dark" />
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm leading-6 text-white/80">
                Belum ada pengajuan. Progres surat Anda akan tampil di sini
                setelah Anda mengajukan surat pertama.
              </p>
            )}
          </div>
        </div>
      </section>

      <dl className="grid grid-cols-3 gap-2 sm:gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col items-start gap-2 rounded-xl border border-[var(--color-line)] bg-white p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-5"
          >
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-12 sm:w-12 sm:rounded-xl ${stat.tile}`}>
              <Icon name={stat.icon} className="h-5 w-5 sm:h-6 sm:w-6" />
            </span>
            <div className="flex flex-col-reverse">
              <dt className="text-xs leading-snug text-slate-500 sm:text-sm">{stat.label}</dt>
              <dd className="text-2xl font-extrabold tabular-nums text-slate-900">{stat.value}</dd>
            </div>
          </div>
        ))}
      </dl>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="my-submissions" className="rounded-xl border border-[var(--color-line)] bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--color-line)] px-4 py-3 sm:px-5">
            <h2 id="my-submissions" className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Icon name="file" className="h-5 w-5 text-[var(--color-primary)]" />
              Pengajuan saya
            </h2>
            {data.pengajuan.length > 0 ? (
              <Link href="/status" className="text-link inline-flex min-h-10 items-center text-sm">
                Lihat semua
              </Link>
            ) : null}
          </div>

          {data.pengajuan.length === 0 ? (
            <div className="p-4 sm:p-5">
              <EmptyState
                icon={<Icon name="file" className="h-8 w-8" strokeWidth={1.5} />}
                title="Belum ada pengajuan"
                description="Surat yang Anda ajukan akan muncul di sini beserta statusnya."
                action={<LinkButton href="/ajukan-surat" size="sm">Ajukan surat pertama</LinkButton>}
              />
            </div>
          ) : (
            <ul className="divide-y divide-[var(--color-line)]">
              {data.pengajuan.slice(0, 5).map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/status?highlight=${item.id}`}
                    className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 sm:px-5"
                  >
                    <LetterIcon jenisSurat={item.jenis_surat} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{item.jenis_surat}</p>
                      <p className="text-xs text-slate-500">
                        {item.status.toLowerCase() === "selesai"
                          ? "Siap diunduh"
                          : item.status.toLowerCase() === "ditolak"
                            ? "Perlu diperbaiki"
                            : `Diajukan ${formatNotificationTime(item.created_at)}`}
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
          <div className="flex items-center justify-between gap-3 border-b border-[var(--color-line)] px-4 py-3 sm:px-5">
            <h2 id="announcements" className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Icon name="megaphone" className="h-5 w-5 text-[var(--color-accent)]" />
              Pengumuman RT
            </h2>
            {latestAnnouncements.length > 0 ? (
              <Link href="/pengumuman" className="text-link inline-flex min-h-10 items-center text-sm">
                Lihat semua
              </Link>
            ) : null}
          </div>

          {latestAnnouncements.length === 0 ? (
            <div className="p-4 sm:p-5">
              <EmptyState
                icon={<Icon name="megaphone" className="h-8 w-8" strokeWidth={1.5} />}
                title="Belum ada pengumuman"
                description="Pengumuman dari pengurus akan muncul di sini dan dikirim ke notifikasi Anda."
              />
            </div>
          ) : (
            <ul className="divide-y divide-[var(--color-line)]">
              {latestAnnouncements.map((announcement) => {
                const isRecent = isRecentAnnouncement(announcement.created_at);

                return (
                  <li key={announcement.id}>
                    <Link
                      href={`/pengumuman?announcement=${announcement.id}`}
                      className="block px-4 py-3.5 hover:bg-slate-50 sm:px-5"
                    >
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-md bg-[var(--color-primary-soft)] px-2 py-0.5 font-semibold text-[var(--color-primary)]">
                          {formatAnnouncementCategory(announcement.category)}
                        </span>
                        <span className="text-slate-500">{formatAnnouncementDate(announcement.created_at)}</span>
                        {isRecent ? (
                          <span className="rounded-md bg-[var(--color-accent)] px-2 py-0.5 font-semibold text-white">
                            Baru
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1.5 text-sm font-semibold text-slate-900">{announcement.title}</p>
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
        <div className="flex items-center justify-between gap-3 border-b border-[var(--color-line)] px-4 py-3 sm:px-5">
          <h2 id="notifications" className="flex items-center gap-2 text-base font-bold text-slate-900">
            <Icon name="bell" className="h-5 w-5 text-[var(--color-primary)]" />
            Pemberitahuan
          </h2>
          {unreadCount > 0 ? (
            <span className="rounded-full bg-[var(--color-accent)] px-2.5 py-0.5 text-xs font-bold text-white">
              {unreadCount} baru
            </span>
          ) : null}
        </div>

        {data.notifications.length === 0 ? (
          <div className="p-4 sm:p-5">
            <EmptyState
              icon={<Icon name="bell" className="h-8 w-8" strokeWidth={1.5} />}
              title="Belum ada pemberitahuan"
              description="Anda akan diberi tahu di sini setiap kali status pengajuan berubah."
            />
          </div>
        ) : (
          <ul className="divide-y divide-[var(--color-line)]">
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
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      item.read
                        ? "bg-slate-100 text-slate-400"
                        : "bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                    }`}
                  >
                    <Icon name={announcementId ? "megaphone" : "bell"} className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${item.read ? "text-slate-700" : "font-semibold text-slate-900"}`}>
                      {item.title}
                      {!item.read ? <span className="sr-only"> (belum dibaca)</span> : null}
                    </p>
                    <p className="mt-0.5 text-sm leading-6 text-slate-500">{item.message}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {formatNotificationTime(item.created_at)}
                    </p>
                  </div>
                  {!item.read ? (
                    <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--color-accent)]" />
                  ) : null}
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
