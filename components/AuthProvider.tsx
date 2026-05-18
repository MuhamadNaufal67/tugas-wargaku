"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import {
  getSupabaseClient,
  type AppRole,
  type ProfileRow,
} from "@/lib/supabaseClient";
import {
  buildFallbackProfileRow,
  upsertCurrentUserProfile,
} from "@/lib/authProfile";
import {
  getSupabaseActionableMessage,
  isInvalidRefreshTokenError,
  isProfilesForeignKeyError,
  isSupabaseFetchError,
  logAuthError,
  logAuthWarning,
} from "@/lib/supabaseAuthErrors";

type AuthContextValue = {
  isAdmin: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  profile: ProfileRow | null;
  role: AppRole | null;
  session: Session | null;
  signOut: () => Promise<void>;
  supabase: ReturnType<typeof getSupabaseClient>;
  user: User | null;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function writeAuthCookies(isAuthenticated: boolean, role?: AppRole | null) {
  if (!isAuthenticated) {
    document.cookie = "isLoggedIn=; path=/; max-age=0; samesite=lax";
    document.cookie = "userRole=; path=/; max-age=0; samesite=lax";
    return;
  }

  document.cookie = "isLoggedIn=true; path=/; max-age=604800; samesite=lax";
  document.cookie = `userRole=${role ?? "user"}; path=/; max-age=604800; samesite=lax`;
}

function clearPersistedSupabaseSession() {
  if (typeof window === "undefined") {
    return;
  }

  const matchingStorageKey = /^sb-.*-auth-token$/i;

  for (const storage of [window.localStorage, window.sessionStorage]) {
    const keysToRemove: string[] = [];

    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);

      if (key && matchingStorageKey.test(key)) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      storage.removeItem(key);
    }
  }
}

