// src/contexts/AuthContext.tsx
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { supabase } from "../lib/supabase";

// ============================================================
// TYPES
// ============================================================
export interface AuthUser {
  id: string;
  email: string;
  full_name?: string;
  role?: string | null;
  department?: string;
  phone?: string;
  created_at?: string;
}

interface SignUpParams {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

interface AuthContextType {
  user: AuthUser | null;
  profile: any | null;
  session: any | null;
  loading: boolean;
  isDemo: boolean;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null }>;
  signUp: (params: SignUpParams) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  signInDemo: () => Promise<void>;
  exitDemo: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  session: null,
  loading: true,
  isDemo: false,
  signIn: async () => ({ error: "Not implemented" }),
  signUp: async () => ({ error: "Not implemented" }),
  signOut: async () => {},
  resetPassword: async () => ({ error: "Not implemented" }),
  signInDemo: async () => {},
  exitDemo: () => {},
});

// ============================================================
// STORAGE KEYS
// ============================================================
const DEMO_KEY = "pajes_demo_mode";
const USER_ROLE_KEY = "pajes_user_role";

// ============================================================
// DEMO USER (no role → view-only)
// ============================================================
const DEMO_USER: AuthUser = {
  id: "demo-user",
  email: "demo@pajes.com",
  full_name: "Utilisateur Démo",
  role: null,
  department: "Démo",
  created_at: new Date().toISOString(),
};

// ============================================================
// ERROR SANITIZATION — prevent email enumeration
// ============================================================
function sanitizeAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials") || lower.includes("invalid credentials")) {
    return "Email ou mot de passe incorrect.";
  }
  if (lower.includes("user not found") || lower.includes("user not registered")) {
    return "Email ou mot de passe incorrect.";
  }
  if (lower.includes("email not confirmed")) {
    return "Email ou mot de passe incorrect.";
  }
  return message;
}

// ============================================================
// STORAGE HELPERS
// ============================================================
const readDemoFlag = (): boolean => {
  try {
    return localStorage.getItem(DEMO_KEY) === "true";
  } catch {
    return false;
  }
};

const writeDemoFlag = (value: boolean) => {
  try {
    if (value) {
      localStorage.setItem(DEMO_KEY, "true");
    } else {
      localStorage.removeItem(DEMO_KEY);
    }
  } catch {}
};

// ⭐ Sync the user's role to localStorage so supabase.ts / WriteBlocker can detect it
function syncUserRoleToStorage(role: string | null | undefined) {
  try {
    if (role && role !== "null" && role !== "undefined") {
      localStorage.setItem(USER_ROLE_KEY, role);
    } else {
      localStorage.removeItem(USER_ROLE_KEY);
    }
  } catch {}
}

