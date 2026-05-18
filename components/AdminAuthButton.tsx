"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

type AdminAuthButtonProps = {
  className?: string;
  loadingClassName?: string;
};

export default function AdminAuthButton({
  className,
  loadingClassName,
}: AdminAuthButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoading, signOut, user } = useAuth();

  const buttonClassName =
    className ??
    "inline-flex min-h-10 items-center rounded-full border border-slate-200/80 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]";
  const pendingClassName =
    loadingClassName ??
    "inline-flex min-h-10 items-center rounded-full border border-slate-200/80 bg-white px-4 py-2.5 text-sm font-semibold text-slate-400 shadow-sm";

  async function handleLogout() {
    await signOut();
    router.replace("/login");
    router.refresh();
  }

  if (isLoading) {
    return (
      <span className={pendingClassName}>
        Memuat...
      </span>
    );
  }

  if (!user) {
    const nextPath =
      pathname && pathname !== "/login" ? `?redirect=${pathname}` : "";

    return (
      <Link
        href={`/login${nextPath}`}
        className={buttonClassName}
      >
        Masuk
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className={buttonClassName}
    >
      Logout
    </button>
  );
}
