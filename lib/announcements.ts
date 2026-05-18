import { getSupabaseClient, type AnnouncementRow } from "@/lib/supabaseClient";

export const announcementCategories = [
  "Informasi RT",
  "Layanan",
  "Kegiatan",
  "Darurat",
] as const;

export type AnnouncementCategory = (typeof announcementCategories)[number];

type CreateAnnouncementInput = {
  category: AnnouncementCategory;
  content: string;
  createdBy: string;
  title: string;
};

export function formatAnnouncementCategory(category: string) {
  return category.trim() || "Pengumuman";
}

export function getAnnouncementPreview(content: string, maxLength = 140) {
  const normalized = content.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

export function isRecentAnnouncement(
  createdAt: string,
  maxAgeInHours = 24,
) {
  const publishedAt = new Date(createdAt).getTime();
  const maxAge = maxAgeInHours * 60 * 60 * 1000;

  if (Number.isNaN(publishedAt)) {
    return false;
  }

  return Date.now() - publishedAt <= maxAge;
}

export function formatAnnouncementDate(date: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export async function listAnnouncements(limit = 24) {
  const supabase = getSupabaseClient();
  const response = await supabase
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (response.error) {
    throw response.error;
  }

  return response.data ?? [];
}

export async function getAnnouncementById(id: string) {
  const supabase = getSupabaseClient();
  const response = await supabase
    .from("announcements")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (response.error) {
    throw response.error;
  }

  return response.data;
}

export async function createAnnouncement({
  category,
  content,
  createdBy,
  title,
}: CreateAnnouncementInput) {
  const supabase = getSupabaseClient();
  const insertResponse = await supabase
    .from("announcements")
    .insert({
      category,
      content,
      created_by: createdBy,
      title,
    })
    .select("*")
    .single();

  if (insertResponse.error) {
    throw insertResponse.error;
  }

  const announcement = insertResponse.data;
  try {
    await notifyResidentsForAnnouncement(announcement);
    return { announcement, notificationError: null };
  } catch (notificationError) {
    return {
      announcement,
      notificationError,
    };
  }
}

async function notifyResidentsForAnnouncement(announcement: AnnouncementRow) {
  const supabase = getSupabaseClient();
  const profilesResponse = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "user");

  if (profilesResponse.error) {
    throw profilesResponse.error;
  }

  const residents = profilesResponse.data ?? [];
  if (residents.length === 0) {
    return;
  }

  const insertResponse = await supabase.from("notifications").insert(
    residents.map((resident) => ({
      message: getAnnouncementPreview(announcement.content, 120),
      metadata: {
        announcement_id: announcement.id,
        category: announcement.category,
      },
      title: announcement.title,
      type: "announcement",
      user_id: resident.id,
    })),
  );

  if (insertResponse.error) {
    throw insertResponse.error;
  }
}
