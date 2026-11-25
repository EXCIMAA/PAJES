// src/components/security/WriteBlocker.tsx
import { useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { notify } from "../../contexts/NotificationContext";

const DEMO_KEY = "pajes_demo_mode";
const USER_ROLE_KEY = "pajes_user_role";

// ============================================================
// PUBLIC PAGES — Nothing is blocked here
//
// Authentication flows (login, signup, activation, password reset) must stay
// fully interactive for a restricted account, otherwise the user cannot
// activate the account or read the error explaining why. Only the
// authenticated app shell is write-blocked.
// ============================================================
const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/sign-in",
  "/sign-up",
  "/activate-account",
  "/reset-password",
  "/forgot-password",
  "/legal",
  "/pending-approval",
] as const;

const PUBLIC_PREFIXES = ["/auth"] as const;

function isPublicPage(): boolean {
  if (typeof window === "undefined") return false;
  const path = window.location.pathname.toLowerCase().replace(/\/+$/, "") || "/";
  if (PUBLIC_PATHS.some((publicPath) => publicPath === path)) return true;
  return PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix));
}

// ============================================================
// STATE CHECKS
// ============================================================
function isDemoMode(): boolean {
  try {
    return localStorage.getItem(DEMO_KEY) === "true";
  } catch {
    return false;
  }
}

function getRole(): string | null {
  try {
    return localStorage.getItem(USER_ROLE_KEY);
  } catch {
    return null;
  }
}

/**
 * A user is blocked (shows alert) ONLY if:
 *  - NOT in demo mode
 *  - AND (role is "user" OR role is null/empty)
 *
 * In demo mode: buttons are clickable (silent writes blocked in supabase.ts)
 */
function isBlockedUser(): boolean {
  // 🎭 Demo mode → NOT blocked at the UI level (writes are silently blocked in supabase.ts)
  if (isDemoMode()) return false;

  // 👤 Not demo → check role
  const role = getRole();
  if (role === "user") return true;
  return !role || role === "" || role === "null" || role === "undefined";
}

// ============================================================
// BLOCKED NOTIFICATION
// ============================================================
function showBlockedAlert() {
  notify.warning(
    "Votre compte possède le rôle « user » qui ne permet aucune opération. Contactez votre administrateur PAJES pour qu'il vous attribue un rôle.",
    { title: "⛔ Accès refusé", duration: 7000 },
  );
}

// ============================================================
// ELEMENT HELPERS
// ============================================================
function isActionableElement(el: Element): boolean {
  const tag = el.tagName.toLowerCase();

  if (tag === "button") return true;

  if (tag === "a") {
    const anchor = el as HTMLAnchorElement;
    if (anchor.hasAttribute("download")) return true;
    return false;
  }

  if (tag === "input") {
    const type = (el as HTMLInputElement).type;
    return ["submit", "button", "file", "image", "reset"].includes(type);
  }

  if (tag === "label") {
    const htmlFor = el.getAttribute("for");
    if (htmlFor) {
      const target = document.getElementById(htmlFor);
      if (target && (target as HTMLInputElement).type === "file") return true;
    }
  }

  if (el.getAttribute("role") === "button") return true;

  return false;
}

