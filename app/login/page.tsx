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

  function renderError(key: keyof FormState) {
    const message = fieldErrors[key];
    return message ? (
      <p id={`${key}-error`} className="field-error">
        {message}
      </p>
    ) : null;
  }

  return (
    <section className="flex flex-1 items-start justify-center sm:items-center">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {mode === "login" ? "Masuk ke WargaKu" : "Daftar akun warga"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {mode === "login"
              ? "Masuk untuk mengajukan surat dan melihat status pengajuan Anda."
              : "Data diri Anda akan dipakai untuk mengisi formulir surat secara otomatis."}
          </p>
        </div>

        <div className="rounded-xl border border-[var(--color-line)] bg-white p-5 sm:p-7">
          <div
            role="tablist"
            aria-label="Pilih masuk atau daftar"
            className="grid grid-cols-2 rounded-lg bg-slate-100 p-1"
          >
            {(["login", "register"] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={mode === value}
                onClick={() => switchMode(value)}
                className={`min-h-10 rounded-md text-sm font-semibold ${
                  mode === value
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {value === "login" ? "Masuk" : "Daftar"}
              </button>
            ))}
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
            {mode === "register" ? (
              <>
                <div>
                  <label htmlFor="fullName" className="label">
                    Nama lengkap
                  </label>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    value={formData.fullName}
                    onChange={(event) =>
                      updateField("fullName", event.target.value)
                    }
                    className="input"
                    aria-invalid={Boolean(fieldErrors.fullName)}
                    placeholder="Sesuai KTP"
                  />
                  {renderError("fullName")}
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
                    onChange={(event) => updateField("nik", event.target.value)}
                    className="input tabular-nums"
                    aria-invalid={Boolean(fieldErrors.nik)}
                    placeholder="16 digit angka"
                    maxLength={NIK_LENGTH}
                    inputMode="numeric"
                    pattern="[0-9]*"
                  />
                  {fieldErrors.nik ? (
                    renderError("nik")
                  ) : (
                    <p className="field-hint">
                      {formData.nik.length}/{NIK_LENGTH} digit
                    </p>
                  )}
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
                    onChange={(event) => updateField("alamat", event.target.value)}
                    className="input"
                    aria-invalid={Boolean(fieldErrors.alamat)}
                    placeholder="Nama jalan, nomor rumah, RT/RW"
                  />
                  {renderError("alamat")}
                </div>
              </>
            ) : null}

            <div>
              <label htmlFor="email" className="label">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={formData.email}
                onChange={(event) => updateField("email", event.target.value)}
                className="input"
                aria-invalid={Boolean(fieldErrors.email)}
                placeholder="nama@email.com"
              />
              {renderError("email")}
            </div>

            <div>
              <label htmlFor="password" className="label">
                Kata sandi
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={formData.password}
                onChange={(event) =>
                  updateField("password", event.target.value)
                }
                className="input"
                aria-invalid={Boolean(fieldErrors.password)}
              />
              {fieldErrors.password ? (
                renderError("password")
              ) : mode === "register" ? (
                <p className="field-hint">Minimal 8 karakter, berisi huruf dan angka.</p>
              ) : null}
            </div>

            {mode === "register" ? (
              <div>
                <label htmlFor="confirmPassword" className="label">
                  Ulangi kata sandi
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={(event) =>
                    updateField("confirmPassword", event.target.value)
                  }
                  className="input"
                  aria-invalid={Boolean(fieldErrors.confirmPassword)}
                />
                {renderError("confirmPassword")}
              </div>
            ) : null}

            {errorMessage ? (
              <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">
                <p>{errorMessage}</p>
                {errorHelperText ? (
                  <p className="mt-1 text-xs text-red-600">{errorHelperText}</p>
                ) : null}
              </div>
            ) : null}

            {successMessage ? (
              <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-800">
                {successMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-11 w-full rounded-lg bg-[var(--color-accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting
                ? mode === "login"
                  ? "Masuk…"
                  : "Mendaftarkan…"
                : mode === "login"
                  ? "Masuk"
                  : "Buat akun"}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-slate-600">
          {mode === "login" ? "Belum punya akun? " : "Sudah punya akun? "}
          <button
            type="button"
            onClick={() => switchMode(mode === "login" ? "register" : "login")}
            className="text-link"
          >
            {mode === "login" ? "Daftar di sini" : "Masuk di sini"}
          </button>
        </p>
      </div>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </section>
  );
}
