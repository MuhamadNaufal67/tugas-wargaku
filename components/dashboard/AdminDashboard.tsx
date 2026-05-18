"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { formatNotificationTime } from "@/lib/notifications";
import type { NotificationRow, PengajuanRow } from "@/lib/supabaseClient";
import { Button, LinkButton } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
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
    <Card>
      <CardContent>
        <p className="text-sm font-semibold text-slate-500">{label}</p>
        <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

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
      <div className="grid gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-36 animate-pulse rounded-[1.7rem] border border-white/80 bg-white/95 shadow-sm"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardContent className="space-y-5">
            <span className="inline-flex rounded-full bg-[var(--color-primary-soft)] px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-primary)]">
              Panel Pengurus
            </span>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
                Kendalikan seluruh alur administrasi warga dari satu panel.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">
                Ringkasan ini menampilkan total pengajuan, aktivitas terbaru,
                dan pintasan untuk memproses layanan warga lebih cepat.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <LinkButton href="/status">Buka Panel Status</LinkButton>
              <LinkButton href="/ajukan-surat" variant="secondary">
                Lihat Form Warga
              </LinkButton>
              <LinkButton href="/admin/pengumuman" variant="ghost">
                Kelola Pengumuman
              </LinkButton>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">
              Aksi Cepat
            </p>
            <div className="grid gap-3">
              <LinkButton href="/status" variant="secondary">
                Tinjau Pengajuan Terbaru
              </LinkButton>
              <LinkButton href="/admin/pengumuman" variant="secondary">
                Tulis Pengumuman Warga
              </LinkButton>
              <LinkButton href="/status" variant="warning">
                Periksa Pengajuan Ditolak
              </LinkButton>
              <LinkButton href="/status" variant="success">
                Siapkan Surat Selesai
              </LinkButton>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total Pengajuan" value={data.pengajuan.length} />
        <StatCard label="Pending" value={countByStatus(data.pengajuan, "pending")} />
        <StatCard label="Diproses" value={countByStatus(data.pengajuan, "diproses")} />
        <StatCard label="Selesai" value={countByStatus(data.pengajuan, "selesai")} />
        <StatCard label="Ditolak" value={countByStatus(data.pengajuan, "ditolak")} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  Pengajuan Terbaru
                </h2>
                <p className="text-sm text-slate-500">
                  Filter cepat berdasarkan status, nama, atau NIK.
                </p>
              </div>
              <Button onClick={() => void loadDashboard()} variant="secondary">
                Refresh
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Cari nama, NIK, atau jenis surat..."
                className="w-full rounded-[1.15rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-primary)] focus:bg-white"
              />
              <div className="flex flex-wrap gap-2">
                {["semua", "pending", "diproses", "selesai", "ditolak"].map(
                  (value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setStatusFilter(value)}
                      className={`rounded-full px-4 py-2 text-xs font-semibold capitalize transition ${
                        statusFilter === value
                          ? "bg-[var(--color-primary)] text-white"
                          : "border border-slate-200 bg-white text-slate-600 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                      }`}
                    >
                      {value}
                    </button>
                  ),
                )}
              </div>
            </div>

            {filteredPengajuan.length === 0 ? (
              <EmptyState
                title="Belum ada hasil yang cocok"
                description="Coba ubah filter atau kata kunci pencarian untuk menemukan pengajuan."
              />
            ) : (
              <div className="grid gap-3">
                {filteredPengajuan.slice(0, 8).map((item) => (
                  <div
                    key={item.id}
                    className="rounded-[1.3rem] border border-slate-200 bg-slate-50/80 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-base font-bold text-slate-900">
                          {item.nama}
                        </p>
                        <p className="text-sm text-slate-500">
                          {item.jenis_surat} • NIK {item.nik}
                        </p>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        href={`/status?highlight=${item.id}`}
                        className="inline-flex min-h-10 items-center justify-center rounded-full bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-white"
                      >
                        Buka Detail
                      </Link>
                      <Link
                        href="/status"
                        className="inline-flex min-h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700"
                      >
                        Update Status
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-slate-950">
                Aktivitas Terbaru
              </h2>
              <p className="text-sm text-slate-500">
                Aktivitas notifikasi terbaru yang tercatat di sistem.
              </p>
            </div>

            {recentActivity.length === 0 ? (
              <EmptyState
                title="Aktivitas belum tersedia"
                description="Notifikasi sistem akan muncul di sini setelah ada pengajuan atau perubahan status."
              />
            ) : (
              <div className="space-y-3">
                {recentActivity.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-[1.25rem] border border-slate-200 bg-white p-4"
                  >
                    <p className="text-sm font-bold text-slate-900">
                      {item.title}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      {item.message}
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                      {formatNotificationTime(item.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
