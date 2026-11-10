// src/lib/supabase.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  hasPermission,
  RPC_WRITE_PERMISSION,
  TABLE_WRITE_MODULE,
  writeMethodToAction,
} from "./permissions";

// =====================================================
// 1. ENVIRONMENT VARIABLES
// =====================================================
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.error(
    "Supabase credentials missing. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.",
  );
}

// =====================================================
// 2. MOCK FALLBACK (when Supabase isn't configured)
// =====================================================
function makeMockSupabase() {
  const errMsg =
    "Supabase not configured - check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY";

  const responseWithError = async () => ({
    data: null,
    error: { message: errMsg },
  });

  const tableBuilder = () => ({
    select: responseWithError,
    insert: responseWithError,
    upsert: responseWithError,
    update: responseWithError,
    delete: responseWithError,
    maybeSingle: responseWithError,
  });

  return {
    from: (_: string) => tableBuilder(),
    auth: {
      getUser: async () => ({ data: { user: null } }),
      getSession: async () => ({ data: { session: null } }),
      signInWithPassword: async () => ({ error: { message: errMsg } }),
      signOut: async () => ({}),
      resetPasswordForEmail: async () => ({ error: { message: errMsg } }),
      onAuthStateChange: (_cb: any) => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
    },
    channel: (_: string) => ({
      on: () => ({ subscribe: async () => ({}) }),
      subscribe: async () => ({}),
    }),
    removeChannel: (_: any) => {},
  } as unknown as SupabaseClient;
}

