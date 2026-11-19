"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ToastContainer } from "@/components/Toast";
import { LetterTemplatePreview } from "@/components/pdf/LetterTemplatePreview";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { createNotification } from "@/lib/notifications";
import {
  downloadSubmissionPdf,
  generateLetterFileName,
  prepareSubmissionPdf,
} from "@/lib/pengajuan";
import {
  formatSupabaseError,
  logAuthWarning,
} from "@/lib/supabaseAuthErrors";
import type { PengajuanRow } from "@/lib/supabaseClient";

type StatusFilter = "semua" | "pending" | "diproses" | "selesai" | "ditolak";
type UpdatableStatus = "pending" | "diproses" | "selesai" | "ditolak";

const statusStyles = {
  pending: "border border-amber-300 bg-amber-50 text-amber-800",
  diproses: "border border-blue-300 bg-blue-50 text-blue-800",
  selesai: "border border-emerald-300 bg-emerald-50 text-emerald-800",
  diterima: "border border-emerald-300 bg-emerald-50 text-emerald-800",
  ditolak: "border border-red-300 bg-red-50 text-red-700",
} as const;

const filterOptions: Array<{ label: string; value: StatusFilter }> = [
  { value: "semua", label: "Semua" },
  { value: "pending", label: "Menunggu" },
  { value: "diproses", label: "Diproses" },
  { value: "selesai", label: "Selesai" },
  { value: "ditolak", label: "Ditolak" },
];

const updateStatusOptions: Array<{ label: string; value: UpdatableStatus }> = [
  { value: "pending", label: "Menunggu" },
  { value: "diproses", label: "Diproses" },
  { value: "selesai", label: "Selesai" },
  { value: "ditolak", label: "Tolak" },
];

function formatTanggal(createdAt: string | null) {
  if (!createdAt) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(createdAt));
}

function getStatusClassName(status: string) {
  const normalizedStatus = status.toLowerCase() as keyof typeof statusStyles;
  return (
    statusStyles[normalizedStatus] ??
    "border border-slate-200 bg-slate-100 text-slate-700"
  );
}

function getStatusLabel(status: string) {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus === "pending") return "Menunggu";
  if (normalizedStatus === "diproses") return "Diproses";
  if (normalizedStatus === "selesai") return "Selesai";
  if (normalizedStatus === "diterima") return "Diterima";
  if (normalizedStatus === "ditolak") return "Ditolak";

  return status;
}

function isDownloadReady(status: string) {
  const normalizedStatus = status.toLowerCase();
  return normalizedStatus === "selesai" || normalizedStatus === "diterima";
}

