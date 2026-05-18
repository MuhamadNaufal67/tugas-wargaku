const relativeTimeFormatter = new Intl.RelativeTimeFormat("id-ID", {
  numeric: "auto",
});

function getRelativeTimeParts(targetDate: Date, now: number) {
  const diffMs = targetDate.getTime() - now;
  const diffMinutes = Math.round(diffMs / 60000);

  if (Math.abs(diffMinutes) < 60) {
    return { unit: "minute" as const, value: diffMinutes };
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return { unit: "hour" as const, value: diffHours };
  }

  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 7) {
    return { unit: "day" as const, value: diffDays };
  }

  const diffWeeks = Math.round(diffDays / 7);
  if (Math.abs(diffWeeks) < 5) {
    return { unit: "week" as const, value: diffWeeks };
  }

  const diffMonths = Math.round(diffDays / 30);
  if (Math.abs(diffMonths) < 12) {
    return { unit: "month" as const, value: diffMonths };
  }

  return { unit: "year" as const, value: Math.round(diffDays / 365) };
}

export function formatRelativeTime(dateString: string | null, now = Date.now()) {
  if (!dateString) {
    return "Baru saja";
  }

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return "Baru saja";
  }

  const { unit, value } = getRelativeTimeParts(date, now);
  return relativeTimeFormatter.format(value, unit);
}