// ============================================================
// THE COMPONENT
// ============================================================
export function WriteBlocker() {
  const { user, isDemo } = useAuth();

  useEffect(() => {
    // ============================================================
    // 1. BLOCK CLICKS ON BUTTONS / ACTIONABLE ELEMENTS
    // ============================================================
    const handleClick = (e: Event) => {
      if (isPublicPage()) return;
      if (!isBlockedUser()) return;

      const target = e.target as Element;
      if (!target) return;

      let el: Element | null = target;
      while (el && el !== document.body) {
        if (isActionableElement(el)) {
          // Exception: explicitly public action buttons (e.g. account activation)
          // are clickable by anyone, including restricted "user" accounts.
          if (el.getAttribute("data-public-action") === "true") return;

          if (el.getAttribute("data-public-navigation") === "true") return;

          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();

          const label =
            (el.textContent || "").trim().slice(0, 60) ||
            el.getAttribute("aria-label") ||
            el.getAttribute("title") ||
            "action";

          console.warn("🛡️ [WriteBlocker] Blocked:", label);
          showBlockedAlert();
          return;
        }
        el = el.parentElement;
      }
    };

    // ============================================================
    // 2. BLOCK FILE INPUTS
    // ============================================================
    const handleFileChange = (e: Event) => {
      if (isPublicPage()) return;
      if (!isBlockedUser()) return;

      const target = e.target as HTMLInputElement;
      if (target?.type === "file") {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        target.value = "";
        console.warn("🛡️ [WriteBlocker] Blocked file upload");
        showBlockedAlert();
      }
    };

    // ============================================================
    // 3. BLOCK FILE PICKER
    // ============================================================
    const handleFileClick = (e: Event) => {
      if (isPublicPage()) return;
      if (!isBlockedUser()) return;

      const target = e.target as HTMLInputElement;
      if (target?.type === "file") {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        console.warn("🛡️ [WriteBlocker] Blocked file picker");
        showBlockedAlert();
      }
    };

    // ============================================================
    // 4. BLOCK DOWNLOADS (URL.createObjectURL)
    // ============================================================
    const originalCreateObjectURL = URL.createObjectURL;
    URL.createObjectURL = function (obj: Blob | MediaSource) {
      if (!isPublicPage() && isBlockedUser()) {
        console.warn("🛡️ [WriteBlocker] Blocked URL.createObjectURL");
        showBlockedAlert();
        return originalCreateObjectURL.call(URL, new Blob([]));
      }
      return originalCreateObjectURL.call(URL, obj);
    };

    // ============================================================
    // 5. BLOCK <a download>
    // ============================================================
    const handleAnchorClick = (e: Event) => {
      if (isPublicPage()) return;
      if (!isBlockedUser()) return;

      const target = e.target as HTMLElement;
      let el: HTMLElement | null = target;
      while (el && el !== document.body) {
        if (el.tagName === "A" && el.hasAttribute("download")) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          console.warn("🛡️ [WriteBlocker] Blocked <a download>");
          showBlockedAlert();
          return;
        }
        el = el.parentElement;
      }
    };

    // ============================================================
    // 6. BLOCK FORM SUBMISSIONS (except auth forms)
    // ============================================================
    const handleFormSubmit = (e: Event) => {
      if (isPublicPage()) return;
      if (!isBlockedUser()) return;

      const form = e.target as HTMLFormElement;
      if (!form) return;

      const formId = (form.id || "").toLowerCase();
      const formName = (form.getAttribute("name") || "").toLowerCase();
      const combined = `${formId} ${formName}`;

      if (
        combined.includes("auth") ||
        combined.includes("login") ||
        combined.includes("signin") ||
        combined.includes("signup") ||
        combined.includes("password") ||
        combined.includes("connexion")
      ) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      console.warn("🛡️ [WriteBlocker] Blocked form submit");
      showBlockedAlert();
    };

    // ============================================================
    // INSTALL LISTENERS
    // ============================================================
    document.addEventListener("click", handleClick, true);
    document.addEventListener("click", handleAnchorClick, true);
    document.addEventListener("change", handleFileChange, true);
    document.addEventListener("submit", handleFormSubmit, true);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            const el = node as HTMLElement;
            const fileInputs = el.querySelectorAll?.('input[type="file"]') as
              | NodeListOf<HTMLInputElement>
              | undefined;
            fileInputs?.forEach((input) => {
              input.addEventListener("click", handleFileClick, true);
            });
            if (
              el.tagName === "INPUT" &&
              (el as HTMLInputElement).type === "file"
            ) {
              el.addEventListener("click", handleFileClick, true);
            }
          }
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("click", handleAnchorClick, true);
      document.removeEventListener("change", handleFileChange, true);
      document.removeEventListener("submit", handleFormSubmit, true);
      observer.disconnect();
      URL.createObjectURL = originalCreateObjectURL;
    };
  }, [user, isDemo]);

  return null;
}

export default WriteBlocker;
