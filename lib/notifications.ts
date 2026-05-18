import {
  getSupabaseClient,
  type Database,
  type Json,
  type NotificationRow,
} from "@/lib/supabaseClient";
import { formatRelativeTime } from "@/lib/relativeTime";

type CreateNotificationInput = {
  message: string;
  metadata?: Json | null;
  title: string;
  type?: string;
  userId: string;
};

const NOTIFICATION_EVENT = "wargaku:notification-change";

type NotificationEventDetail = {
  action: "created" | "read" | "read-all";
  notification?: NotificationRow;
  notificationId?: string;
  userId: string;
};

type NotificationInsertPayload =
  Database["public"]["Tables"]["notifications"]["Insert"];

function dispatchNotificationEvent(detail: NotificationEventDetail) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(NOTIFICATION_EVENT, { detail }));
}

export async function createNotification({
  message,
  metadata = null,
  title,
  type = "info",
  userId,
}: CreateNotificationInput) {
  const supabase = getSupabaseClient();
  const payload: NotificationInsertPayload = {
    message,
    metadata,
    title,
    type,
    user_id: userId,
  };

  const insertResponse = await supabase.from("notifications").insert(payload);

  if (insertResponse.error) {
    console.error("Notification insert failed.", {
      payload,
      response: insertResponse,
      supabaseError: insertResponse.error,
    });
    throw insertResponse.error;
  }

  const currentUserResponse = await supabase.auth.getUser();
  const currentUserId = currentUserResponse.data.user?.id ?? null;

  if (currentUserId !== userId) {
    return null;
  }

  const fetchResponse = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .eq("title", title)
    .eq("message", message)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchResponse.error) {
    console.error("Notification insert succeeded, but follow-up fetch failed.", {
      payload,
      response: fetchResponse,
      supabaseError: fetchResponse.error,
    });
    return null;
  }

  if (fetchResponse.data) {
    dispatchNotificationEvent({
      action: "created",
      notification: fetchResponse.data,
      userId,
    });
  }

  return fetchResponse.data ?? null;
}

export function formatNotificationTime(createdAt: string | null) {
  return formatRelativeTime(createdAt);
}

export function isUnread(notification: NotificationRow) {
  return !notification.read;
}

export function getNotificationPengajuanId(notification: Pick<NotificationRow, "metadata">) {
  const metadata = notification.metadata;

  if (!metadata || Array.isArray(metadata) || typeof metadata !== "object") {
    return null;
  }

  const rawId = metadata.pengajuan_id;
  if (typeof rawId === "number" && Number.isFinite(rawId)) {
    return rawId;
  }

  if (typeof rawId === "string") {
    const parsed = Number(rawId);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function getNotificationAnnouncementId(
  notification: Pick<NotificationRow, "metadata">,
) {
  const metadata = notification.metadata;

  if (!metadata || Array.isArray(metadata) || typeof metadata !== "object") {
    return null;
  }

  const rawId = metadata.announcement_id;
  return typeof rawId === "string" && rawId.trim().length > 0 ? rawId : null;
}

export function emitNotificationRead(userId: string, notificationId: string) {
  dispatchNotificationEvent({
    action: "read",
    notificationId,
    userId,
  });
}

export function emitNotificationReadAll(userId: string) {
  dispatchNotificationEvent({
    action: "read-all",
    userId,
  });
}

export function subscribeNotificationChanges(
  listener: (detail: NotificationEventDetail) => void,
) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  function handleEvent(event: Event) {
    const customEvent = event as CustomEvent<NotificationEventDetail>;
    if (customEvent.detail) {
      listener(customEvent.detail);
    }
  }

  window.addEventListener(NOTIFICATION_EVENT, handleEvent);
  return () => window.removeEventListener(NOTIFICATION_EVENT, handleEvent);
}