// ============================================================
// PROVIDER
// ============================================================
export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialize state from localStorage
  const [isDemo, setIsDemo] = useState<boolean>(readDemoFlag);
  const [user, setUser] = useState<AuthUser | null>(() =>
    readDemoFlag() ? DEMO_USER : null,
  );
  const [profile, setProfile] = useState<any | null>(() =>
    readDemoFlag() ? DEMO_USER : null,
  );
  const [session, setSession] = useState<any | null>(() =>
    readDemoFlag() ? { user: DEMO_USER } : null,
  );
  const [loading, setLoading] = useState(!readDemoFlag());

  // ============================================================
  // LOAD PROFILE FROM SUPABASE
  // ============================================================
  const loadProfile = useCallback(
    async (userId: string, email: string): Promise<AuthUser> => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();

        if (error) {
          console.error("[AuthContext] Erreur chargement profil:", error);
        }

        return {
          id: userId,
          email,
          full_name: data?.full_name ?? "",
          role: data?.role ?? null,
          department: data?.department ?? "",
          phone: data?.phone ?? "",
          created_at: data?.created_at,
        };
      } catch (err) {
        console.error("[AuthContext] Exception loadProfile:", err);
        return { id: userId, email, role: null };
      }
    },
    [],
  );

  // ============================================================
  // INIT (only runs if NOT in demo mode)
  // ============================================================
  useEffect(() => {
    // If we're in demo mode, skip all Supabase initialization
    if (readDemoFlag()) {
      console.log("[AuthContext] Demo mode active — skipping Supabase init");
      setIsDemo(true);
      setUser(DEMO_USER);
      setProfile(DEMO_USER);
      setSession({ user: DEMO_USER });
      syncUserRoleToStorage(null);
      setLoading(false);
      return;
    }

    let mounted = true;

    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession();

        if (!mounted) return;

        if (data?.session?.user) {
          setSession(data.session);
          const u = data.session.user;
          const authUser = await loadProfile(u.id, u.email ?? "");
          if (!mounted) return;
          setUser(authUser);
          setProfile(authUser);
          syncUserRoleToStorage(authUser.role); // ⭐ Sync role
        } else {
          setUser(null);
          setProfile(null);
          setSession(null);
          syncUserRoleToStorage(null); // ⭐ Clear role
        }
      } catch (err) {
        console.error("[AuthContext] init error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();

    // Auth listener
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, s) => {
      if (readDemoFlag()) return;
      if (!mounted) return;

      setSession(s);
      if (s?.user) {
        const authUser = await loadProfile(s.user.id, s.user.email ?? "");
        if (!mounted) return;
        setUser(authUser);
        setProfile(authUser);
        syncUserRoleToStorage(authUser.role); // ⭐ Sync role
      } else {
        setUser(null);
        setProfile(null);
        syncUserRoleToStorage(null); // ⭐ Clear role
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  // ============================================================
  // SIGN IN
  // ============================================================
  const signIn = async (email: string, password: string) => {
    writeDemoFlag(false);
    setIsDemo(false);
    syncUserRoleToStorage(null); // Reset role

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: sanitizeAuthError(error.message) };
    }

    if (data.user) {
      const authUser = await loadProfile(data.user.id, data.user.email ?? "");
      setUser(authUser);
      setProfile(authUser);
      setSession(data.session);
      syncUserRoleToStorage(authUser.role);
    }
    return { error: null };
  };

  // ============================================================
  // SIGN UP (no role → view-only)
  // ============================================================
  const signUp = async ({
    email,
    password,
    firstName,
    lastName,
  }: SignUpParams) => {
    writeDemoFlag(false);
    setIsDemo(false);
    syncUserRoleToStorage(null); // Reset role

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          full_name: `${firstName} ${lastName}`,
        },
      },
    });

    if (error) {
      return { error: sanitizeAuthError(error.message) };
    }

    if (data.user) {
      const fullName = `${firstName} ${lastName}`.trim();

      const { error: profileError } = await supabase.from("profiles").upsert({
        id: data.user.id,
        email: data.user.email,
        full_name: fullName,
        // role: intentionally omitted → null
      });

      if (profileError) {
        console.error("[AuthContext] Erreur création profil:", profileError);
      }

      const authUser: AuthUser = {
        id: data.user.id,
        email: data.user.email ?? "",
        full_name: fullName,
        role: null,
        created_at: new Date().toISOString(),
      };
      setUser(authUser);
      setProfile(authUser);
      syncUserRoleToStorage(null); // ⭐ No role
    }

    return { error: null };
  };

  // ============================================================
  // SIGN OUT
  // ============================================================
  const signOut = async () => {
    writeDemoFlag(false);
    setIsDemo(false);
    setUser(null);
    setProfile(null);
    setSession(null);
    syncUserRoleToStorage(null); // ⭐ Clear role

    try {
      await supabase.auth.signOut();
    } catch {}
  };

  // ============================================================
  // EXIT DEMO (called from banner)
  // ============================================================
  const exitDemo = () => {
    writeDemoFlag(false);
    setIsDemo(false);
    setUser(null);
    setProfile(null);
    setSession(null);
    syncUserRoleToStorage(null); // ⭐ Clear role
  };

  // ============================================================
  // RESET PASSWORD
  // ============================================================
  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      return { error: error.message };
    }
    return { error: null };
  };

  // ============================================================
  // SIGN IN DEMO (view-only, writes blocked)
  // ============================================================
  const signInDemo = async () => {
    console.log("[AuthContext] signInDemo() — activating demo mode");

    writeDemoFlag(true);
    syncUserRoleToStorage(null); // ⭐ Demo = no role

    setIsDemo(true);
    setUser(DEMO_USER);
    setProfile(DEMO_USER);
    setSession({ user: DEMO_USER });
    setLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        isDemo,
        signIn,
        signUp,
        signOut,
        resetPassword,
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