// =====================================================
// 3. REAL SUPABASE CLIENT
// =====================================================
const realClient: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl ?? "", supabaseAnonKey ?? "", {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : makeMockSupabase();

// =====================================================
// 4. WRITE-BLOCK DETECTION
// =====================================================
const DEMO_KEY = "pajes_demo_mode";
const USER_ROLE_KEY = "pajes_user_role";

/**
 * Returns true if:
 *  - We're in demo mode (localStorage flag)
 *  - OR the current user has no role (simple user)
 */
function isWriteBlocked(): boolean {
  try {
    // 🎭 Demo mode → blocked
    if (localStorage.getItem(DEMO_KEY) === "true") return true;

    // 👤 No role → blocked
    const role = localStorage.getItem(USER_ROLE_KEY);
    if (!role || role === "" || role === "null" || role === "undefined") {
      return true;
    }

    // ✅ Has a role → allowed
    return false;
  } catch {
    // If localStorage fails, be safe and block
    return true;
  }
}

/**
 * Returns the reason why writes are blocked (for logging)
 */
function getBlockReason(): "demo" | "no-role" | null {
  try {
    if (localStorage.getItem(DEMO_KEY) === "true") return "demo";
    const role = localStorage.getItem(USER_ROLE_KEY);
    if (!role || role === "" || role === "null" || role === "undefined") {
      return "no-role";
    }
    return null;
  } catch {
    return "no-role";
  }
}

function currentWriteUser(): { role?: string | null } {
  try {
    return { role: localStorage.getItem(USER_ROLE_KEY) };
  } catch {
    return { role: null };
  }
}

function isModuleWriteDenied(table: string, method: string): boolean {
  const moduleId = TABLE_WRITE_MODULE[table];
  if (!moduleId) return false;
  const action = writeMethodToAction(method);
  return !hasPermission(currentWriteUser(), moduleId, action);
}

function isRpcWriteDenied(fnName: string): boolean {
  const mapped = RPC_WRITE_PERMISSION[fnName];
  if (!mapped) return false;
  return !hasPermission(currentWriteUser(), mapped.module, mapped.action);
}

// =====================================================
// 5. FAKE CHAIN — Simulates Supabase responses (no network)
// =====================================================
function createFakeResponse(error: { message: string; code?: string } | null = null) {
  const resolved = Promise.resolve({ data: null, error });
  const chain: any = {
    insert: () => chain,
    update: () => chain,
    delete: () => chain,
    upsert: () => chain,
    select: () => chain,
    eq: () => chain,
    neq: () => chain,
    gt: () => chain,
    gte: () => chain,
    lt: () => chain,
    lte: () => chain,
    like: () => chain,
    ilike: () => chain,
    is: () => chain,
    in: () => chain,
    contains: () => chain,
    order: () => chain,
    limit: () => chain,
    range: () => chain,
    single: () => resolved,
    maybeSingle: () => resolved,
    then: (resolve: any) => resolved.then(resolve),
    catch: (reject: any) => resolved.catch(reject),
  };
  return chain;
}

// =====================================================
// 6. BLOCKED METHODS
// =====================================================
const WRITE_METHODS = ["insert", "update", "delete", "upsert"];

// =====================================================
// 7. PROXY — Intercepts all Supabase calls
// =====================================================
export const supabase: SupabaseClient = new Proxy(realClient, {
  get(target, prop: string) {
    // ---------- .from(table) ----------
    if (prop === "from") {
      return (table: string) => {
        // If writes are blocked AND this is a write, use fake response
        if (isWriteBlocked()) {
          const builder = (target as any).from(table);

          return new Proxy(builder, {
            get(b, methodName: string) {
              // Block write methods
              if (WRITE_METHODS.includes(methodName)) {
                return (...args: any[]) => {
                  const reason = getBlockReason();
                  const emoji = reason === "demo" ? "🎭" : "👤";
                  const label = reason === "demo" ? "[DEMO]" : "[NO-ROLE]";

                  console.warn(
                    `${emoji} ${label} Blocked write: ${table}.${methodName}()`,
                    args,
                  );

                  // Return fake success — UI won't crash
                  return createFakeResponse();
                };
              }

              // Allow reads (they'll use real Supabase reads; mock data is filtered in useSupabaseQuery)
              return (b as any)[methodName];
            },
          });
        }

        const builder = (target as any).from(table);
        return new Proxy(builder, {
          get(b, methodName: string) {
            if (WRITE_METHODS.includes(methodName) && isModuleWriteDenied(table, methodName)) {
              return (...args: any[]) => {
                console.warn(
                  `⛔ [RBAC] Blocked write: ${table}.${methodName}()`,
                  args,
                );
                return createFakeResponse({
                  message: "Permission insuffisante",
                  code: "PERMISSION_DENIED",
                });
              };
            }
            return (b as any)[methodName];
          },
        });
      };
    }

    // ---------- .rpc(fnName, params) ----------
    if (prop === "rpc") {
      return (fnName: string, params?: any) => {
        if (isWriteBlocked()) {
          const reason = getBlockReason();
          const emoji = reason === "demo" ? "🎭" : "👤";
          const label = reason === "demo" ? "[DEMO]" : "[NO-ROLE]";
          console.warn(`${emoji} ${label} Blocked RPC: ${fnName}()`, params);
          return Promise.resolve({ data: null, error: null });
        }
        if (isRpcWriteDenied(fnName)) {
          console.warn(`⛔ [RBAC] Blocked RPC: ${fnName}()`, params);
          return Promise.resolve({
            data: null,
            error: { message: "Permission insuffisante", code: "PERMISSION_DENIED" },
          });
        }
        return (target as any).rpc(fnName, params);
      };
    }

    // ---------- .storage ----------
    if (prop === "storage") {
      return new Proxy((target as any).storage, {
        get(sTarget, sProp: string) {
          if (sProp === "from") {
            return (bucket: string) => {
              if (isWriteBlocked()) {
                const reason = getBlockReason();
                const emoji = reason === "demo" ? "🎭" : "👤";
                const label = reason === "demo" ? "[DEMO]" : "[NO-ROLE]";
                console.warn(`${emoji} ${label} Blocked storage: ${bucket}`);
                return createFakeResponse();
              }
              return (sTarget as any).from(bucket);
            };
          }
          return (sTarget as any)[sProp];
        },
      });
    }

    // Everything else (auth, etc.) passes through
    return (target as any)[prop];
  },
});

// =====================================================
// 8. CONNECTION CHECK
// =====================================================
export async function checkDatabaseConnection(): Promise<{
  ok: boolean;
  error?: string;
}> {
  if (!isSupabaseConfigured) {
    return { ok: false, error: "Variables Supabase manquantes dans .env" };
  }

  const { error } = await supabase
    .from("clients")
    .select("id", { count: "exact", head: true });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}