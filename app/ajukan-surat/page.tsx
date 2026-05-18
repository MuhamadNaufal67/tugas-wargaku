"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { ToastContainer } from "@/components/Toast";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { upsertCurrentUserProfile } from "@/lib/authProfile";
import { createNotification } from "@/lib/notifications";
import { NIK_LENGTH, getNikValidationMessage, sanitizeNikValue } from "@/lib/nik";
import {
  formatSupabaseError,
  getSupabaseActionableMessage,
  isProfilesForeignKeyError,
  isSupabaseFetchError,
  logAuthError,
  logAuthWarning,
} from "@/lib/supabaseAuthErrors";
import type { ProfileRow } from "@/lib/supabaseClient";

type FormState = {
  alamat: string;
  dokumen: string;
  jenis_surat: string;
  nama: string;
  nik: string;
};

type FormErrors = {
  alamat?: string;
  jenis_surat?: string;
  nama?: string;
  nik?: string;
};

type ReapplyDraft = {
  alamat: string;
  id: number;
  jenis_surat: string;
  nama: string;
  nik: string;
};

const jenisSuratOptions = [
  "Surat Pengantar",
  "Surat Domisili",
  "Surat Keterangan Usaha",
  "Surat Keterangan Tidak Mampu",
  "Surat Keterangan Umum",
];

function validateField(name: keyof FormErrors, value: string) {
  const trimmedValue = value.trim();

  if (name === "nama") {
    if (!trimmedValue) return "Nama wajib diisi.";
    if (!/^[A-Za-z\s]+$/.test(trimmedValue)) {
      return "Nama hanya boleh berisi huruf dan spasi.";
    }
    return "";
  }

  if (name === "nik") {
    return getNikValidationMessage(trimmedValue);
  }

  if (name === "alamat") {
    if (!trimmedValue) return "Alamat wajib diisi.";
    if (trimmedValue.length < 5) return "Alamat minimal 5 karakter.";
    return "";
  }

  if (name === "jenis_surat") {
    if (!trimmedValue) return "Jenis surat wajib dipilih.";
    return "";
  }

  return "";
}

function getInputClassName(hasError: boolean) {
  return `w-full rounded-2xl bg-slate-50 px-4 py-3.5 text-slate-900 outline-none transition focus:bg-white ${
    hasError
      ? "border border-red-300 focus:border-red-500"
      : "border border-slate-200 focus:border-[var(--color-primary)]"
  }`;
}

function readReapplyDraft() {
  if (typeof window === "undefined") {
    return null;
  }

  const searchParams = new URLSearchParams(window.location.search);
  if (!searchParams.get("reapply")) {
    return null;
  }

  const rawDraft = sessionStorage.getItem("wargaku-reapply-draft");
  if (!rawDraft) {
    return null;
  }

  try {
    const parsedDraft = JSON.parse(rawDraft) as ReapplyDraft;
    return parsedDraft;
  } catch (error) {
    console.error("Failed to parse reapply draft", error);
    return null;
  } finally {
    sessionStorage.removeItem("wargaku-reapply-draft");
  }
}

function createInitialFormState(profile: ProfileRow | null, reapplyDraft: ReapplyDraft | null): FormState {
  if (reapplyDraft) {
    return {
      alamat: reapplyDraft.alamat,
      dokumen: "",
      jenis_surat: reapplyDraft.jenis_surat,
      nama: reapplyDraft.nama,
      nik: reapplyDraft.nik,
    };
  }

  return {
    alamat: profile?.alamat || "",
    dokumen: "",
    jenis_surat: "",
    nama: profile?.full_name || "",
    nik: profile?.nik || "",
  };
}