async function ensureProfile(user: User, options?: { logErrors?: boolean }) {
  const supabase = getSupabaseClient();
  const shouldLogErrors = options?.logErrors ?? true;
  const response = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  const { data: existingProfile, error: selectError } = response;

  if (selectError) {
    if (shouldLogErrors) {
      logAuthError("profiles.select failed", selectError, response);
    }
    throw selectError;
  }

  if (existingProfile) {
    return existingProfile;
  }

  return upsertCurrentUserProfile(
    user,
    { role: "user" as AppRole },
    { logErrors: shouldLogErrors },
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = getSupabaseClient();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const activeSyncIdRef = useRef(0);
  const isCleaningSessionRef = useRef(false);
  const reportedAuthIssuesRef = useRef<Set<string>>(new Set());
  const userRef = useRef<User | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const reportAuthIssueOnce = useCallback((
    label: string,
    error: unknown,
    response?: unknown,
    severity: "error" | "warning" = "error",
  ) => {
    const message = getSupabaseActionableMessage(error) ?? "Unknown auth error";
    const key = `${label}:${message}`;

    if (reportedAuthIssuesRef.current.has(key)) {
      return;
    }

    reportedAuthIssuesRef.current.add(key);
    if (severity === "warning") {
      logAuthWarning(label, error, response);
      return;
    }

    logAuthError(label, error, response);
  }, []);

  const clearAuthState = useCallback(() => {
    setSession(null);
    setUser(null);
    setProfile(null);
    writeAuthCookies(false);
  }, []);

  const cleanupInvalidSession = useCallback(async (
    label: string,
    error: unknown,
    response?: unknown,
  ) => {
    reportAuthIssueOnce(label, error, response, "warning");
    clearAuthState();
    clearPersistedSupabaseSession();

    if (isCleaningSessionRef.current) {
      return;
    }

    isCleaningSessionRef.current = true;

    try {
      const signOutResponse = await supabase.auth.signOut({ scope: "local" });

      if (
        signOutResponse.error &&
        !isInvalidRefreshTokenError(signOutResponse.error)
      ) {
        reportAuthIssueOnce(
          "cleanupInvalidSession local signOut failed",
          signOutResponse.error,
          signOutResponse,
          "warning",
        );
      }
    } catch (signOutError) {
      if (!isInvalidRefreshTokenError(signOutError)) {
        reportAuthIssueOnce(
          "cleanupInvalidSession local signOut threw",
          signOutError,
          null,
          "warning",
        );
      }
    } finally {
      isCleaningSessionRef.current = false;
    }
  }, [clearAuthState, reportAuthIssueOnce, supabase]);

  const syncSession = useCallback(async (
    nextSession?: Session | null,
    options?: { showLoading?: boolean },
  ) => {
    const syncId = activeSyncIdRef.current + 1;
    activeSyncIdRef.current = syncId;
    const shouldShowLoading = options?.showLoading ?? true;
    const isStaleSync = () => syncId !== activeSyncIdRef.current;

    if (shouldShowLoading) {
      setIsLoading(true);
    }

    try {
      const sessionToUse =
        nextSession ?? (await supabase.auth.getSession()).data.session ?? null;
      const nextUser = sessionToUse?.user ?? null;

      if (isStaleSync()) {
        return;
      }

      setSession(sessionToUse);
      setUser(nextUser);

      if (!nextUser) {
        clearAuthState();
        return;
      }

      try {
        const nextProfile = await ensureProfile(nextUser, { logErrors: false });

        if (isStaleSync()) {
          return;
        }

        setProfile(nextProfile);
        writeAuthCookies(true, nextProfile.role);
      } catch (error) {
        if (isInvalidRefreshTokenError(error)) {
          await cleanupInvalidSession("profile bootstrap invalid refresh token", error, {
            sessionUserId: nextUser.id,
          });
          return;
        }

        if (isProfilesForeignKeyError(error) || isSupabaseFetchError(error)) {
          reportAuthIssueOnce("profile bootstrap fallback", error, {
            sessionUserId: nextUser.id,
          }, "warning");
          const fallbackProfile = buildFallbackProfileRow(nextUser, {
            role: "user",
          });

          if (isStaleSync()) {
            return;
          }

          setProfile(fallbackProfile);
          writeAuthCookies(true, fallbackProfile.role);
          return;
        }

        throw error;
      }
    } catch (error) {
      if (isInvalidRefreshTokenError(error)) {
        await cleanupInvalidSession("syncSession invalid refresh token", error, {
          hasIncomingSession: Boolean(nextSession),
        });
        return;
      }

      reportAuthIssueOnce("syncSession failed", error, {
        hasIncomingSession: Boolean(nextSession),
        incomingSessionUserId: nextSession?.user?.id ?? null,
        resolvedUserId: nextSession?.user?.id ?? userRef.current?.id ?? null,
      });

      if (isStaleSync()) {
        return;
      }

      setProfile(null);
      if (nextSession?.user ?? userRef.current) {
        writeAuthCookies(true);
      } else {
        writeAuthCookies(false);
      }
    } finally {
      if (!isStaleSync()) {
        setIsLoading(false);
      }
    }
  }, [clearAuthState, cleanupInvalidSession, reportAuthIssueOnce, supabase]);

  async function refreshProfile() {
    if (!user) {
      setProfile(null);
      return;
    }

    try {
      const data = await ensureProfile(user);
      setProfile(data);
      writeAuthCookies(true, data.role);
    } catch (error) {
      if (isInvalidRefreshTokenError(error)) {
        await cleanupInvalidSession("refreshProfile invalid refresh token", error, {
          userId: user.id,
        });
        return;
      }

      if (isProfilesForeignKeyError(error) || isSupabaseFetchError(error)) {
        reportAuthIssueOnce("refreshProfile fallback", error, {
          userId: user.id,
        }, "warning");
        const fallbackProfile = buildFallbackProfileRow(user, { role: "user" });
        setProfile(fallbackProfile);
        writeAuthCookies(true, fallbackProfile.role);
        return;
      }

      reportAuthIssueOnce("refreshProfile failed", error, {
        userId: user.id,
      });
    }
  }

  async function signOut() {
    clearAuthState();

    try {
      const response = await supabase.auth.signOut();

      if (response.error) {
        if (isInvalidRefreshTokenError(response.error)) {
          reportAuthIssueOnce("signOut invalid refresh token", response.error, response, "warning");
          return;
        }

        reportAuthIssueOnce("signOut failed", response.error, response);
      }
    } catch (error) {
      if (isInvalidRefreshTokenError(error)) {
        reportAuthIssueOnce("signOut invalid refresh token", error, null, "warning");
        return;
      }

      reportAuthIssueOnce("signOut threw", error);
    } finally {
      clearPersistedSupabaseSession();
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function initialize() {
      if (!isMounted) {
        return;
      }

      await syncSession(undefined, { showLoading: true });
    }

    void initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      const showLoading = event === "INITIAL_SESSION" || event === "SIGNED_IN";

      void syncSession(nextSession, { showLoading });
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, syncSession]);

  useEffect(() => {
    function handleUnhandledRejection(event: PromiseRejectionEvent) {
      if (!isInvalidRefreshTokenError(event.reason)) {
        return;
      }

      event.preventDefault();
      void cleanupInvalidSession("unhandled invalid refresh token", event.reason, {
        source: "window.unhandledrejection",
      });
    }

    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, [cleanupInvalidSession]);

  return (
    <AuthContext.Provider
      value={{
        isAdmin: profile?.role === "admin",
        isAuthenticated: Boolean(user),
        isLoading,
        profile,
        role: profile?.role ?? null,
        session,
        signOut,
        supabase,
        user,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider.");
  }

  return context;
}
