type ErrorLike = {
  code?: string;
  details?: string;
  hint?: string;
  message?: string;
  name?: string;
  status?: number;
  cause?: unknown;
};

export type AuthErrorDebugInfo = {
  cause?: unknown;
  code: string | null;
  details: string | null;
  hint: string | null;
  message: string;
  name: string | null;
  raw: unknown;
  status: number | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toSerializableObject(value: unknown): unknown {
  if (!isRecord(value)) {
    return value;
  }

  const serialized: Record<string, unknown> = {};

  for (const key of Object.getOwnPropertyNames(value)) {
    serialized[key] = toSerializableObject(
      (value as Record<string, unknown>)[key],
    );
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    if (!(key in serialized)) {
      serialized[key] = toSerializableObject(nestedValue);
    }
  }

  return serialized;
}

export function getAuthErrorDebugInfo(error: unknown): AuthErrorDebugInfo {
  if (!isRecord(error)) {
    return {
      code: null,
      details: null,
      hint: null,
      message:
        typeof error === "string" && error.trim().length > 0
          ? error
          : "Unknown auth error",
      name: null,
      raw: error,
      status: null,
    };
  }

  const typedError = error as ErrorLike;

  return {
    cause: typedError.cause,
    code: typedError.code ?? null,
    details: typedError.details ?? null,
    hint: typedError.hint ?? null,
    message: typedError.message ?? "Unknown auth error",
    name: typedError.name ?? null,
    raw: toSerializableObject(error),
    status:
      typeof typedError.status === "number" ? typedError.status : null,
  };
}

export function createAuthDebugPayload(
  label: string,
  error: unknown,
  response?: unknown,
) {
  const info = getAuthErrorDebugInfo(error);

  return {
    code: info.code,
    error: info,
    label,
    message: info.message,
    response: response ? toSerializableObject(response) : null,
    status: info.status,
  };
}

export function logAuthError(
  label: string,
  error: unknown,
  response?: unknown,
) {
  console.error(
    "AUTH ERROR:",
    JSON.stringify(createAuthDebugPayload(label, error, response), null, 2),
  );
}

export function logAuthWarning(
  label: string,
  error: unknown,
  response?: unknown,
) {
  console.warn(
    "AUTH WARNING:",
    JSON.stringify(createAuthDebugPayload(label, error, response), null, 2),
  );
}

export function getAuthErrorUiDetails(error: unknown) {
  const info = getAuthErrorDebugInfo(error);

  return JSON.stringify(
    {
      code: info.code,
      details: info.details,
      hint: info.hint,
      message: info.message,
      name: info.name,
      raw: info.raw,
      status: info.status,
    },
    null,
    2,
  );
}

function getJoinedErrorText(error: unknown) {
  const info = getAuthErrorDebugInfo(error);

  return [info.message, info.details, info.hint, info.code]
    .filter((value): value is string => Boolean(value))
    .join(" ");
}

export function isSupabaseFetchError(error: unknown) {
  return /failed to fetch/i.test(getJoinedErrorText(error));
}

export function isProfilesForeignKeyError(error: unknown) {
  const info = getAuthErrorDebugInfo(error);
  const haystack = getJoinedErrorText(error);

  return (
    info.code === "23503" &&
    /profiles_id_fkey|table "users"|table 'users'|auth\.users|foreign key/i.test(
      haystack,
    )
  );
}

export function isInvalidRefreshTokenError(error: unknown) {
  const info = getAuthErrorDebugInfo(error);
  const haystack = getJoinedErrorText(error);

  return (
    info.name === "AuthApiError" &&
    /invalid refresh token|refresh token not found/i.test(haystack)
  );
}

export function isInvalidCredentialsError(error: unknown) {
  const info = getAuthErrorDebugInfo(error);
  return info.code === "invalid_credentials";
}

export function isEmailNotConfirmedError(error: unknown) {
  const info = getAuthErrorDebugInfo(error);
  const haystack = getJoinedErrorText(error);

  return (
    info.code === "email_not_confirmed" ||
    /email not confirmed|email belum diverifikasi/i.test(haystack)
  );
}

export function isRowLevelSecurityError(error: unknown) {
  const info = getAuthErrorDebugInfo(error);
  const haystack = getJoinedErrorText(error);

  return (
    info.code === "42501" ||
    /row-level security policy|violates row-level security/i.test(haystack)
  );
}

export function getSupabaseActionableMessage(error: unknown) {
  if (isProfilesForeignKeyError(error)) {
    return 'Tabel "profiles" di Supabase masih memakai foreign key yang salah. Ubah constraint `profiles.id` agar mereferensikan `auth.users(id)`, bukan tabel `users` lain.';
  }

  if (isSupabaseFetchError(error)) {
    return "Koneksi ke Supabase gagal dijangkau dari browser. Periksa NEXT_PUBLIC_SUPABASE_URL, koneksi internet, project Supabase, dan apakah endpoint diblokir browser/network.";
  }

  if (isRowLevelSecurityError(error)) {
    return "Aksi ditolak oleh policy Supabase untuk tabel terkait. Periksa RLS policy agar operasi ini diizinkan untuk role pengguna yang benar.";
  }

  return null;
}

export function normalizeAuthError(error: unknown) {
  if (isInvalidCredentialsError(error)) {
    return {
      helperText: "Periksa kembali email dan password Anda.",
      message: "Email atau password salah.",
    };
  }

  if (isEmailNotConfirmedError(error)) {
    return {
      helperText: "Silakan verifikasi email Anda sebelum masuk.",
      message: "Email belum diverifikasi.",
    };
  }

  if (isSupabaseFetchError(error)) {
    return {
      helperText: "Periksa koneksi internet Anda lalu coba lagi.",
      message: "Koneksi bermasalah.",
    };
  }

  return {
    helperText: "",
    message: "Masuk belum dapat diproses. Silakan coba kembali.",
  };
}

export function formatSupabaseError(error: unknown) {
  const fallback = "Terjadi kesalahan saat memproses autentikasi.";
  const info = getAuthErrorDebugInfo(error);
  const baseMessage =
    getSupabaseActionableMessage(error) ?? info.message ?? fallback;

  if (process.env.NODE_ENV === "production") {
    return baseMessage;
  }

  const extraParts = [
    info.name ? `name=${info.name}` : null,
    info.code ? `code=${info.code}` : null,
    typeof info.status === "number" ? `status=${info.status}` : null,
    info.details ? `details=${info.details}` : null,
    info.hint ? `hint=${info.hint}` : null,
  ].filter(Boolean);

  if (extraParts.length === 0) {
    return baseMessage;
  }

  return `${baseMessage} (${extraParts.join(", ")})`;
}