function AjukanSuratForm({ profile }: { profile: ProfileRow | null }) {
  const router = useRouter();
  const { refreshProfile, supabase, user } = useAuth();
  const [reapplyDraft] = useState<ReapplyDraft | null>(() => readReapplyDraft());
  const [reapplySourceId, setReapplySourceId] = useState<number | null>(
    reapplyDraft?.id ?? null,
  );
  const [formData, setFormData] = useState<FormState>(() =>
    createInitialFormState(profile, reapplyDraft),
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toasts, showToast, dismiss } = useToast();

  function validateForm() {
    const nextErrors: FormErrors = {
      alamat: validateField("alamat", formData.alamat),
      jenis_surat: validateField("jenis_surat", formData.jenis_surat),
      nama: validateField("nama", formData.nama),
      nik: validateField("nik", formData.nik),
    };

    const normalizedErrors = Object.fromEntries(
      Object.entries(nextErrors).filter(([, value]) => value),
    ) as FormErrors;

    setFieldErrors(normalizedErrors);
    return Object.keys(normalizedErrors).length === 0;
  }

  function handleChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    const { name, value } = event.target;
    const nextValue =
      name === "nik" ? sanitizeNikValue(value) : value;

    setFormData((current) => ({
      ...current,
      [name]: nextValue,
    }));

    if (
      name === "nama" ||
      name === "nik" ||
      name === "alamat" ||
      name === "jenis_surat"
    ) {
      const error = validateField(name as keyof FormErrors, nextValue);
      setFieldErrors((current) => ({
        ...current,
        [name]: error || undefined,
      }));
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const fileName = event.target.files?.[0]?.name ?? "";

    setFormData((current) => ({
      ...current,
      dokumen: fileName,
    }));
  }

  function resetForm() {
    setFormData(createInitialFormState(profile, null));
    setErrorMessage("");
    setFieldErrors({});
    setReapplySourceId(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("reapply")) {
        router.replace("/ajukan-surat");
      }
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    if (!user) {
      router.replace("/login?redirect=/ajukan-surat");
      return;
    }

    if (!validateForm()) {
      const message = "Periksa kembali field yang masih belum valid.";
      setErrorMessage(message);
      showToast("warning", "Perlu diperiksa", message);
      return;
    }

    setIsSubmitting(true);

    try {
      try {
        await upsertCurrentUserProfile(user, {
          alamat: formData.alamat.trim(),
          email: user.email ?? profile?.email ?? null,
          full_name: formData.nama.trim(),
          nik: formData.nik.trim(),
          role: profile?.role ?? "user",
        });
      } catch (profileError) {
        logAuthWarning("ajukan-surat profile upsert skipped", profileError, {
          userId: user.id,
        });

        if (
          !isProfilesForeignKeyError(profileError) &&
          !isSupabaseFetchError(profileError)
        ) {
          throw profileError;
        }

        showToast(
          "warning",
          "Profil belum tersimpan",
          formatSupabaseError(profileError),
        );
      }

      const insertResponse = await supabase
        .from("pengajuan_surat")
        .insert([
          {
            alamat: formData.alamat.trim(),
            dokumen: formData.dokumen || null,
            file_surat: null,
            jenis_surat: formData.jenis_surat,
            nama: formData.nama.trim(),
            nik: formData.nik.trim(),
            parent_pengajuan_id: reapplySourceId,
            status: "pending",
            user_id: user.id,
          },
        ])
        .select("*")
        .single();
      const { data: insertedPengajuan, error: insertError } = insertResponse;

      if (insertError) {
        logAuthError("pengajuan_surat.insert failed", insertError, {
          jenis_surat: formData.jenis_surat,
          parent_pengajuan_id: reapplySourceId,
          user_id: user.id,
        });
        throw insertError;
      }

      try {
        await createNotification({
          message:
            reapplySourceId
              ? "Pengajuan ulang berhasil dikirim dan menunggu peninjauan pengurus."
              : "Pengajuan surat berhasil dikirim dan menunggu peninjauan pengurus.",
          metadata: {
            jenis_surat: formData.jenis_surat,
            pengajuan_id: insertedPengajuan.id,
            status: insertedPengajuan.status,
          },
          title: reapplySourceId ? "Ajukan ulang berhasil" : "Pengajuan berhasil",
          type: "submission",
          userId: user.id,
        });
      } catch (notificationError) {
        logAuthWarning("submission notification skipped", notificationError, {
          userId: user.id,
        });
        showToast(
          "warning",
          "Pengajuan tersimpan",
          `Pengajuan berhasil dikirim, tetapi pemberitahuan belum dapat disiapkan. ${formatSupabaseError(notificationError)}`,
        );
      }

      await refreshProfile();

      showToast(
        "success",
        "Berhasil",
        reapplySourceId
          ? "Pengajuan ulang berhasil dikirim."
          : "Pengajuan berhasil dikirim.",
      );
      resetForm();
    } catch (error) {
      const message =
        getSupabaseActionableMessage(error) ??
        (error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat mengirim pengajuan.");
      setErrorMessage(message);
      showToast("error", "Gagal", message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="flex flex-1 items-center justify-center">
      <div className="w-full max-w-3xl rounded-[2.5rem] border border-white/80 bg-white/95 p-8 shadow-[0_22px_60px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:p-10">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex rounded-full bg-[var(--color-primary-soft)] px-4 py-2 text-sm font-semibold text-[var(--color-primary)]">
            Form Pengajuan Surat
          </span>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">
            Ajukan surat secara digital dengan akun warga Anda.
          </h1>
          <p className="mt-4 text-base leading-8 text-slate-600 sm:text-lg">
            Data akun Anda membantu mempercepat pengisian formulir dan menjaga
            proses pengajuan tetap rapi, aman, dan mudah ditelusuri.
          </p>
        </div>

        {reapplySourceId ? (
          <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            Anda sedang mengajukan ulang surat yang sebelumnya ditolak. Data
            lama sudah dimuat otomatis, silakan periksa kembali sebelum kirim.
          </div>
        ) : null}

        <form className="mt-10 space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label
                htmlFor="nama"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Nama
              </label>
              <input
                id="nama"
                name="nama"
                type="text"
                value={formData.nama}
                onChange={handleChange}
                className={getInputClassName(Boolean(fieldErrors.nama))}
                placeholder="Masukkan nama lengkap"
                aria-invalid={Boolean(fieldErrors.nama)}
              />
              {fieldErrors.nama ? (
                <p className="mt-2 text-xs font-medium text-red-600">
                  {fieldErrors.nama}
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="nik"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                NIK
              </label>
              <input
                id="nik"
                name="nik"
                type="text"
                value={formData.nik}
                onChange={handleChange}
                className={getInputClassName(Boolean(fieldErrors.nik))}
                placeholder="Masukkan NIK"
                aria-invalid={Boolean(fieldErrors.nik)}
                maxLength={NIK_LENGTH}
                inputMode="numeric"
                pattern="[0-9]*"
              />
              {fieldErrors.nik ? (
                <p className="mt-2 text-xs font-medium text-red-600">
                  {fieldErrors.nik}
                </p>
              ) : formData.nik.length > 0 && formData.nik.length < NIK_LENGTH ? (
                <p className="mt-2 text-xs font-medium text-amber-600">
                  NIK harus terdiri dari {NIK_LENGTH} digit.
                </p>
              ) : null}
            </div>
          </div>

          <div>
            <label
              htmlFor="alamat"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Alamat
            </label>
            <textarea
              id="alamat"
              name="alamat"
              rows={4}
              value={formData.alamat}
              onChange={handleChange}
              className={getInputClassName(Boolean(fieldErrors.alamat))}
              placeholder="Masukkan alamat lengkap"
              aria-invalid={Boolean(fieldErrors.alamat)}
            />
            {fieldErrors.alamat ? (
              <p className="mt-2 text-xs font-medium text-red-600">
                {fieldErrors.alamat}
              </p>
            ) : null}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label
                htmlFor="jenis_surat"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Jenis Surat
              </label>
              <select
                id="jenis_surat"
                name="jenis_surat"
                value={formData.jenis_surat}
                onChange={handleChange}
                className={getInputClassName(Boolean(fieldErrors.jenis_surat))}
                aria-invalid={Boolean(fieldErrors.jenis_surat)}
              >
                <option value="">Pilih jenis surat</option>
                {jenisSuratOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {fieldErrors.jenis_surat ? (
                <p className="mt-2 text-xs font-medium text-red-600">
                  {fieldErrors.jenis_surat}
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="dokumen"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Dokumen Pendukung
              </label>
              <input
                ref={fileInputRef}
                id="dokumen"
                name="dokumen"
                type="file"
                onChange={handleFileChange}
                className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-[var(--color-primary-soft)] file:px-4 file:py-2 file:font-semibold file:text-[var(--color-primary)] hover:file:bg-[#d8ebfb]"
              />
              <p className="mt-2 text-xs text-slate-500">
                Lampiran membantu pengurus memeriksa kebutuhan pengajuan dengan lebih cepat.
              </p>
            </div>
          </div>

          {errorMessage ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {errorMessage}
            </div>
          ) : null}

          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-full bg-[var(--color-accent)] px-6 py-3.5 text-sm font-bold text-white shadow-[0_16px_35px_rgba(255,138,61,0.28)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting
                ? "Mengirim..."
                : reapplySourceId
                  ? "Kirim Ulang Pengajuan"
                  : "Kirim Pengajuan"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              disabled={isSubmitting}
              className="rounded-full border border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-slate-700 transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </section>
  );
}

export default function AjukanSuratPage() {
  const router = useRouter();
  const { isAdmin, isAuthenticated, isLoading, profile } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login?redirect=/ajukan-surat");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <section className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-3xl rounded-[2rem] border border-white/80 bg-white/95 p-6 shadow-sm sm:p-8">
          <div className="animate-pulse space-y-6">
            <div className="mx-auto h-5 w-32 rounded-full bg-slate-200" />
            <div className="mx-auto h-10 w-3/4 rounded-2xl bg-slate-200" />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="h-16 rounded-[1.4rem] bg-slate-100" />
              <div className="h-16 rounded-[1.4rem] bg-slate-100" />
            </div>
            <div className="h-36 rounded-[1.6rem] bg-slate-100" />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="h-16 rounded-[1.4rem] bg-slate-100" />
              <div className="h-16 rounded-[1.4rem] bg-slate-100" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (isAdmin) {
    return (
      <section className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-2xl rounded-[2rem] border border-amber-200 bg-white p-8 shadow-sm">
          <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-700">
            Akses Warga
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950">
            Halaman ini ditujukan untuk akun warga.
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Anda sedang masuk sebagai pengurus. Untuk meninjau atau memperbarui layanan warga, gunakan halaman status pengajuan.
          </p>
          <button
            type="button"
            onClick={() => router.push("/status")}
            className="mt-6 rounded-full bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-white"
          >
            Buka Status Pengajuan
          </button>
        </div>
      </section>
    );
  }

  return <AjukanSuratForm profile={profile} />;
}
