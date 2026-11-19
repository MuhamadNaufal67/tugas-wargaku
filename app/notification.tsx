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
        className="glass-pill relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-700"
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
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-accent)] px-1 text-[0.65rem] font-bold leading-none text-white ring-2 ring-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div
          className="glass fixed inset-x-3 top-[5.25rem] z-50 overflow-hidden rounded-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-3 sm:w-[22rem]"
          role="dialog"
          aria-label="Panel notifikasi"
        >
          <div className="flex items-center justify-between border-b border-[var(--color-line)] px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">
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
                className="min-h-9 rounded-md px-2 text-sm font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isMarkingAll ? "Menandai…" : "Tandai semua dibaca"}
              </button>
            ) : null}
          </div>

          <div className="max-h-[60vh] overflow-y-auto sm:max-h-96">
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
                  description="Anda akan diberi tahu di sini saat status pengajuan berubah atau ada pengumuman baru."
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
                      className={`flex w-full items-start gap-3 border-b border-[var(--color-line)] px-4 py-3 text-left last:border-0 hover:bg-slate-50 ${
                        isAnnouncement && isFreshAnnouncement
                          ? "bg-orange-50/60"
                          : item.read
                            ? "bg-transparent"
                            : "bg-[var(--color-primary-soft)]/50"
                      }`}
                    >
                      <span
                        className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                          item.read ? "bg-transparent" : "bg-[var(--color-primary)]"
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
                            <span className="rounded-full bg-[var(--color-primary-soft)] px-2 py-0.5 text-[0.7rem] font-semibold text-[var(--color-primary)]">
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
                            <span className="rounded-full bg-[var(--color-accent)] px-2 py-0.5 text-[0.7rem] font-semibold text-white">
                              Baru
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-sm leading-snug text-slate-500">
                          {item.message}
                        </p>
                        <NotificationTimestamp createdAt={item.created_at} />
                      </div>

                    </button>
                  );
                })()
              ))
            )}
          </div>

          {visibleNotifications.length > 0 ? (
            <div className="border-t border-[var(--color-line)] px-4 py-2.5 text-center text-xs text-slate-500">
              {visibleNotifications.length} pemberitahuan terakhir
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
