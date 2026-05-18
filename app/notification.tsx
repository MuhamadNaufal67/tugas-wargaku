"use client";

import { startTransition, useCallback, useEffect, useId, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useEscapeKey, useOutsideClick, useRelativeTime } from "@/hooks";
import { EmptyState, Skeleton } from "@/components/ui";
import {
  formatAnnouncementCategory,
  isRecentAnnouncement,
} from "@/lib/announcements";
import {
  getNotificationAnnouncementId,
  emitNotificationRead,
  emitNotificationReadAll,
  getNotificationPengajuanId,
  isUnread,
  subscribeNotificationChanges,
} from "@/lib/notifications";
import { logAuthWarning } from "@/lib/supabaseAuthErrors";
import type { NotificationRow } from "@/lib/supabaseClient";

function NotificationListSkeleton() {
  return (
    <div className="space-y-3 px-4 py-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex gap-3">
          <Skeleton className="mt-1 h-10 w-10 rounded-2xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

function NotificationTimestamp({ createdAt }: { createdAt: string | null }) {
  const relativeTime = useRelativeTime(createdAt);
  return <p className="mt-1 text-xs text-slate-400">{relativeTime}</p>;
}

export default function Notification() {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoading, supabase, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [needsPollingFallback, setNeedsPollingFallback] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const realtimeInstanceId = useId().replace(/:/g, "");
  const rootRef = useOutsideClick<HTMLDivElement>(() => setIsOpen(false), isOpen);
  const visibleNotifications = user ? notifications : [];
  const isLoadingList = (isLoading || isFetching) && visibleNotifications.length === 0;

  const unreadCount = visibleNotifications.filter(isUnread).length;

  const loadNotifications = useCallback(async () => {
    if (!user) {
      return;
    }

    setIsFetching(true);

    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(12);

      if (error) {
        throw error;
      }

      startTransition(() => {
        setNotifications(data ?? []);
      });
    } catch (error) {
      logAuthWarning("notifications.load failed", error, {
        userId: user.id,
      });
      console.warn("Notification dropdown reload failed.", error);
    } finally {
      setIsFetching(false);
    }
  }, [supabase, user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const timer = window.setTimeout(() => {
      void loadNotifications();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadNotifications, user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    for (const existingChannel of supabase.getChannels()) {
      if (existingChannel.topic.startsWith(`realtime:notifications:${user.id}`)) {
        void supabase.removeChannel(existingChannel);
      }
    }

    const channel = supabase
      .channel(`notifications:${user.id}:${realtimeInstanceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void loadNotifications();
        },
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setNeedsPollingFallback(true);
          console.warn("Notification realtime degraded. Falling back to polling.", {
            status,
            userId: user.id,
          });
          return;
        }

        if (status === "SUBSCRIBED") {
          setNeedsPollingFallback(false);
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadNotifications, realtimeInstanceId, supabase, user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    return subscribeNotificationChanges((detail) => {
      if (detail.userId !== user.id) {
        return;
      }

      if (detail.action === "created") {
        setNotifications((current) => {
          if (!detail.notification) {
            return current;
          }

          const withoutDuplicate = current.filter(
            (item) => item.id !== detail.notification?.id,
          );

          return [detail.notification, ...withoutDuplicate]
            .sort((left, right) =>
              (right.created_at ?? "").localeCompare(left.created_at ?? ""),
            )
            .slice(0, 12);
        });
        return;
      }

      if (detail.action === "read" && detail.notificationId) {
        setNotifications((current) =>
          current.map((item) =>
            item.id === detail.notificationId ? { ...item, read: true } : item,
          ),
        );
        return;
      }

      if (detail.action === "read-all") {
        setNotifications((current) =>
          current.map((item) => ({ ...item, read: true })),
        );
      }
    });
  }, [user]);

  useEffect(() => {
    if (!user || !needsPollingFallback) {
      return;
    }

    const interval = window.setInterval(() => {
      void loadNotifications();
    }, 15000);

    return () => window.clearInterval(interval);
  }, [loadNotifications, needsPollingFallback, user]);

  useEscapeKey(() => setIsOpen(false), isOpen);

  async function markAllAsRead() {
    if (!user || unreadCount === 0) {
      return;
    }

    const previousNotifications = notifications;
    const unreadIds = notifications.filter(isUnread).map((item) => item.id);

    setIsMarkingAll(true);
    setNotifications((current) =>
      current.map((item) => ({ ...item, read: true })),
    );

    let didPersist = false;

    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .in("id", unreadIds);

      if (error) {
        throw error;
      }

      didPersist = true;
    } catch (error) {
      setNotifications(previousNotifications);
      logAuthWarning("notifications.markAllAsRead failed", error, {
        unreadCount,
        userId: user.id,
      });
      console.warn("Mark all notifications as read failed.", error);
    } finally {
      setIsMarkingAll(false);
    }

    if (didPersist) {
      emitNotificationReadAll(user.id);
    }
  }

  async function markAsRead(id: string) {
    const previousNotifications = notifications;
    setNotifications((current) =>
      current.map((item) =>
        item.id === id ? { ...item, read: true } : item,
      ),
    );

    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", id);

      if (error) {
        throw error;
      }
    } catch (error) {
      setNotifications(previousNotifications);
      logAuthWarning("notifications.markAsRead failed", error, {
        id,
      });
      console.warn("Notification read sync failed.", error);
      return;
    }

    if (user) {
      emitNotificationRead(user.id, id);
    }
  }

  async function handleNotificationClick(item: NotificationRow) {
    if (!item.read) {
      await markAsRead(item.id);
    }

    setIsOpen(false);
    const pengajuanId = getNotificationPengajuanId(item);
    const announcementId = getNotificationAnnouncementId(item);

    if (pengajuanId !== null) {
      const targetPath = `/status?highlight=${pengajuanId}`;
      if (pathname === "/status") {
        router.replace(targetPath, { scroll: false });
      } else {
        router.push(targetPath);
      }
      return;
    }

    if (announcementId) {
      const targetPath = `/pengumuman?announcement=${announcementId}`;
      if (pathname === "/pengumuman") {
        router.replace(targetPath, { scroll: false });
      } else {
        router.push(targetPath);
      }
      return;
    }

    if (pathname !== "/status") {
      router.push("/status");
    }
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen((value) => !value);
          if (!isOpen) {
            void loadNotifications();
          }
        }}
        className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200/80 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
        aria-label={
          unreadCount > 0
            ? `Notifikasi, ${unreadCount} belum dibaca`
            : "Notifikasi"
        }
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[0.6rem] font-bold leading-none text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div
          className="absolute right-0 top-full z-50 mt-3 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-[1.6rem] border border-slate-200/80 bg-white/98 shadow-[0_24px_60px_rgba(15,23,42,0.14)]"
          role="dialog"
          aria-label="Panel notifikasi"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-800">
                Notifikasi
              </span>
              {unreadCount > 0 ? (
                <span className="rounded-full bg-[var(--color-primary-soft)] px-2 py-0.5 text-xs font-bold text-[var(--color-primary)]">
                  {unreadCount} baru
                </span>
              ) : null}
            </div>

            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={() => void markAllAsRead()}
                disabled={isMarkingAll}
                className="text-xs font-semibold text-[var(--color-primary)] transition disabled:cursor-not-allowed disabled:opacity-60 hover:underline"
              >
                {isMarkingAll ? "Menandai..." : "Tandai semua"}
              </button>
            ) : null}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {isLoadingList ? (
              <NotificationListSkeleton />
            ) : !user ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">
                Masuk ke akun Anda untuk melihat pemberitahuan.
              </p>
            ) : visibleNotifications.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  title="Belum ada pemberitahuan"
                  description="Pemberitahuan akan muncul saat ada perkembangan pengajuan atau informasi layanan untuk Anda."
                />
              </div>
            ) : (
              visibleNotifications.map((item) => (
                (() => {
                  const announcementId = getNotificationAnnouncementId(item);
                  const isAnnouncement = item.type === "announcement" && announcementId;
                  const isFreshAnnouncement =
                    isAnnouncement && item.created_at
                      ? isRecentAnnouncement(item.created_at)
                      : false;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => void handleNotificationClick(item)}
                      className={`flex w-full items-start gap-3 border-b border-slate-50 px-4 py-3.5 text-left transition last:border-0 hover:bg-slate-50 ${
                        isAnnouncement && isFreshAnnouncement
                          ? "bg-amber-50/60"
                          : item.read
                            ? "bg-white"
                            : "bg-blue-50/60"
                      }`}
                    >
                      <span
                        className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                          item.read ? "bg-slate-200" : "bg-[var(--color-primary)]"
                        }`}
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p
                            className={`text-sm ${
                              item.read
                                ? "text-slate-500"
                                : "font-semibold text-slate-800"
                            }`}
                          >
                            {item.title}
                          </p>
                          {isAnnouncement ? (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-amber-700">
                              {formatAnnouncementCategory(
                                typeof item.metadata === "object" &&
                                  item.metadata &&
                                  !Array.isArray(item.metadata) &&
                                  typeof item.metadata.category === "string"
                                  ? item.metadata.category
                                  : "Pengumuman",
                              )}
                            </span>
                          ) : null}
                          {isFreshAnnouncement ? (
                            <span className="rounded-full bg-[var(--color-accent)] px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-white">
                              Baru
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-sm leading-snug text-slate-500">
                          {item.message}
                        </p>
                        <NotificationTimestamp createdAt={item.created_at} />
                      </div>

                      <span className="shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[0.65rem] font-semibold text-slate-500">
                        {item.read ? "Lihat" : "Baca"}
                      </span>
                    </button>
                  );
                })()
              ))
            )}
          </div>

          {visibleNotifications.length > 0 ? (
            <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-2.5 text-center text-xs text-slate-400">
              Menampilkan {visibleNotifications.length} pemberitahuan terbaru
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
