"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import { ToastContainer } from "@/components/Toast";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { upsertCurrentUserProfile } from "@/lib/authProfile";
import { NIK_LENGTH, sanitizeNikValue } from "@/lib/nik";
import {
  createAuthDebugPayload,
  formatSupabaseError,
  normalizeAuthError,
  logAuthError,
} from "@/lib/supabaseAuthErrors";

const loginSchema = z.object({
  email: z.email("Email tidak valid.").trim(),
  password: z.string().min(1, "Password wajib diisi."),
});

const registerSchema = z
  .object({
    alamat: z.string().trim().min(5, "Alamat minimal 5 karakter."),
    confirmPassword: z.string().min(1, "Konfirmasi password wajib diisi."),
    email: z.email("Email tidak valid.").trim(),
    fullName: z
      .string()
      .trim()
      .min(3, "Nama lengkap minimal 3 karakter."),
    nik: z
      .string()
      .trim()
      .regex(/^\d{16}$/, "NIK harus terdiri dari 16 digit."),
    password: z
      .string()
      .min(8, "Password minimal 8 karakter.")
      .regex(/[A-Za-z]/, "Password harus mengandung huruf.")
      .regex(/\d/, "Password harus mengandung angka."),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Konfirmasi password tidak cocok.",
    path: ["confirmPassword"],
  });

