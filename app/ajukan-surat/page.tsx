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
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-10">
      <section>
        <header>
          <h1 className="page-title">
            {reapplySourceId ? "Ajukan ulang surat" : "Ajukan surat"}
          </h1>
          <p className="page-lead">
            Data diri sudah diisi dari akun Anda. Periksa kembali, pilih jenis
            surat, lalu kirim.
          </p>
        </header>

        {reapplySourceId ? (
          <div role="status" className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
            Data dari pengajuan yang ditolak sudah dimuat. Perbaiki bagian yang
            disebut dalam catatan pengurus sebelum mengirim ulang.
          </div>
        ) : null}

        <form
          className="mt-6 space-y-5 rounded-xl border border-[var(--color-line)] bg-white p-5 sm:p-7"
          onSubmit={handleSubmit}
          noValidate
        >
          <div>
            <label htmlFor="jenis_surat" className="label">
              Jenis surat
            </label>
            <select
              id="jenis_surat"
              name="jenis_surat"
              value={formData.jenis_surat}
              onChange={handleChange}
              className="input"
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
              <p className="field-error">{fieldErrors.jenis_surat}</p>
            ) : null}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="nama" className="label">
                Nama lengkap
              </label>
              <input
                id="nama"
                name="nama"
                type="text"
                autoComplete="name"
                value={formData.nama}
                onChange={handleChange}
                className="input"
                placeholder="Sesuai KTP"
                aria-invalid={Boolean(fieldErrors.nama)}
              />
              {fieldErrors.nama ? (
                <p className="field-error">{fieldErrors.nama}</p>
              ) : null}
            </div>

            <div>
              <label htmlFor="nik" className="label">
                NIK
              </label>
              <input
                id="nik"
                name="nik"
                type="text"
                value={formData.nik}
                onChange={handleChange}
                className="input tabular-nums"
                placeholder="16 digit angka"
                aria-invalid={Boolean(fieldErrors.nik)}
                maxLength={NIK_LENGTH}
                inputMode="numeric"
                pattern="[0-9]*"
              />
              {fieldErrors.nik ? (
                <p className="field-error">{fieldErrors.nik}</p>
              ) : (
                <p className="field-hint">
                  {formData.nik.length}/{NIK_LENGTH} digit
                </p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="alamat" className="label">
              Alamat
            </label>
            <textarea
              id="alamat"
              name="alamat"
              rows={3}
              autoComplete="street-address"
              value={formData.alamat}
              onChange={handleChange}
              className="input"
              placeholder="Nama jalan, nomor rumah, RT/RW"
              aria-invalid={Boolean(fieldErrors.alamat)}
            />
            {fieldErrors.alamat ? (
              <p className="field-error">{fieldErrors.alamat}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="dokumen" className="label">
              Dokumen pendukung <span className="font-normal text-slate-500">(opsional)</span>
            </label>
            <input
              ref={fileInputRef}
              id="dokumen"
              name="dokumen"
              type="file"
              onChange={handleFileChange}
              className="block w-full rounded-lg border border-dashed border-[var(--color-line)] bg-white p-2 text-sm text-slate-600 file:mr-3 file:min-h-9 file:rounded-md file:border-0 file:bg-[var(--color-primary-soft)] file:px-3 file:text-sm file:font-semibold file:text-[var(--color-primary)] hover:file:bg-[var(--brand-200)]"
            />
            <p className="field-hint">
              Hanya nama file yang dicatat. Siapkan dokumen aslinya jika
              pengurus memintanya.
            </p>
          </div>

          {errorMessage ? (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-3 border-t border-[var(--color-line)] pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={resetForm}
              disabled={isSubmitting}
              className="min-h-11 rounded-lg border border-[var(--color-line)] bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Atur ulang
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-11 rounded-lg bg-[var(--color-accent)] px-5 text-sm font-semibold text-white hover:bg-[var(--color-accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting
                ? "Mengirim…"
                : reapplySourceId
                  ? "Kirim ulang pengajuan"
                  : "Kirim pengajuan"}
            </button>
          </div>
        </form>
      </section>

      <aside className="space-y-4 text-sm leading-6 text-slate-600 lg:pt-24">
        <h2 className="text-sm font-bold text-slate-900">Setelah dikirim</h2>
        <ol className="space-y-3">
          <li>
            <span className="font-semibold text-slate-800">Menunggu.</span>{" "}
            Pengajuan masuk ke daftar pengurus RT.
          </li>
          <li>
            <span className="font-semibold text-slate-800">Diproses.</span>{" "}
            Pengurus sedang memeriksa data Anda.
          </li>
          <li>
            <span className="font-semibold text-slate-800">Selesai.</span>{" "}
            Surat PDF bisa diunduh dari halaman Status Pengajuan.
          </li>
        </ol>
        <p>
          Jika ada data yang kurang, pengajuan akan dikembalikan dengan catatan
          dan Anda bisa mengajukan ulang.
        </p>
      </aside>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
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
      <div aria-busy="true" aria-label="Memuat formulir" className="max-w-2xl animate-pulse space-y-4">
        <div className="h-8 w-48 rounded-md bg-slate-200" />
        <div className="h-4 w-80 max-w-full rounded bg-slate-200" />
        <div className="h-96 rounded-xl border border-[var(--color-line)] bg-white" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (isAdmin) {
    return (
      <section className="mx-auto max-w-lg py-10 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Formulir ini untuk akun warga
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Anda masuk sebagai pengurus. Untuk memeriksa dan memproses pengajuan
          warga, buka halaman Kelola Pengajuan.
        </p>
        <button
          type="button"
          onClick={() => router.push("/status")}
          className="mt-6 min-h-11 rounded-lg bg-[var(--color-primary)] px-5 text-sm font-semibold text-white hover:bg-[var(--color-primary-strong)]"
        >
          Buka Kelola Pengajuan
        </button>
      </section>
    );
  }

  return <AjukanSuratForm profile={profile} />;
}
