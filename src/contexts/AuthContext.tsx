import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { authApi, type AuthProfile } from "../api/auth";
import {
  API_UNAUTHORIZED_EVENT,
  ApiError,
  ApiNetworkError,
  ApiTimeoutError,
} from "../lib/api";

export interface AuthUser {
  id: string;
  email: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  initials?: string;
  role?: string | null;
  department?: string;
  phone?: string;
  created_at?: string;
}

interface AuthSession {
  user: AuthUser;
}

interface SignUpParams {
  email: string;
  firstName: string;
  lastName: string;
}

interface AuthContextType {
  user: AuthUser | null;
  profile: AuthUser | null;
  session: AuthSession | null;
  loading: boolean;
  isDemo: boolean;
  authError: string | null;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null }>;
  signUp: (params: SignUpParams) => Promise<{ error: string | null }>;
  activateAccount: (
    token: string,
    password: string,
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  confirmPasswordReset: (
    token: string,
    newPassword: string,
  ) => Promise<{ error: string | null }>;
  signInDemo: () => Promise<void>;
  exitDemo: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  session: null,
  loading: true,
  isDemo: false,
  authError: null,
  signIn: async () => ({ error: "Not implemented" }),
  signUp: async () => ({ error: "Not implemented" }),
  activateAccount: async () => ({ error: "Not implemented" }),
  signOut: async () => {},
  changePassword: async () => ({ error: "Not implemented" }),
  resetPassword: async () => ({ error: "Not implemented" }),
  confirmPasswordReset: async () => ({ error: "Not implemented" }),
  signInDemo: async () => {},
  exitDemo: () => {},
});

const DEMO_KEY = "pajes_demo_mode";
const USER_ROLE_KEY = "pajes_user_role";

const DEMO_USER: AuthUser = {
  id: "demo-user",
  email: "demo@pajes.com",
  full_name: "Utilisateur Démo",
  role: null,
  department: "Démo",
  created_at: new Date().toISOString(),
};

