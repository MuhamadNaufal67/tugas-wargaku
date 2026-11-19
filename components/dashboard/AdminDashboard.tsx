"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { formatNotificationTime } from "@/lib/notifications";
import type { NotificationRow, PengajuanRow } from "@/lib/supabaseClient";
import { Button, LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Icon, type IconName } from "@/components/ui/Icon";
import { getLetterIconName } from "@/components/ui/LetterIcon";

type AdminDashboardState = {
  notifications: NotificationRow[];
  pengajuan: PengajuanRow[];
};

function countByStatus(items: PengajuanRow[], status: string) {
  return items.filter((item) => item.status.toLowerCase() === status).length;
}

function StatCard({
  className = "",
  icon,
  label,
  tile,
  value,
}: {
  className?: string;
  icon: IconName;
  label: string;
  tile: string;
  value: number;
}) {
  return (
    <div className={`flex items-center gap-3 rounded-xl border border-[var(--color-line)] bg-white p-4 ${className}`}>
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tile}`}>
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <div className="flex min-w-0 flex-col-reverse">
        <dt className="truncate text-sm text-slate-500">{label}</dt>
        <dd className="text-2xl font-extrabold tabular-nums text-slate-900">{value}</dd>
      </div>
    </div>
  );
}

function getInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

const statusFilterOptions = [
  { label: "Semua", value: "semua" },
  { label: "Menunggu", value: "pending" },
  { label: "Diproses", value: "diproses" },
  { label: "Selesai", value: "selesai" },
  { label: "Ditolak", value: "ditolak" },
];

export default function AdminDashboard() {
  const router = useRouter();
  const { isAdmin, isLoading: isAuthLoading, supabase, user } = useAuth();
  const [data, setData] = useState<AdminDashboardState>({
    notifications: [],
    pengajuan: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("semua");

  const loadDashboard = useCallback(async () => {
    if (!user || !isAdmin) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const [pengajuanResponse, notificationResponse] = await Promise.all([
      supabase
        .from("pengajuan_surat")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    setData({
      notifications: notificationResponse.data ?? [],
      pengajuan: pengajuanResponse.data ?? [],
    });
    setIsLoading(false);
  }, [isAdmin, supabase, user]);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!user) {
      router.replace("/login?redirect=/admin");
      return;
    }

    if (!isAdmin) {
      router.replace("/dashboard");
      return;
    }

    const timer = window.setTimeout(() => {
      void loadDashboard();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [isAdmin, isAuthLoading, loadDashboard, router, user]);

  const filteredPengajuan = data.pengajuan.filter((item) => {
    const matchesStatus =
      statusFilter === "semua"
        ? true
        : item.status.toLowerCase() === statusFilter;
    const keyword = searchQuery.trim().toLowerCase();
    const matchesQuery =
      keyword === "" ||
      item.nama.toLowerCase().includes(keyword) ||
      item.nik.toLowerCase().includes(keyword) ||
      item.jenis_surat.toLowerCase().includes(keyword);

    return matchesStatus && matchesQuery;
  });

  const recentActivity = data.notifications.slice(0, 6);

  if (isAuthLoading || isLoading) {
    return (
      <div aria-busy="true" aria-label="Memuat dashboard" className="animate-pulse space-y-6">
        <div className="h-44 rounded-2xl bg-slate-200" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {[0, 1, 2, 3, 4].map((key) => (
            <div key={key} className="h-20 rounded-xl border border-[var(--color-line)] bg-white" />
          ))}
        </div>
        <div className="h-80 rounded-xl border border-[var(--color-line)] bg-white" />
      </div>
    );
  }

  const pendingCount = countByStatus(data.pengajuan, "pending");
  const processingCount = countByStatus(data.pengajuan, "diproses");

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl bg-[var(--color-primary)] px-5 py-7 text-white sm:px-8 sm:py-8">
        <div aria-hidden="true" className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Dashboard pengurus</h1>
            <p className="mt-2 max-w-xl leading-7 text-white/85">
              {pendingCount > 0
                ? `Ada ${pendingCount} pengajuan baru yang menunggu diperiksa${
                    processingCount > 0 ? ` dan ${processingCount} sedang diproses` : ""
                  }.`
                : "Tidak ada pengajuan yang menunggu. Semua sudah ditangani."}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <LinkButton href="/status" variant="accent" className="sm:px-5">
              Kelola pengajuan
            </LinkButton>
            <Link
              href="/admin/pengumuman"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/40 px-5 text-sm font-semibold text-white hover:bg-white/10"
            >
              <Icon name="megaphone" className="h-4 w-4" />
              Tulis pengumuman
            </Link>
          </div>
        </div>
      </section>

      <dl className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <StatCard className="col-span-2 lg:col-span-1" icon="file" label="Total" tile="bg-[var(--color-primary-soft)] text-[var(--color-primary)]" value={data.pengajuan.length} />
        <StatCard icon="clock" label="Menunggu" tile="bg-amber-50 text-amber-600" value={pendingCount} />
        <StatCard icon="search" label="Diproses" tile="bg-blue-50 text-blue-600" value={processingCount} />
        <StatCard icon="check" label="Selesai" tile="bg-emerald-50 text-emerald-600" value={countByStatus(data.pengajuan, "selesai")} />
        <StatCard icon="x" label="Ditolak" tile="bg-red-50 text-red-500" value={countByStatus(data.pengajuan, "ditolak")} />
      </dl>

      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.55fr]">
        <section aria-labelledby="recent-title" className="rounded-xl border border-[var(--color-line)] bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--color-line)] px-4 py-3 sm:px-5">
            <h2 id="recent-title" className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Icon name="clipboard" className="h-5 w-5 text-[var(--color-primary)]" />
              Pengajuan terbaru
            </h2>
            <Button onClick={() => void loadDashboard()} variant="secondary" size="sm">
              Muat ulang
            </Button>
          </div>

          <div className="space-y-3 px-4 py-4 sm:px-5">
            <div className="relative">
              <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                aria-label="Cari pengajuan"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Cari nama, NIK, atau jenis surat"
                className="input pl-10"
              />
            </div>
            <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <div role="group" aria-label="Filter status" className="flex w-max gap-1 rounded-xl bg-slate-100 p-1">
                {statusFilterOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={statusFilter === option.value}
                    onClick={() => setStatusFilter(option.value)}
                    className={`min-h-9 rounded-lg px-3.5 text-sm font-semibold ${
                      statusFilter === option.value
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {filteredPengajuan.length === 0 ? (
            <div className="px-4 pb-5 sm:px-5">
              <EmptyState
                icon={<Icon name="search" className="h-8 w-8" strokeWidth={1.5} />}
                title="Tidak ada pengajuan yang cocok"
                description="Ubah kata kunci atau pilih filter Semua."
              />
            </div>
          ) : (
            <ul className="divide-y divide-[var(--color-line)] border-t border-[var(--color-line)]">
              {filteredPengajuan.slice(0, 8).map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/status?highlight=${item.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 sm:px-5"
                  >
                    <span
                      aria-hidden="true"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-sm font-bold text-white"
                    >
                      {getInitials(item.nama)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{item.nama}</p>
                      <p className="flex items-center gap-1.5 truncate text-xs text-slate-500">
                        <Icon name={getLetterIconName(item.jenis_surat)} className="h-3.5 w-3.5 shrink-0" />
                        {item.jenis_surat}
                      </p>
                    </div>
                    <span className="hidden text-xs text-slate-400 sm:block">
                      {formatNotificationTime(item.created_at)}
                    </span>
                    <StatusBadge status={item.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {filteredPengajuan.length > 8 ? (
            <div className="border-t border-[var(--color-line)] px-4 py-3 text-center sm:px-5">
              <Link href="/status" className="text-link text-sm">
                Lihat {filteredPengajuan.length - 8} pengajuan lainnya
              </Link>
            </div>
          ) : null}
        </section>

        <section aria-labelledby="activity-title" className="rounded-xl border border-[var(--color-line)] bg-white">
          <div className="border-b border-[var(--color-line)] px-4 py-3 sm:px-5">
            <h2 id="activity-title" className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Icon name="clock" className="h-5 w-5 text-[var(--color-accent)]" />
              Aktivitas terakhir
            </h2>
          </div>

          {recentActivity.length === 0 ? (
            <div className="p-4 sm:p-5">
              <EmptyState
                icon={<Icon name="clock" className="h-8 w-8" strokeWidth={1.5} />}
                title="Belum ada aktivitas"
                description="Aktivitas muncul setelah warga mengirim pengajuan atau status diubah."
              />
            </div>
          ) : (
            <ol className="px-4 py-4 sm:px-5">
              {recentActivity.map((item, index) => (
                <li key={item.id} className="relative flex gap-3 pb-5 last:pb-0">
                  {index < recentActivity.length - 1 ? (
                    <span aria-hidden="true" className="absolute bottom-0 left-[0.4375rem] top-4 w-px bg-[var(--color-line)]" />
                  ) : null}
                  <span
                    aria-hidden="true"
                    className="relative mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-[3px] border-white bg-[var(--color-primary)] ring-1 ring-[var(--color-sky)]"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-sm leading-6 text-slate-500">{item.message}</p>
                    <p className="mt-1 text-xs text-slate-400">{formatNotificationTime(item.created_at)}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
