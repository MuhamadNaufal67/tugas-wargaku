import { Icon, type IconName } from "@/components/ui/Icon";

export function getLetterIconName(jenisSurat: string): IconName {
  const value = jenisSurat.toLowerCase();
  if (value.includes("domisili")) return "home";
  if (value.includes("tidak mampu") || value.includes("sktm")) return "heart";
  if (value.includes("usaha")) return "briefcase";
  if (value.includes("pengantar")) return "send";
  return "clipboard";
}

/** Ikon berwarna sesuai jenis surat, dipakai di daftar pengajuan. */
export function LetterIcon({
  jenisSurat,
  size = "md",
}: {
  jenisSurat: string;
  size?: "sm" | "md";
}) {
  const boxClassName = size === "sm" ? "h-9 w-9 rounded-lg" : "h-11 w-11 rounded-xl";
  const iconClassName = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center bg-[var(--color-primary-soft)] text-[var(--color-primary)] ${boxClassName}`}
    >
      <Icon name={getLetterIconName(jenisSurat)} className={iconClassName} />
    </span>
  );
}