function toAuthUser(profile: AuthProfile): AuthUser {
  const [firstName = "", ...lastNameParts] = profile.full_name.trim().split(/\s+/);
  const lastName = lastNameParts.join(" ");
  return {
    id: profile.id,
    email: profile.email,
    full_name: profile.full_name,
    first_name: firstName,
    last_name: lastName,
    initials: `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase(),
    role: profile.role,
    department: profile.department ?? "",
    phone: profile.phone ?? "",
    created_at: profile.created_at ?? undefined,
  };
}

function sanitizeAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes("incorrect") ||
    lower.includes("invalid login credentials") ||
    lower.includes("invalid credentials") ||
    lower.includes("user not found") ||
    lower.includes("user not registered") ||
    lower.includes("email not confirmed")
  ) {
    return "Email ou mot de passe incorrect.";
  }
  return message;
}

const readDemoFlag = (): boolean => {
  try {
    return localStorage.getItem(DEMO_KEY) === "true";
  } catch {
    return false;
  }
};

function writeDemoFlag(value: boolean) {
  try {
    if (value) localStorage.setItem(DEMO_KEY, "true");
    else localStorage.removeItem(DEMO_KEY);
  } catch (error) {
    console.error("[AuthContext] Impossible de mettre à jour le mode démo.", error);
  }
}

function syncUserRoleToStorage(role: string | null | undefined) {
  try {
    if (role && role !== "null" && role !== "undefined") {
      localStorage.setItem(USER_ROLE_KEY, role);
    } else {
      localStorage.removeItem(USER_ROLE_KEY);
    }
  } catch (error) {
    console.error("[AuthContext] Impossible de synchroniser le rôle utilisateur.", error);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isDemo, setIsDemo] = useState<boolean>(readDemoFlag);
  const [user, setUser] = useState<AuthUser | null>(() =>
    readDemoFlag() ? DEMO_USER : null,
  );
  const [profile, setProfile] = useState<AuthUser | null>(() =>
    readDemoFlag() ? DEMO_USER : null,
  );
  const [session, setSession] = useState<AuthSession | null>(() =>
    readDemoFlag() ? { user: DEMO_USER } : null,
  );
  const [loading, setLoading] = useState(!readDemoFlag());
  const [authError, setAuthError] = useState<string | null>(null);

  const clearSession = useCallback(() => {
    setUser(null);
    setProfile(null);
    setSession(null);
    syncUserRoleToStorage(null);
  }, []);

  const acceptProfile = useCallback((response: AuthProfile) => {
    const authUser = toAuthUser(response);
    setUser(authUser);
    setProfile(authUser);
    setSession({ user: authUser });
    syncUserRoleToStorage(authUser.role);
  }, []);

  useEffect(() => {
    if (readDemoFlag()) {
      setIsDemo(true);
      setUser(DEMO_USER);
      setProfile(DEMO_USER);
      setSession({ user: DEMO_USER });
      syncUserRoleToStorage(null);
      setLoading(false);
      return;
    }

    let mounted = true;
    const handleUnauthorized = () => {
      if (!mounted) return;
      setIsDemo(false);
      clearSession();
      setAuthError("Votre session a expiré. Veuillez vous reconnecter.");
    };

    window.addEventListener(API_UNAUTHORIZED_EVENT, handleUnauthorized);
    void authApi
      .currentProfile()
      .then((response) => {
        if (mounted) {
          setAuthError(null);
          acceptProfile(response);
        }
      })
      .catch((error: unknown) => {
        if (!mounted) return;
        // 401 is a normal unauthenticated state, not an error to surface.
        if (error instanceof ApiError && error.status === 401) {
          clearSession();
          setAuthError(null);
          return;
        }
        if (error instanceof ApiError) {
          // Other HTTP statuses (403/422/429/500/503) are real backend
          // errors; surface their message but never as a network failure.
          setAuthError(error.message);
          clearSession();
          return;
        }
        // Only genuine transport/CORS failures reach here as ApiNetworkError.
        const message =
          error instanceof Error
            ? error.message
            : "Impossible de charger votre profil.";
        console.error("[AuthContext] Échec du chargement du profil.", error);
        setAuthError(message);
        clearSession();
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
      window.removeEventListener(API_UNAUTHORIZED_EVENT, handleUnauthorized);
    };
  }, [acceptProfile, clearSession]);

  const signIn = async (email: string, password: string) => {
    writeDemoFlag(false);
    setIsDemo(false);
    setAuthError(null);
    clearSession();

    try {
      acceptProfile(await authApi.login(email, password));
      return { error: null };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Une erreur est survenue.";
      return { error: sanitizeAuthError(message) };
    }
  };

  const signUp = async ({
    email,
    firstName,
    lastName,
  }: SignUpParams) => {
    writeDemoFlag(false);
    setIsDemo(false);
    setAuthError(null);
    clearSession();

    try {
      await authApi.signup({
        email,
        first_name: firstName,
        last_name: lastName,
      });
      return { error: null };
    } catch (error) {
      if (error instanceof ApiTimeoutError) {
        return { error: "auth.errors.signupTimeout" };
      }
      if (error instanceof ApiNetworkError) {
        return { error: "auth.errors.signupNetwork" };
      }
      if (error instanceof ApiError) {
        const errorKeys: Record<number, string> = {
          409: "auth.errors.signupDuplicate",
          422: "auth.errors.signupValidation",
          500: "auth.errors.signupFailed",
          503: "auth.errors.signupUnavailable",
        };
        return {
          error: errorKeys[error.status] ?? "auth.errors.signupFailed",
        };
      }
      return { error: "auth.errors.signupFailed" };
    }
  };

  const activateAccount = async (token: string, password: string) => {
    try {
      await authApi.activateAccount(token, password);
      return { error: null };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Une erreur est survenue.",
      };
    }
  };

  const signOut = async () => {
    const shouldRevokeSession = !isDemo && Boolean(user);
    writeDemoFlag(false);
    setIsDemo(false);
    setAuthError(null);
    clearSession();

    if (!shouldRevokeSession) return;
    try {
      await authApi.logout();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "La déconnexion a échoué.";
      console.error("[AuthContext] La révocation de session a échoué.", error);
      setAuthError(message);
    }
  };

  const changePassword = async (
    currentPassword: string,
    newPassword: string,
  ) => {
    try {
      await authApi.changePassword(currentPassword, newPassword);
      clearSession();
      return { error: null };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Une erreur est survenue.",
      };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await authApi.requestPasswordReset(email);
      return { error: null };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Une erreur est survenue.",
      };
    }
  };

  const confirmPasswordReset = async (token: string, newPassword: string) => {
    try {
      await authApi.confirmPasswordReset(token, newPassword);
      clearSession();
      return { error: null };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Une erreur est survenue.",
      };
    }
  };

  const signInDemo = async () => {
    writeDemoFlag(true);
    syncUserRoleToStorage(null);
    setAuthError(null);
    setIsDemo(true);
    setUser(DEMO_USER);
    setProfile(DEMO_USER);
    setSession({ user: DEMO_USER });
    setLoading(false);
  };

  const exitDemo = () => {
    writeDemoFlag(false);
    setIsDemo(false);
    setAuthError(null);
    clearSession();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        isDemo,
        authError,
        signIn,
        signUp,
        activateAccount,
        signOut,
        changePassword,
        resetPassword,
        confirmPasswordReset,
        signInDemo,
        exitDemo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