export default function StatusPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAdmin, isAuthenticated, isLoading: isAuthLoading, supabase, user } =
    useAuth();
  const { toasts, showToast, dismiss } = useToast();

  const [dataPengajuan, setDataPengajuan] = useState<PengajuanRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeFilter, setActiveFilter] = useState<StatusFilter>("semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPengajuan, setSelectedPengajuan] =
    useState<PengajuanRow | null>(null);
  const [updatingStatusMap, setUpdatingStatusMap] = useState<
    Record<number, UpdatableStatus | undefined>
  >({});
  const [rejectTarget, setRejectTarget] = useState<PengajuanRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [recentPdfMessage, setRecentPdfMessage] = useState("");

  const highlightedPengajuanId = Number(searchParams.get("highlight"));

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.replace("/login?redirect=/status");
    }
  }, [isAuthenticated, isAuthLoading, router]);

  const fetchPengajuanSurat = useCallback(async () => {
    if (!user) {
      setDataPengajuan([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      let query = supabase
        .from("pengajuan_surat")
        .select("*")
        .order("created_at", { ascending: false });

      if (!isAdmin) {
        query = query.eq("user_id", user.id);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      setDataPengajuan(data ?? []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Gagal mengambil data pengajuan.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, supabase, user]);

  useEffect(() => {
    if (isAuthLoading || !user) {
      return;
    }

    const timer = window.setTimeout(() => {
      void fetchPengajuanSurat();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchPengajuanSurat, isAuthLoading, user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const channelName = isAdmin
      ? "status-page:pengajuan:admin"
      : `status-page:pengajuan:${user.id}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pengajuan_surat",
        },
        () => {
          void fetchPengajuanSurat();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchPengajuanSurat, isAdmin, supabase, user]);

  const filteredPengajuan = dataPengajuan.filter((item) => {
    const normalizedStatus = item.status.toLowerCase();
    const matchesFilter =
      activeFilter === "semua"
        ? true
        : activeFilter === "selesai"
          ? normalizedStatus === "selesai" || normalizedStatus === "diterima"
          : normalizedStatus === activeFilter;

    const keyword = searchQuery.toLowerCase().trim();
    const matchesSearch =
      keyword === "" ||
      item.nama.toLowerCase().includes(keyword) ||
      item.nik.toLowerCase().includes(keyword) ||
      item.jenis_surat.toLowerCase().includes(keyword) ||
      item.alamat.toLowerCase().includes(keyword);

    return matchesFilter && matchesSearch;
  });

  const highlightedPengajuan =
    Number.isFinite(highlightedPengajuanId) && highlightedPengajuanId > 0
      ? dataPengajuan.find((item) => item.id === highlightedPengajuanId) ?? null
      : null;
  const activeSelectedPengajuan = selectedPengajuan ?? highlightedPengajuan;

  async function handleStatusUpdate(
    item: PengajuanRow,
    nextStatus: UpdatableStatus,
    options?: {
      alasanPenolakan?: string | null;
      fileSurat?: string | null;
    },
  ) {
    if (!isAdmin || !user) {
      showToast(
        "warning",
        "Akses terbatas",
        "Hanya pengurus yang dapat memperbarui status pengajuan.",
      );
      return;
    }

    const previousItem = item;
    let nextFileSurat =
      options?.fileSurat ??
      (nextStatus === "selesai"
        ? item.file_surat || generateLetterFileName(item)
        : item.file_surat);
    let generatedPdfMessage = "";

    if (nextStatus === "selesai") {
      const preparedPdf = prepareSubmissionPdf(item);
      nextFileSurat = options?.fileSurat ?? preparedPdf.fileName;
      generatedPdfMessage = `${preparedPdf.template.title} berhasil dibuat dengan nomor ${preparedPdf.nomorSurat}.`;
    }

    if (
      previousItem.status.toLowerCase() === nextStatus &&
      previousItem.alasan_penolakan ===
        (options?.alasanPenolakan ?? previousItem.alasan_penolakan) &&
      previousItem.file_surat === nextFileSurat
    ) {
      return;
    }

    setUpdatingStatusMap((current) => ({ ...current, [item.id]: nextStatus }));

    setDataPengajuan((current) =>
      current.map((pengajuan) =>
        pengajuan.id === item.id
          ? {
              ...pengajuan,
              alasan_penolakan:
                options?.alasanPenolakan ?? pengajuan.alasan_penolakan,
              file_surat: nextFileSurat,
              status: nextStatus,
            }
          : pengajuan,
      ),
    );

    if (selectedPengajuan?.id === item.id) {
      setSelectedPengajuan((current) =>
        current
          ? {
              ...current,
              alasan_penolakan:
                options?.alasanPenolakan ?? current.alasan_penolakan,
              file_surat: nextFileSurat,
              status: nextStatus,
            }
          : current,
      );
    }

    try {
      const { error } = await supabase
        .from("pengajuan_surat")
        .update({
          alasan_penolakan:
            options?.alasanPenolakan === undefined
              ? nextStatus === "ditolak"
                ? item.alasan_penolakan
                : null
              : options.alasanPenolakan,
          file_surat: nextFileSurat,
          status: nextStatus,
        })
        .eq("id", item.id);

      if (error) {
        throw error;
      }

      if (item.user_id) {
        const notificationTitle =
          nextStatus === "ditolak"
            ? "Perlu perbaikan data"
            : nextStatus === "selesai"
              ? "Surat sudah siap"
              : "Perkembangan pengajuan";

        const notificationMessage =
          nextStatus === "ditolak"
            ? `${item.jenis_surat} perlu diperbaiki. Catatan pengurus: ${options?.alasanPenolakan ?? "Silakan periksa kembali data pengajuan Anda."}`
            : nextStatus === "selesai"
              ? `${item.jenis_surat} sudah selesai diproses dan surat dapat diunduh.`
              : `${item.jenis_surat} kini berada pada tahap ${getStatusLabel(nextStatus)}.`;

        try {
          await createNotification({
            message: notificationMessage,
            metadata: {
              pengajuan_id: item.id,
              status: nextStatus,
            },
            title: notificationTitle,
            type: nextStatus,
            userId: item.user_id,
          });
        } catch (notificationError) {
          logAuthWarning("status notification skipped", notificationError, {
            pengajuan_id: item.id,
            status: nextStatus,
            user_id: item.user_id,
          });
          showToast(
            "warning",
            "Perubahan tersimpan",
            `Perubahan layanan berhasil disimpan, tetapi pemberitahuan belum dapat dikirim. ${formatSupabaseError(notificationError)}`,
          );
        }
      }

      if (nextStatus === "selesai") {
        setRecentPdfMessage(generatedPdfMessage);
      } else {
        setRecentPdfMessage("");
      }

      showToast(
        "success",
        "Perubahan tersimpan",
        nextStatus === "selesai" && generatedPdfMessage
          ? `Tahap layanan berhasil diubah ke ${getStatusLabel(nextStatus)}. ${generatedPdfMessage}`
          : `Tahap layanan berhasil diubah ke ${getStatusLabel(nextStatus)}.`,
      );
    } catch (error) {
      setDataPengajuan((current) =>
        current.map((pengajuan) =>
          pengajuan.id === item.id ? previousItem : pengajuan,
        ),
      );

      if (selectedPengajuan?.id === item.id) {
        setSelectedPengajuan(previousItem);
      }

      showToast(
        "error",
        "Gagal memperbarui",
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat memperbarui status.",
      );
    } finally {
      setUpdatingStatusMap((current) => ({ ...current, [item.id]: undefined }));
    }
  }

  async function handleDeletePengajuan(item: PengajuanRow) {
    if (!isAdmin) {
      return;
    }

    const confirmDelete = window.confirm(
      "Yakin ingin menghapus pengajuan ini?",
    );

    if (!confirmDelete) {
      return;
    }

    const previousData = dataPengajuan;

    setDataPengajuan((current) =>
      current.filter((pengajuan) => pengajuan.id !== item.id),
    );

    if (selectedPengajuan?.id === item.id) {
      setSelectedPengajuan(null);
    }

    try {
      const { error } = await supabase
        .from("pengajuan_surat")
        .delete()
        .eq("id", item.id);

      if (error) {
        throw error;
      }

      showToast(
        "success",
        "Berhasil dihapus",
        "Pengajuan berhasil dihapus.",
      );
    } catch (error) {
      setDataPengajuan(previousData);
      showToast(
        "error",
        "Gagal menghapus",
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat menghapus.",
      );
    }
  }

  function startRejectFlow(item: PengajuanRow) {
    setRejectTarget(item);
    setRejectReason(item.alasan_penolakan ?? "");
  }

  async function confirmReject() {
    if (!rejectTarget) {
      return;
    }

    const trimmedReason = rejectReason.trim();

    if (!trimmedReason) {
      showToast(
        "warning",
        "Catatan belum diisi",
        "Isi catatan perbaikan sebelum mengubah status menjadi ditolak.",
      );
      return;
    }

    await handleStatusUpdate(rejectTarget, "ditolak", {
      alasanPenolakan: trimmedReason,
      fileSurat: null,
    });

    setRejectTarget(null);
    setRejectReason("");
  }

  function handleDownload(item: PengajuanRow) {
    downloadSubmissionPdf(item);
    showToast("success", "Unduhan dimulai", "Surat PDF sedang diunduh.");
  }

  function handleReapply(item: PengajuanRow) {
    sessionStorage.setItem(
      "wargaku-reapply-draft",
      JSON.stringify({
        alamat: item.alamat,
        id: item.id,
        jenis_surat: item.jenis_surat,
        nama: item.nama,
        nik: item.nik,
      }),
    );

    router.push("/ajukan-surat?reapply=1");
  }

  function closeSelectedPengajuan() {
    setSelectedPengajuan(null);
    setRecentPdfMessage("");

    if (searchParams.get("highlight")) {
      router.replace("/status", { scroll: false });
    }
  }

  if (isAuthLoading || (!isAuthenticated && typeof window !== "undefined")) {
    return (
      <div aria-busy="true" aria-label="Memuat pengajuan" className="animate-pulse space-y-4">
        <div className="h-8 w-56 rounded-md bg-slate-200" />
        <div className="h-11 rounded-lg bg-slate-200/70" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-48 rounded-xl border border-[var(--color-line)] bg-white" />
          <div className="h-48 rounded-xl border border-[var(--color-line)] bg-white" />
        </div>
      </div>
    );
  }

  const isRejected = (item: PengajuanRow) => item.status.toLowerCase() === "ditolak";

  return (
    <div className="space-y-6">
      <PageHeader
        icon={isAdmin ? "clipboard" : "search"}
        title={isAdmin ? "Kelola pengajuan" : "Status pengajuan"}
        lead={
          isAdmin
            ? "Periksa pengajuan warga, ubah statusnya, dan buat surat PDF saat pengajuan selesai."
            : "Semua surat yang pernah Anda ajukan. Status diperbarui otomatis saat pengurus memprosesnya."
        }
        actions={
          !isAdmin ? (
            <button
              type="button"
              onClick={() => router.push("/ajukan-surat")}
              className="min-h-11 shrink-0 rounded-lg bg-[var(--color-accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-accent-strong)]"
            >
              Ajukan surat baru
            </button>
          ) : null
        }
      />

      <section aria-label="Pencarian dan filter" className="space-y-3">
        <div className="relative">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>

          <input
            type="search"
            aria-label="Cari pengajuan"
            placeholder={isAdmin ? "Cari nama, NIK, jenis surat, atau alamat" : "Cari jenis surat"}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="input pl-10 pr-11"
          />

          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:text-slate-700"
              aria-label="Hapus pencarian"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              >
                <path d="M6 6 18 18" />
                <path d="M18 6 6 18" />
              </svg>
            </button>
          ) : null}
        </div>

        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <div role="group" aria-label="Filter status" className="flex w-max gap-2">
            {filterOptions.map((filter) => {
              const isActive = activeFilter === filter.value;

              return (
                <button
                  key={filter.value}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setActiveFilter(filter.value)}
                  className={`min-h-10 rounded-full px-4 text-sm font-semibold ${
                    isActive
                      ? "bg-slate-900 text-white"
                      : "border border-[var(--color-line)] bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>

        {!isLoading && !errorMessage ? (
          <p className="text-sm text-slate-500" aria-live="polite">
            {filteredPengajuan.length} pengajuan
            {searchQuery ? <> untuk &ldquo;{searchQuery}&rdquo;</> : null}
          </p>
        ) : null}
      </section>

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2" aria-busy="true">
          <div className="h-48 animate-pulse rounded-xl border border-[var(--color-line)] bg-white" />
          <div className="h-48 animate-pulse rounded-xl border border-[var(--color-line)] bg-white" />
        </div>
      ) : null}

      {!isLoading && errorMessage ? (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {!isLoading && !errorMessage && filteredPengajuan.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-line)] px-6 py-12 text-center">
          <p className="font-semibold text-slate-900">
            {searchQuery || activeFilter !== "semua"
              ? "Tidak ada pengajuan yang cocok"
              : "Belum ada pengajuan"}
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">
            {searchQuery || activeFilter !== "semua"
              ? "Ubah kata kunci atau pilih filter Semua."
              : isAdmin
                ? "Pengajuan dari warga akan muncul di sini."
                : "Surat yang Anda ajukan akan muncul di sini beserta statusnya."}
          </p>
          {!isAdmin && !searchQuery && activeFilter === "semua" ? (
            <button
              type="button"
              onClick={() => router.push("/ajukan-surat")}
              className="mt-5 min-h-11 rounded-lg bg-[var(--color-primary)] px-5 text-sm font-semibold text-white hover:bg-[var(--color-primary-strong)]"
            >
              Ajukan surat pertama
            </button>
          ) : null}
        </div>
      ) : null}

      {!isLoading && !errorMessage && filteredPengajuan.length > 0 ? (
        <ul className="grid gap-4 lg:grid-cols-2">
          {filteredPengajuan.map((item) => {
            const itemUpdatingStatus = updatingStatusMap[item.id];

            return (
              <li
                key={item.id}
                className={`flex flex-col rounded-xl border bg-white ${
                  item.id === highlightedPengajuanId
                    ? "border-[var(--color-primary)] ring-3 ring-[var(--color-primary)]/15"
                    : "border-[var(--color-line)]"
                }`}
              >
                <div className="flex items-start justify-between gap-3 px-4 pt-4 sm:px-5 sm:pt-5">
                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-slate-900">{item.jenis_surat}</h2>
                    <p className="mt-0.5 text-sm text-slate-500">
                      Diajukan {formatTanggal(item.created_at)}
                    </p>
                  </div>
                  <StatusBadge status={item.status} />
                </div>

                <div className="flex-1 px-4 py-3 sm:px-5">
                  <p className="text-sm font-medium text-slate-800">{item.nama}</p>
                  <p className="text-sm tabular-nums text-slate-500">NIK {item.nik}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">{item.alamat}</p>

                  {isRejected(item) && item.alasan_penolakan ? (
                    <div className="mt-3 rounded-lg bg-red-50 px-3.5 py-2.5 text-sm leading-6 text-red-800">
                      <span className="font-semibold">Catatan pengurus:</span>{" "}
                      {item.alasan_penolakan}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-[var(--color-line)] px-4 py-3 sm:px-5">
                  <button
                    type="button"
                    onClick={() => {
                      setRecentPdfMessage("");
                      setSelectedPengajuan(item);
                    }}
                    className="min-h-10 rounded-lg border border-[var(--color-line)] bg-white px-3.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                  >
                    Lihat detail
                  </button>

                  {isDownloadReady(item.status) ? (
                    <button
                      type="button"
                      onClick={() => handleDownload(item)}
                      className="min-h-10 rounded-lg bg-[var(--color-primary)] px-3.5 text-sm font-semibold text-white hover:bg-[var(--color-primary-strong)]"
                    >
                      Unduh surat
                    </button>
                  ) : null}

                  {!isAdmin && isRejected(item) ? (
                    <button
                      type="button"
                      onClick={() => handleReapply(item)}
                      className="min-h-10 rounded-lg bg-[var(--color-accent)] px-3.5 text-sm font-semibold text-white hover:bg-[var(--color-accent-strong)]"
                    >
                      Ajukan ulang
                    </button>
                  ) : null}

                  {isAdmin ? (
                    <button
                      type="button"
                      onClick={() => handleDeletePengajuan(item)}
                      className="ml-auto min-h-10 rounded-lg px-3 text-sm font-semibold text-red-600 hover:bg-red-50"
                    >
                      Hapus
                    </button>
                  ) : null}
                </div>

                {isAdmin ? (
                  <div className="border-t border-[var(--color-line)] bg-slate-50/70 px-4 py-3 sm:px-5">
                    <p id={`status-label-${item.id}`} className="mb-2 text-xs font-semibold text-slate-500">
                      Ubah status
                    </p>
                    <div
                      role="group"
                      aria-labelledby={`status-label-${item.id}`}
                      className="grid grid-cols-2 gap-2 sm:grid-cols-4"
                    >
                      {updateStatusOptions.map((statusOption) => {
                        const isUpdating = itemUpdatingStatus === statusOption.value;
                        const isDisabled = Boolean(itemUpdatingStatus);
                        const isActive = item.status.toLowerCase() === statusOption.value;

                        return (
                          <button
                            key={statusOption.value}
                            type="button"
                            aria-pressed={isActive}
                            onClick={() => {
                              if (statusOption.value === "ditolak") {
                                startRejectFlow(item);
                                return;
                              }

                              void handleStatusUpdate(item, statusOption.value);
                            }}
                            disabled={isDisabled}
                            className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
                              isActive
                                ? getStatusClassName(statusOption.value)
                                : "border border-[var(--color-line)] bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
                            }`}
                          >
                            {isUpdating ? (
                              <span aria-hidden="true" className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            ) : null}
                            {isUpdating ? "Menyimpan…" : statusOption.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      {activeSelectedPengajuan ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 sm:items-center sm:p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeSelectedPengajuan();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="detail-title"
            className="flex max-h-[92vh] w-full max-w-xl flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[var(--color-line)] px-5 py-4">
              <div className="min-w-0">
                <h2 id="detail-title" className="text-lg font-bold text-slate-900">
                  {activeSelectedPengajuan.jenis_surat}
                </h2>
                <div className="mt-1.5">
                  <StatusBadge status={activeSelectedPengajuan.status} />
                </div>
              </div>

              <button
                type="button"
                onClick={closeSelectedPengajuan}
                className="-mr-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Tutup"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                >
                  <path d="M6 6 18 18" />
                  <path d="M18 6 6 18" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-4">
              <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                {[
                  { label: "Nama", value: activeSelectedPengajuan.nama },
                  { label: "NIK", value: activeSelectedPengajuan.nik },
                  {
                    label: "Tanggal pengajuan",
                    value: formatTanggal(activeSelectedPengajuan.created_at),
                  },
                  {
                    label: "Dokumen pendukung",
                    value: activeSelectedPengajuan.dokumen || "Tidak ada",
                  },
                ].map((field) => (
                  <div key={field.label} className="min-w-0">
                    <dt className="text-xs text-slate-500">{field.label}</dt>
                    <dd className="mt-0.5 break-words text-sm font-medium text-slate-900">
                      {field.value}
                    </dd>
                  </div>
                ))}
                <div className="sm:col-span-2">
                  <dt className="text-xs text-slate-500">Alamat</dt>
                  <dd className="mt-0.5 text-sm leading-6 text-slate-900">
                    {activeSelectedPengajuan.alamat}
                  </dd>
                </div>
              </dl>

              {activeSelectedPengajuan.alasan_penolakan ? (
                <div className="mt-4 rounded-lg bg-red-50 px-3.5 py-3">
                  <p className="text-xs font-semibold text-red-700">Catatan pengurus</p>
                  <p className="mt-1 text-sm leading-6 text-red-800">
                    {activeSelectedPengajuan.alasan_penolakan}
                  </p>
                </div>
              ) : null}

              {isAdmin ? (
                <div className="mt-5 border-t border-[var(--color-line)] pt-4">
                  <h3 className="text-sm font-bold text-slate-900">Pratinjau surat</h3>
                  <p className="mt-0.5 text-sm text-slate-500">
                    Format ini dipakai saat status diubah menjadi Selesai.
                  </p>

                  <div className="mt-3">
                    <LetterTemplatePreview
                      jenisSurat={activeSelectedPengajuan.jenis_surat}
                      nomorSurat={prepareSubmissionPdf(activeSelectedPengajuan).nomorSurat}
                    />
                  </div>

                  {recentPdfMessage ? (
                    <div role="status" className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-800">
                      {recentPdfMessage}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-[var(--color-line)] px-5 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeSelectedPengajuan}
                className="min-h-11 rounded-lg border border-[var(--color-line)] bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Tutup
              </button>

              {!isAdmin && isRejected(activeSelectedPengajuan) ? (
                <button
                  type="button"
                  onClick={() => handleReapply(activeSelectedPengajuan)}
                  className="min-h-11 rounded-lg bg-[var(--color-accent)] px-5 text-sm font-semibold text-white hover:bg-[var(--color-accent-strong)]"
                >
                  Ajukan ulang
                </button>
              ) : null}

              {isDownloadReady(activeSelectedPengajuan.status) ? (
                <button
                  type="button"
                  onClick={() => handleDownload(activeSelectedPengajuan)}
                  className="min-h-11 rounded-lg bg-[var(--color-primary)] px-5 text-sm font-semibold text-white hover:bg-[var(--color-primary-strong)]"
                >
                  Unduh surat
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {rejectTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 sm:items-center sm:p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setRejectTarget(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reject-title"
            className="w-full max-w-lg rounded-t-2xl bg-white shadow-xl sm:rounded-xl"
          >
            <div className="border-b border-[var(--color-line)] px-5 py-4">
              <h2 id="reject-title" className="text-lg font-bold text-slate-900">
                Tolak pengajuan
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                {rejectTarget.nama} akan menerima catatan ini dan bisa
                mengajukan ulang setelah memperbaikinya.
              </p>
            </div>

            <div className="px-5 py-4">
              <label htmlFor="rejectReason" className="label">
                Apa yang perlu diperbaiki?
              </label>
              <textarea
                id="rejectReason"
                rows={4}
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
                className="input"
                placeholder="Contoh: NIK tidak sesuai dengan KTP. Mohon periksa kembali."
              />
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-[var(--color-line)] px-5 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                className="min-h-11 rounded-lg border border-[var(--color-line)] bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => void confirmReject()}
                className="min-h-11 rounded-lg bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-700"
              >
                Tolak pengajuan
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
