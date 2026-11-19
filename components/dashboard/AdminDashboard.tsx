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

type AdminDashboardState = {
  notifications: NotificationRow[];
  pengajuan: PengajuanRow[];
};

function countByStatus(items: PengajuanRow[], status: string) {
  return items.filter((item) => item.status.toLowerCase() === status).length;
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="bg-white px-4 py-4 sm:px-5">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{value}</dd>
    </div>
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
        <div className="h-8 w-60 rounded-md bg-slate-200" />
        <div className="h-24 rounded-xl border border-[var(--color-line)] bg-white" />
        <div className="h-80 rounded-xl border border-[var(--color-line)] bg-white" />
      </div>
    );
  }

  const pendingCount = countByStatus(data.pengajuan, "pending");

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Dashboard pengurus</h1>
          <p className="page-lead">
            {pendingCount > 0
              ? `Ada ${pendingCount} pengajuan yang menunggu untuk diperiksa.`
              : "Tidak ada pengajuan yang menunggu. Semua sudah ditangani."}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <LinkButton href="/status">Kelola pengajuan</LinkButton>
          <LinkButton href="/admin/pengumuman" variant="secondary">
            Tulis pengumuman
          </LinkButton>
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-line)] sm:grid-cols-5 [&>*:first-child]:col-span-2 sm:[&>*:first-child]:col-span-1">
        <StatCard label="Total" value={data.pengajuan.length} />
        <StatCard label="Menunggu" value={pendingCount} />
        <StatCard label="Diproses" value={countByStatus(data.pengajuan, "diproses")} />
        <StatCard label="Selesai" value={countByStatus(data.pengajuan, "selesai")} />
        <StatCard label="Ditolak" value={countByStatus(data.pengajuan, "ditolak")} />
      </dl>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        <section aria-labelledby="recent-title" className="rounded-xl border border-[var(--color-line)] bg-white">
          <div className="flex items-start justify-between gap-3 px-4 pt-4 sm:px-5 sm:pt-5">
            <div>
              <h2 id="recent-title" className="section-title">Pengajuan terbaru</h2>
              <p className="section-lead">8 pengajuan terakhir yang sesuai filter.</p>
            </div>
            <Button onClick={() => void loadDashboard()} variant="secondary" size="sm">
              Muat ulang
            </Button>
          </div>

          <div className="space-y-3 px-4 py-4 sm:px-5">
            <input
              type="search"
              aria-label="Cari pengajuan"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Cari nama, NIK, atau jenis surat"
              className="input"
            />
            <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <div role="group" aria-label="Filter status" className="flex w-max gap-2">
                {statusFilterOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={statusFilter === option.value}
                    onClick={() => setStatusFilter(option.value)}
                    className={`min-h-9 rounded-full px-3.5 text-sm font-semibold ${
                      statusFilter === option.value
                        ? "bg-slate-900 text-white"
                        : "border border-[var(--color-line)] bg-white text-slate-600 hover:text-slate-900"
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
                    className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-slate-50 sm:px-5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{item.nama}</p>
                      <p className="truncate text-sm text-slate-500">{item.jenis_surat}</p>
                    </div>
                    <StatusBadge status={item.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="activity-title" className="rounded-xl border border-[var(--color-line)] bg-white">
          <div className="px-4 pt-4 sm:px-5 sm:pt-5">
            <h2 id="activity-title" className="section-title">Aktivitas terakhir</h2>
            <p className="section-lead">Notifikasi yang dikirim oleh sistem.</p>
          </div>

          {recentActivity.length === 0 ? (
            <div className="p-4 sm:p-5">
              <EmptyState
                title="Belum ada aktivitas"
                description="Aktivitas muncul setelah warga mengirim pengajuan atau status diubah."
              />
            </div>
          ) : (
            <ol className="mt-3 divide-y divide-[var(--color-line)] border-t border-[var(--color-line)]">
              {recentActivity.map((item) => (
                <li key={item.id} className="px-4 py-3 sm:px-5">
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-sm leading-6 text-slate-500">{item.message}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {formatNotificationTime(item.created_at)}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