type FormMode = "login" | "register";
type FormState = {
  alamat: string;
  confirmPassword: string;
  email: string;
  fullName: string;
  nik: string;
  password: string;
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

const initialFormState: FormState = {
  alamat: "",
  confirmPassword: "",
  email: "",
  fullName: "",
  nik: "",
  password: "",
};

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading, refreshProfile, supabase, user } =
    useAuth();
  const [mode, setMode] = useState<FormMode>(() =>
    searchParams.get("mode") === "register" ? "register" : "login",
  );
  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [errorMessage, setErrorMessage] = useState("");
  const [errorHelperText, setErrorHelperText] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toasts, showToast, dismiss } = useToast();

  const redirectPath = searchParams.get("redirect") || "/status";

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      router.replace(redirectPath);
    }
  }, [isAuthenticated, isLoading, redirectPath, router, user]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    const nextValue =
      key === "nik"
        ? (sanitizeNikValue(String(value)) as FormState[K])
        : value;

    setFormData((current) => ({
      ...current,
      [key]: nextValue,
    }));
  }

  function resetMessages() {
    setErrorMessage("");
    setErrorHelperText("");
    setSuccessMessage("");
  }

  function resetFieldErrors() {
    setFieldErrors({});
  }

  function switchMode(nextMode: FormMode) {
    setMode(nextMode);
    resetMessages();
    resetFieldErrors();
  }

  function validateCurrentMode() {
    const parsed =
      mode === "login"
        ? loginSchema.safeParse({
            email: formData.email,
            password: formData.password,
          })
        : registerSchema.safeParse(formData);

    if (parsed.success) {
      setFieldErrors({});
      return true;
    }

    const nextErrors: FieldErrors = {};
    const flattened = parsed.error.flatten().fieldErrors;

    for (const [key, value] of Object.entries(flattened)) {
      if (Array.isArray(value) && value[0]) {
        nextErrors[key as keyof FormState] = value[0];
      }
    }

    setFieldErrors(nextErrors);
    return false;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessages();

    if (!validateCurrentMode()) {
      const message = "Periksa kembali data yang masih belum valid.";
      setErrorMessage(message);
      showToast("warning", "Form belum valid", message);
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === "login") {
        const response = await supabase.auth.signInWithPassword({
          email: formData.email.trim(),
          password: formData.password,
        });
        const { error } = response;

        if (error) {
          throw error;
        }

        await refreshProfile();
        document.cookie =
          "isLoggedIn=true; path=/; max-age=604800; samesite=lax";
        router.replace(redirectPath);
        router.refresh();
        return;
      }

      const response = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          data: {
            alamat: formData.alamat.trim(),
            full_name: formData.fullName.trim(),
            nik: formData.nik.trim(),
          },
        },
      });
      const { data, error } = response;

      if (error) {
        logAuthError("signUp failed", error, response);
        throw error;
      }

      if (!data.user) {
        throw new Error("Pendaftaran belum dapat diselesaikan. Silakan coba beberapa saat lagi.");
      }

      if (data.session) {
        try {
          await upsertCurrentUserProfile(data.user, {
            alamat: formData.alamat.trim(),
            email: formData.email.trim(),
            full_name: formData.fullName.trim(),
            nik: formData.nik.trim(),
            role: "user",
          });
        } catch (profileError) {
          const profileMessage = formatSupabaseError(profileError);
          showToast("warning", "Profil belum tersimpan", profileMessage);
        }

        await refreshProfile();
        document.cookie =
          "isLoggedIn=true; path=/; max-age=604800; samesite=lax";
        showToast("success", "Pendaftaran berhasil", "Akun dan data warga berhasil dibuat.");
        router.replace(redirectPath === "/status" ? "/ajukan-surat" : redirectPath);
        router.refresh();
        return;
      }

      const confirmationMessage =
        "Akun berhasil dibuat. Jika verifikasi email diaktifkan, silakan cek email Anda terlebih dahulu sebelum masuk.";
      if (process.env.NODE_ENV !== "production") {
        console.info("Signup succeeded without session", {
          emailConfirmedAt: data.user.email_confirmed_at,
          identities: data.user.identities?.length ?? 0,
          userId: data.user.id,
        });
      }
      setSuccessMessage(confirmationMessage);
      showToast("success", "Pendaftaran berhasil", confirmationMessage);
      setMode("login");
      setFormData((current) => ({
        ...initialFormState,
        email: current.email,
      }));
      setFieldErrors({});
    } catch (error) {
      if (mode === "login") {
        if (process.env.NODE_ENV !== "production") {
          console.log(
            "LOGIN ERROR:",
            JSON.stringify(
              createAuthDebugPayload("handleSubmit login failed", error, {
                redirectPath,
                responseMode: mode,
              }),
              null,
              2,
            ),
          );
        }
      } else {
        logAuthError("handleSubmit auth failed", error, {
          mode,
          redirectPath,
        });
      }
      const normalizedError =
        mode === "login"
          ? normalizeAuthError(error)
          : {
              helperText: "",
              message: "Autentikasi belum dapat diproses. Silakan coba kembali.",
            };
      setErrorMessage(normalizedError.message);
      setErrorHelperText(normalizedError.helperText);
      showToast("error", "Belum berhasil masuk", normalizedError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function getInputClassName(hasError: boolean) {
    return `w-full rounded-2xl bg-slate-50 px-4 py-3.5 text-slate-900 outline-none transition focus:bg-white ${
      hasError
        ? "border border-red-300 focus:border-red-500"
        : "border border-slate-200 focus:border-[var(--color-primary)]"
    }`;
  }

  return (
    <section className="flex flex-1 items-center justify-center">
      <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2.5rem] border border-white/80 bg-[linear-gradient(145deg,rgba(45,129,193,0.12),rgba(255,255,255,0.92)_55%,rgba(255,138,61,0.1))] p-8 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-10">
          <span className="inline-flex rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-[var(--color-primary)]">
            Akun WargaKu
          </span>
          <h1 className="mt-5 max-w-xl text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">
            Akses akun warga dan pengurus yang aman dalam satu aplikasi layanan.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
            Warga dapat melihat pengajuan miliknya sendiri, menerima pemberitahuan,
            mengunduh surat yang selesai, dan mengajukan ulang jika diperlukan.
            Pengurus mengelola seluruh proses layanan dari panel yang sama.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              "Akses akun warga dan pengurus yang aman",
              "Hak akses warga dan pengurus terkelola dengan baik",
              "Riwayat pengajuan tersimpan rapi dan pribadi",
              "Pemberitahuan otomatis dan unduhan surat PDF",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/80 bg-white/70 p-4 text-sm font-medium text-slate-600 backdrop-blur-sm"
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="w-full rounded-[2.25rem] border border-white/80 bg-white/95 p-8 shadow-[0_22px_60px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:p-10">
          <div className="flex rounded-full bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={`flex-1 rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                mode === "login"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500"
              }`}
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => switchMode("register")}
              className={`flex-1 rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                mode === "register"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500"
              }`}
            >
              Daftar
            </button>
          </div>

          <div className="mt-6">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-950">
              {mode === "login" ? "Masuk ke akun Anda" : "Buat akun warga"}
            </h2>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              {mode === "login"
                ? "Gunakan email dan kata sandi Anda untuk melanjutkan."
                : "Daftarkan akun warga untuk mulai mengajukan surat dan memantau proses layanan."}
            </p>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            {mode === "register" ? (
              <>
                <div>
                  <label
                    htmlFor="fullName"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Nama Lengkap
                  </label>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    value={formData.fullName}
                    onChange={(event) =>
                      updateField("fullName", event.target.value)
                    }
                    className={getInputClassName(Boolean(fieldErrors.fullName))}
                    placeholder="Masukkan nama lengkap"
                  />
                  {fieldErrors.fullName ? (
                    <p className="mt-2 text-xs font-medium text-red-600">
                      {fieldErrors.fullName}
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
                    onChange={(event) => updateField("nik", event.target.value)}
                    className={getInputClassName(Boolean(fieldErrors.nik))}
                    placeholder="16 digit NIK"
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
                    rows={3}
                    value={formData.alamat}
                    onChange={(event) => updateField("alamat", event.target.value)}
                    className={getInputClassName(Boolean(fieldErrors.alamat))}
                    placeholder="Masukkan alamat lengkap"
                  />
                  {fieldErrors.alamat ? (
                    <p className="mt-2 text-xs font-medium text-red-600">
                      {fieldErrors.alamat}
                    </p>
                  ) : null}
                </div>
              </>
            ) : null}

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Email
              </label>
              <input
                id={mode === "login" ? "email" : "loginEmailMirror"}
                name="email"
                type="email"
                value={formData.email}
                onChange={(event) => updateField("email", event.target.value)}
                className={getInputClassName(Boolean(fieldErrors.email))}
                placeholder="nama@email.com"
              />
              {mode === "login" && fieldErrors.email ? (
                <p className="mt-2 text-xs font-medium text-red-600">
                  {fieldErrors.email}
                </p>
              ) : null}
            </div>

            <div className={mode === "register" ? "grid gap-5 sm:grid-cols-2" : ""}>
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={(event) =>
                    updateField("password", event.target.value)
                  }
                  className={getInputClassName(Boolean(fieldErrors.password))}
                  placeholder="Masukkan password"
                />
                {fieldErrors.password ? (
                  <p className="mt-2 text-xs font-medium text-red-600">
                    {fieldErrors.password}
                  </p>
                ) : null}
              </div>

              {mode === "register" ? (
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Konfirmasi Password
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(event) =>
                      updateField("confirmPassword", event.target.value)
                    }
                    className={getInputClassName(
                      Boolean(fieldErrors.confirmPassword),
                    )}
                    placeholder="Ulangi password"
                  />
                  {fieldErrors.confirmPassword ? (
                    <p className="mt-2 text-xs font-medium text-red-600">
                      {fieldErrors.confirmPassword}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>

            {errorMessage ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                <p>{errorMessage}</p>
                {errorHelperText ? (
                  <p className="mt-1 text-xs font-medium text-red-500">
                    {errorHelperText}
                  </p>
                ) : null}
              </div>
            ) : null}

            {successMessage ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {successMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-full bg-[var(--color-accent)] px-6 py-3.5 text-sm font-bold text-white shadow-[0_16px_35px_rgba(255,138,61,0.28)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting
                ? "Memproses..."
                : mode === "login"
                  ? "Masuk"
                  : "Daftarkan Akun"}
            </button>
          </form>
        </div>
      </div>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </section>
  );
}
