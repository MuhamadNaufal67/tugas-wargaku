"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ToastContainer } from "@/components/Toast";
import { LetterTemplatePreview } from "@/components/pdf/LetterTemplatePreview";
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
  pending: "border border-amber-200 bg-amber-100 text-amber-700",
  diproses: "border border-blue-200 bg-blue-100 text-blue-700",
  selesai: "border border-emerald-200 bg-emerald-100 text-emerald-700",
  diterima: "border border-emerald-200 bg-emerald-100 text-emerald-700",
  ditolak: "border border-red-200 bg-red-100 text-red-700",
} as const;

const filterOptions: Array<{ label: string; value: StatusFilter }> = [
  { value: "semua", label: "Semua" },
  { value: "pending", label: "Pending" },
  { value: "diproses", label: "Diproses" },
  { value: "selesai", label: "Selesai" },
  { value: "ditolak", label: "Ditolak" },
];

const updateStatusOptions: Array<{ label: string; value: UpdatableStatus }> = [
  { value: "pending", label: "Pending" },
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

  if (normalizedStatus === "pending") return "Pending";
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
      <div className="rounded-[1.8rem] border border-white/80 bg-white/95 p-5 shadow-sm sm:p-7">
        <div className="animate-pulse space-y-5">
          <div className="h-6 w-40 rounded-full bg-slate-200" />
          <div className="h-12 rounded-[1.2rem] bg-slate-100" />
          <div className="flex gap-2">
            <div className="h-9 w-24 rounded-full bg-slate-100" />
            <div className="h-9 w-24 rounded-full bg-slate-100" />
            <div className="h-9 w-24 rounded-full bg-slate-100" />
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="h-52 rounded-[1.6rem] bg-slate-100" />
            <div className="h-52 rounded-[1.6rem] bg-slate-100" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="rounded-[1.9rem] border border-white/80 bg-white/95 p-5 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span className="inline-flex rounded-full bg-[var(--color-primary-soft)] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-primary)]">
              {isAdmin ? "Panel Pengurus" : "Status Pengajuan"}
            </span>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl lg:text-4xl">
              {isAdmin
                ? "Kelola seluruh pengajuan surat warga dari satu halaman."
                : "Pantau perkembangan pengajuan surat Anda secara langsung."}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500 sm:text-base">
              Halaman ini membantu warga memantau proses layanan, sementara pengurus
              dapat meninjau detail pengajuan, memberi catatan, dan menyiapkan surat selesai.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="relative">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400"
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
            type="text"
            placeholder="Cari nama, NIK, jenis surat, atau alamat..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="w-full rounded-[1.15rem] border border-slate-200 bg-white py-3 pl-10 pr-10 text-sm text-slate-700 shadow-sm outline-none placeholder:text-slate-400 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-soft)]"
          />

          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label="Hapus pencarian"
            >
              <svg
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

        <div className="flex flex-wrap gap-2">
          {filterOptions.map((filter) => {
            const isActive = activeFilter === filter.value;

            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => setActiveFilter(filter.value)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "bg-[var(--color-primary)] text-white shadow-sm"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>

        {!isLoading && !errorMessage ? (
          <p className="text-sm text-slate-500">
            Menampilkan{" "}
            <span className="font-semibold text-[var(--color-primary)]">
              {filteredPengajuan.length}
            </span>{" "}
            pengajuan
            {searchQuery ? (
              <>
                {" "}untuk{" "}
                <span className="font-semibold text-slate-700">
                  &quot;{searchQuery}&quot;
                </span>
              </>
            ) : null}
          </p>
        ) : null}

        {isLoading ? (
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="h-56 animate-pulse rounded-[1.6rem] bg-slate-100" />
            <div className="h-56 animate-pulse rounded-[1.6rem] bg-slate-100" />
          </div>
        ) : null}

        {!isLoading && errorMessage ? (
          <div className="rounded-[1.3rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        {!isLoading && !errorMessage && filteredPengajuan.length === 0 ? (
          <div className="rounded-[1.7rem] border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
            <p className="text-base font-semibold text-slate-900">
              {searchQuery ? "Tidak ada hasil yang cocok" : "Belum ada pengajuan"}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {searchQuery
                ? `Coba kata kunci lain untuk "${searchQuery}".`
                : isAdmin
                  ? "Pengajuan warga akan muncul di sini setelah ada formulir yang dikirim."
                  : "Ajukan surat pertama Anda untuk mulai memantau statusnya."}
            </p>
          </div>
        ) : null}

        {!isLoading && !errorMessage ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {filteredPengajuan.map((item) => {
              const itemUpdatingStatus = updatingStatusMap[item.id];

              return (
                <article
                  key={item.id}
                  className={`rounded-[1.7rem] border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                    item.id === highlightedPengajuanId
                      ? "border-[var(--color-primary)] ring-2 ring-[var(--color-primary-soft)]"
                      : "border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-bold text-slate-900">
                        {item.jenis_surat}
                      </h2>
                      <p className="mt-0.5 text-xs text-slate-400">
                        Diajukan {formatTanggal(item.created_at)}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${getStatusClassName(item.status)}`}
                    >
                      {getStatusLabel(item.status)}
                    </span>
                  </div>

                  <div className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 24 24"
                          className="h-5 w-5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M20 21a8 8 0 0 0-16 0" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      </span>

                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">
                          {item.nama}
                        </p>
                        <p className="text-xs text-slate-400">NIK {item.nik}</p>
                      </div>
                    </div>

                    <p className="mt-3 text-sm leading-relaxed text-slate-500">
                      {item.alamat}
                    </p>

                    {item.status.toLowerCase() === "ditolak" &&
                    item.alasan_penolakan ? (
                      <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        <span className="font-semibold">Alasan penolakan:</span>{" "}
                        {item.alasan_penolakan}
                      </div>
                    ) : null}
                  </div>

                  <div className="border-t border-slate-100 px-5 py-4">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setRecentPdfMessage("");
                          setSelectedPengajuan(item);
                        }}
                        className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-[var(--color-primary)] px-4 py-2.5 text-xs font-semibold text-white transition hover:opacity-90"
                      >
                        Lihat Detail
                      </button>

                      {isDownloadReady(item.status) ? (
                        <button
                          type="button"
                          onClick={() => handleDownload(item)}
                          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                        >
                          Download Surat
                        </button>
                      ) : null}

                      {!isAdmin && item.status.toLowerCase() === "ditolak" ? (
                        <button
                          type="button"
                          onClick={() => handleReapply(item)}
                          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
                        >
                          Ajukan Ulang
                        </button>
                      ) : null}

                      {isAdmin ? (
                        <>
                          {updateStatusOptions.map((statusOption) => {
                            const isUpdating =
                              itemUpdatingStatus === statusOption.value;
                            const isDisabled = Boolean(itemUpdatingStatus);
                            const isActive =
                              item.status.toLowerCase() === statusOption.value;

                            return (
                              <button
                                key={statusOption.value}
                                type="button"
                                onClick={() => {
                                  if (statusOption.value === "ditolak") {
                                    startRejectFlow(item);
                                    return;
                                  }

                                  void handleStatusUpdate(
                                    item,
                                    statusOption.value,
                                  );
                                }}
                                disabled={isDisabled}
                                className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full px-3.5 py-2.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                  isActive
                                    ? getStatusClassName(statusOption.value)
                                    : "border border-slate-200 bg-white text-slate-600 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                                }`}
                              >
                                {isUpdating ? (
                                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                ) : null}
                                {isUpdating
                                  ? "Menyimpan..."
                                  : statusOption.label}
                              </button>
                            );
                          })}

                          <button
                            type="button"
                            onClick={() => handleDeletePengajuan(item)}
                            className="ml-auto inline-flex min-h-10 items-center justify-center rounded-full border border-red-200 px-3.5 py-2.5 text-xs font-semibold text-red-500 transition hover:bg-red-50"
                          >
                            Hapus
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-slate-400">
                          Informasi ini hanya ditampilkan untuk akun Anda.
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </section>

      {activeSelectedPengajuan ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-4 backdrop-blur-sm sm:items-center"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeSelectedPengajuan();
            }
          }}
        >
          <div className="w-full max-w-xl rounded-[1.8rem] border border-white/80 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
              <div>
                <span className="inline-flex rounded-full bg-[var(--color-primary-soft)] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">
                  Detail Pengajuan
                </span>
                <h2 className="mt-2 text-xl font-extrabold tracking-tight text-slate-950">
                  {activeSelectedPengajuan.jenis_surat}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeSelectedPengajuan}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Tutup detail pengajuan"
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

            <div className="max-h-[75vh] overflow-y-auto p-5 sm:p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { label: "Nama", value: activeSelectedPengajuan.nama },
                  { label: "NIK", value: activeSelectedPengajuan.nik },
                  {
                    label: "Tanggal Pengajuan",
                    value: formatTanggal(activeSelectedPengajuan.created_at),
                  },
                ].map((field) => (
                  <div
                    key={field.label}
                    className="rounded-xl bg-slate-50 p-3.5"
                  >
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      {field.label}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {field.value}
                    </p>
                  </div>
                ))}

                <div className="rounded-xl bg-slate-50 p-3.5">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Status
                  </p>
                  <div className="mt-1.5">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getStatusClassName(
                        activeSelectedPengajuan.status,
                      )}`}
                    >
                      {getStatusLabel(activeSelectedPengajuan.status)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 rounded-xl bg-slate-50 p-3.5">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Alamat
                </p>
                <p className="mt-1 text-sm leading-relaxed text-slate-700">
                  {activeSelectedPengajuan.alamat}
                </p>
              </div>

              {activeSelectedPengajuan.alasan_penolakan ? (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3.5">
                  <p className="text-xs font-bold uppercase tracking-wider text-red-500">
                    Catatan Perbaikan
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-red-700">
                    {activeSelectedPengajuan.alasan_penolakan}
                  </p>
                </div>
              ) : null}

              {isAdmin ? (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Rancangan Surat
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Format surat ini akan dipakai saat layanan dinyatakan selesai.
                      </p>
                    </div>
                    {recentPdfMessage ? (
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                        Siap diunduh
                      </span>
                    ) : null}
                  </div>

                  <LetterTemplatePreview
                    jenisSurat={activeSelectedPengajuan.jenis_surat}
                    nomorSurat={
                      prepareSubmissionPdf(activeSelectedPengajuan).nomorSurat
                    }
                  />

                  {recentPdfMessage ? (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                      {recentPdfMessage}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              {isDownloadReady(activeSelectedPengajuan.status) ? (
                <button
                  type="button"
                  onClick={() => handleDownload(activeSelectedPengajuan)}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 px-5 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                >
                  Download Surat
                </button>
              ) : null}

              {!isAdmin &&
              activeSelectedPengajuan.status.toLowerCase() === "ditolak" ? (
                <button
                  type="button"
                  onClick={() => handleReapply(activeSelectedPengajuan)}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-amber-200 bg-amber-50 px-5 py-2.5 text-sm font-semibold text-amber-700 hover:bg-amber-100"
                >
                  Ajukan Ulang
                </button>
              ) : null}

              <button
                type="button"
                onClick={closeSelectedPengajuan}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {rejectTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-4 backdrop-blur-sm sm:items-center"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setRejectTarget(null);
            }
          }}
        >
          <div className="w-full max-w-lg rounded-[1.8rem] border border-white/80 bg-white shadow-2xl">
            <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
              <h2 className="text-lg font-bold text-slate-900">
                Kembalikan untuk Diperbaiki
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Isi catatan perbaikan untuk {rejectTarget.nama} sebelum status
                diubah menjadi ditolak.
              </p>
            </div>

            <div className="p-5 sm:p-6">
              <label
                htmlFor="rejectReason"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Catatan Perbaikan
              </label>
              <textarea
                id="rejectReason"
                rows={4}
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none transition focus:border-[var(--color-primary)] focus:bg-white"
                placeholder="Tulis catatan yang membantu warga memperbaiki pengajuannya."
              />
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => void confirmReject()}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
              >
                Simpan Penolakan
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
