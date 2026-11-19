import { Icon, type IconName } from "@/components/ui/Icon";

type CategoryStyle = { icon: IconName; chip: string; tile: string };

const categoryStyles: Record<string, CategoryStyle> = {
  darurat: {
    icon: "alert",
    chip: "bg-red-50 text-red-700 ring-red-200",
    tile: "bg-red-50 text-red-600",
  },
  kegiatan: {
    icon: "users",
    chip: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    tile: "bg-emerald-50 text-emerald-600",
  },
  layanan: {
    icon: "file",
    chip: "bg-violet-50 text-violet-700 ring-violet-200",
    tile: "bg-violet-50 text-violet-600",
  },
};

const defaultStyle: CategoryStyle = {
  icon: "megaphone",
  chip: "bg-[var(--color-primary-soft)] text-[var(--color-primary)] ring-[var(--color-sky)]/60",
  tile: "bg-[var(--color-primary-soft)] text-[var(--color-primary)]",
};

/** Warna dan ikon per kategori pengumuman (Informasi RT, Layanan, Kegiatan, Darurat). */
export function getCategoryStyle(category: string): CategoryStyle {
  const value = category.toLowerCase();
  const key = Object.keys(categoryStyles).find((name) => value.includes(name));
  return key ? categoryStyles[key] : defaultStyle;
}

export function CategoryChip({ category }: { category: string }) {
  const style = getCategoryStyle(category);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${style.chip}`}
    >
      <Icon name={style.icon} className="h-3 w-3" strokeWidth={2.5} />
      {category.trim() || "Pengumuman"}
    </span>
  );
}

export function CategoryTile({ category, size = "md" }: { category: string; size?: "sm" | "md" }) {
  const style = getCategoryStyle(category);
  const box = size === "sm" ? "h-9 w-9 rounded-lg" : "h-11 w-11 rounded-xl";

  return (
    <span aria-hidden="true" className={`flex shrink-0 items-center justify-center ${box} ${style.tile}`}>
      <Icon name={style.icon} className={size === "sm" ? "h-4 w-4" : "h-5 w-5"} />
    </span>
  );
}
