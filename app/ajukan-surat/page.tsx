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
import { PageHeader } from "@/components/ui/PageHeader";
import { Icon, type IconName } from "@/components/ui/Icon";
import { LetterIcon } from "@/components/ui/LetterIcon";
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

const letterHints: Record<string, string> = {
  "Surat Domisili": "Bukti tempat tinggal untuk administrasi kependudukan",
  "Surat Keterangan Tidak Mampu": "Untuk bantuan atau administrasi sosial",
  "Surat Keterangan Umum": "Untuk keperluan administrasi lainnya",
  "Surat Keterangan Usaha": "Untuk administrasi dan perizinan usaha",
  "Surat Pengantar": "Pengantar resmi RT untuk urusan ke instansi lain",
};

const afterSubmitSteps: { icon: IconName; text: string; tile: string; title: string }[] = [
  {
    icon: "clock",
    text: "Pengajuan masuk ke daftar pengurus RT.",
    tile: "bg-amber-50 text-amber-600",
    title: "Menunggu",
  },
  {
    icon: "search",
    text: "Pengurus memeriksa data Anda.",
    tile: "bg-blue-50 text-blue-600",
    title: "Diproses",
  },
  {
    icon: "download",
    text: "Surat PDF bisa diunduh dari halaman Status Pengajuan.",
    tile: "bg-emerald-50 text-emerald-600",
    title: "Selesai",
  },
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

  function renderStepTitle(step: number, title: string, hint?: string) {
    return (
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-sm font-bold text-white">
          {step}
        </span>
        <div>
          <h2 className="font-bold text-slate-900">{title}</h2>
          {hint ? <p className="text-sm text-slate-500">{hint}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon="file"
        title={reapplySourceId ? "Ajukan ulang surat" : "Ajukan surat"}
        lead="Pilih jenis surat, periksa data diri yang sudah terisi dari akun Anda, lalu kirim. Pengurus RT akan langsung menerimanya."
      />

      {reapplySourceId ? (
        <div role="status" className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          <Icon name="alert" className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          Data dari pengajuan yang ditolak sudah dimuat. Perbaiki bagian yang
          disebut dalam catatan pengurus sebelum mengirim ulang.
        </div>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <form
          className="space-y-5"
          onSubmit={handleSubmit}
          noValidate
        >
          <fieldset className="rounded-xl border border-[var(--color-line)] bg-white p-5 sm:p-6">
            <legend className="sr-only">Jenis surat</legend>
            {renderStepTitle(1, "Pilih jenis surat")}
            <div className="grid gap-3 sm:grid-cols-2">
              {jenisSuratOptions.map((option) => {
                const isSelected = formData.jenis_surat === option;

                return (
                  <label
                    key={option}
                    className={`relative flex cursor-pointer gap-3 rounded-xl border p-3.5 transition-colors has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-[var(--color-primary)]/30 ${
                      isSelected
                        ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]/60"
                        : "border-[var(--color-line)] hover:border-[var(--color-sky)] hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="jenis_surat"
                      value={option}
                      checked={isSelected}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <LetterIcon jenisSurat={option} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-900">{option}</span>
                      <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                        {letterHints[option] ?? "Keperluan administrasi warga"}
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                        isSelected
                          ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {isSelected ? <Icon name="check" className="h-3 w-3" strokeWidth={3.5} /> : null}
                    </span>
                  </label>
                );
              })}
            </div>
            {fieldErrors.jenis_surat ? (
              <p className="field-error">{fieldErrors.jenis_surat}</p>
            ) : null}
          </fieldset>

          <fieldset className="rounded-xl border border-[var(--color-line)] bg-white p-5 sm:p-6">
            <legend className="sr-only">Data diri</legend>
            {renderStepTitle(2, "Periksa data diri", "Harus sama dengan KTP agar surat tidak ditolak.")}
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
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
            </div>
          </fieldset>

          <fieldset className="rounded-xl border border-[var(--color-line)] bg-white p-5 sm:p-6">
            <legend className="sr-only">Dokumen pendukung</legend>
            {renderStepTitle(3, "Dokumen pendukung", "Opsional.")}
            <input
              ref={fileInputRef}
              id="dokumen"
              name="dokumen"
              type="file"
              onChange={handleFileChange}
              className="peer sr-only"
            />
            <label
              htmlFor="dokumen"
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--color-line)] px-4 py-6 text-center hover:border-[var(--color-sky)] hover:bg-slate-50 peer-focus-visible:ring-3 peer-focus-visible:ring-[var(--color-primary)]/30"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                <Icon name="upload" />
              </span>
              {formData.dokumen ? (
                <>
                  <span className="max-w-full truncate text-sm font-semibold text-slate-900">
                    {formData.dokumen}
                  </span>
                  <span className="text-xs text-slate-500">Ketuk untuk mengganti file</span>
                </>
              ) : (
                <>
                  <span className="text-sm font-semibold text-slate-900">Pilih file</span>
                  <span className="text-xs text-slate-500">Misalnya foto KTP atau KK</span>
                </>
              )}
            </label>
            <p className="field-hint">
              Hanya nama file yang dicatat. Siapkan dokumen aslinya jika
              pengurus memintanya.
            </p>
          </fieldset>

          {errorMessage ? (
            <div role="alert" className="flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <Icon name="alert" className="mt-0.5 h-5 w-5 shrink-0" />
              {errorMessage}
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={resetForm}
              disabled={isSubmitting}
              className="min-h-12 rounded-lg border border-[var(--color-line)] bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Atur ulang
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] px-6 text-sm font-semibold text-white hover:bg-[var(--color-accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Icon name="send" className="h-4 w-4" />
              {isSubmitting
                ? "Mengirim…"
                : reapplySourceId
                  ? "Kirim ulang pengajuan"
                  : "Kirim pengajuan"}
            </button>
          </div>
        </form>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className="rounded-xl border border-[var(--color-line)] bg-white p-5">
            <h2 className="font-bold text-slate-900">Setelah dikirim</h2>
            <ol className="mt-4">
              {afterSubmitSteps.map((item, index) => (
                <li key={item.title} className="relative flex gap-3 pb-5 last:pb-0">
                  {index < afterSubmitSteps.length - 1 ? (
                    <span aria-hidden="true" className="absolute bottom-0 left-4 top-9 w-px bg-[var(--color-line)]" />
                  ) : null}
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${item.tile}`}>
                    <Icon name={item.icon} className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    <p className="mt-0.5 text-sm leading-6 text-slate-500">{item.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="flex gap-3 rounded-xl bg-[var(--color-primary)] p-5 text-sm leading-6 text-white/90">
            <Icon name="bell" className="mt-0.5 h-5 w-5 shrink-0 text-white" />
            <p>
              Anda akan mendapat notifikasi setiap kali status berubah. Jika
              ada data yang kurang, pengajuan dikembalikan dengan catatan dan
              bisa diajukan ulang.
            </p>
          </div>
        </aside>
      </div>

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
