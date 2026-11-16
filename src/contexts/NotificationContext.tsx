// src/contexts/NotificationContext.tsx
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  Loader2,
  X,
} from "lucide-react";
import { cn } from "../lib/utils";

export type ToastType = "success" | "error" | "warning" | "info" | "loading";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  id?: string;
  title?: string;
  duration?: number; // in milliseconds; 0 = persistent
  action?: ToastAction;
  dismissible?: boolean;
}

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration: number;
  action?: ToastAction;
  dismissible: boolean;
  createdAt: number;
}

export interface ConfirmOptions {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "primary";
  onConfirm?: () => Promise<void> | void;
}

interface ConfirmState extends ConfirmOptions {
  isOpen: boolean;
  resolve: (value: boolean) => void;
  isLoading: boolean;
}

interface NotificationContextType {
  toasts: ToastItem[];
  notify: {
    success: (message: string, options?: ToastOptions) => string;
    error: (message: string, options?: ToastOptions) => string;
    warning: (message: string, options?: ToastOptions) => string;
    info: (message: string, options?: ToastOptions) => string;
    loading: (message: string, options?: ToastOptions) => string;
    dismiss: (id: string) => void;
    clear: () => void;
  };
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

// Global event bus for non-React call sites
type NotificationListener = (toast: ToastItem) => void;
type DismissListener = (id: string) => void;
type ClearListener = () => void;

const notificationListeners = new Set<NotificationListener>();
const dismissListeners = new Set<DismissListener>();
const clearListeners = new Set<ClearListener>();

let confirmHandler: ((options: ConfirmOptions) => Promise<boolean>) | null = null;

function generateToastId(): string {
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Universal notify helper that works both inside and outside React components.
 */
export const notify = {
  success(message: string, options?: ToastOptions): string {
    const id = options?.id || generateToastId();
    const item: ToastItem = {
      id,
      type: "success",
      message,
      title: options?.title,
      duration: options?.duration ?? 4500,
      action: options?.action,
      dismissible: options?.dismissible ?? true,
      createdAt: Date.now(),
    };
    notificationListeners.forEach((l) => l(item));
    return id;
  },
  error(message: string, options?: ToastOptions): string {
    const id = options?.id || generateToastId();
    const item: ToastItem = {
      id,
      type: "error",
      message,
      title: options?.title,
      duration: options?.duration ?? 6000,
      action: options?.action,
      dismissible: options?.dismissible ?? true,
      createdAt: Date.now(),
    };
    notificationListeners.forEach((l) => l(item));
    return id;
  },
  warning(message: string, options?: ToastOptions): string {
    const id = options?.id || generateToastId();
    const item: ToastItem = {
      id,
      type: "warning",
      message,
      title: options?.title,
      duration: options?.duration ?? 5000,
      action: options?.action,
      dismissible: options?.dismissible ?? true,
      createdAt: Date.now(),
    };
    notificationListeners.forEach((l) => l(item));
    return id;
  },
  info(message: string, options?: ToastOptions): string {
    const id = options?.id || generateToastId();
    const item: ToastItem = {
      id,
      type: "info",
      message,
      title: options?.title,
      duration: options?.duration ?? 4500,
      action: options?.action,
      dismissible: options?.dismissible ?? true,
      createdAt: Date.now(),
    };
    notificationListeners.forEach((l) => l(item));
    return id;
  },
  loading(message: string, options?: ToastOptions): string {
    const id = options?.id || generateToastId();
    const item: ToastItem = {
      id,
      type: "loading",
      message,
      title: options?.title,
      duration: options?.duration ?? 0, // sticky until updated or dismissed
      action: options?.action,
      dismissible: options?.dismissible ?? false,
      createdAt: Date.now(),
    };
    notificationListeners.forEach((l) => l(item));
    return id;
  },
  dismiss(id: string): void {
    dismissListeners.forEach((l) => l(id));
  },
  clear(): void {
    clearListeners.forEach((l) => l());
  },
  /**
   * Global confirmation helper for non-component calls.
   * Falls back to native confirm if provider is not mounted.
   */
  async confirm(options: ConfirmOptions): Promise<boolean> {
    if (confirmHandler) {
      return confirmHandler(options);
    }
    const messageStr =
      typeof options.message === "string"
        ? options.message
        : `${options.title}\n${options.message}`;
    return window.confirm(messageStr);
  },
};

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const addToast = useCallback((toast: ToastItem) => {
    setToasts((prev) => {
      // Prevent exact identical active message duplicate within 1 second
      const now = Date.now();
      const duplicate = prev.find(
        (t) =>
          t.message === toast.message &&
          t.type === toast.type &&
          now - t.createdAt < 1000,
      );
      if (duplicate) return prev;

      // Keep max 5 visible toasts to avoid viewport cluttering
      const next = prev.filter((t) => t.id !== toast.id);
      if (next.length >= 5) {
        next.shift();
      }
      return [...next, toast];
    });
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  useEffect(() => {
    notificationListeners.add(addToast);
    dismissListeners.add(dismissToast);
    clearListeners.add(clearToasts);
    return () => {
      notificationListeners.delete(addToast);
      dismissListeners.delete(dismissToast);
      clearListeners.delete(clearToasts);
    };
  }, [addToast, dismissToast, clearToasts]);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({
        ...options,
        isOpen: true,
        resolve,
        isLoading: false,
      });
    });
  }, []);

  useEffect(() => {
    confirmHandler = confirm;
    return () => {
      confirmHandler = null;
    };
  }, [confirm]);

  const handleConfirmAction = async () => {
    if (!confirmState || confirmState.isLoading) return;
    if (confirmState.onConfirm) {
      setConfirmState((prev) => (prev ? { ...prev, isLoading: true } : null));
      try {
        await confirmState.onConfirm();
        confirmState.resolve(true);
        setConfirmState(null);
      } catch (err) {
        setConfirmState((prev) => (prev ? { ...prev, isLoading: false } : null));
        notify.error(
          err instanceof Error
            ? err.message
            : "Une erreur est survenue lors de la confirmation.",
        );
      }
    } else {
      confirmState.resolve(true);
      setConfirmState(null);
    }
  };

  const handleCancelAction = () => {
    if (!confirmState || confirmState.isLoading) return;
    confirmState.resolve(false);
    setConfirmState(null);
  };

  return (
    <NotificationContext.Provider
      value={{
        toasts,
        notify,
        confirm,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      {confirmState?.isOpen && (
        <ConfirmDialogComponent
          state={confirmState}
          onConfirm={handleConfirmAction}
          onCancel={handleCancelAction}
        />
      )}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    // Return fallback bound to global notify
    return {
      toasts: [],
      notify,
      confirm: notify.confirm,
    };
  }
  return context;
}

export const useNotify = () => useNotification().notify;
export const useConfirm = () => useNotification().confirm;

// ==========================================
// TOAST CONTAINER & SINGLE TOAST COMPONENT
// ==========================================

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-relevant="additions text"
      className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((toast) => (
        <SingleToast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function SingleToast({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(100);
  const startTimeRef = useRef<number>(Date.now());
  const remainingTimeRef = useRef<number>(toast.duration);

  useEffect(() => {
    if (toast.duration <= 0) return;

    if (isPaused) {
      return;
    }

    const interval = 50;
    const timer = setInterval(() => {
      remainingTimeRef.current -= interval;
      const pct = Math.max(0, (remainingTimeRef.current / toast.duration) * 100);
      setProgress(pct);

      if (remainingTimeRef.current <= 0) {
        clearInterval(timer);
        onDismiss(toast.id);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [toast.id, toast.duration, isPaused, onDismiss]);

  const handleMouseEnter = () => {
    if (toast.duration > 0) {
      setIsPaused(true);
    }
  };

  const handleMouseLeave = () => {
    if (toast.duration > 0) {
      startTimeRef.current = Date.now();
      setIsPaused(false);
    }
  };

  const typeConfig = {
    success: {
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
      border: "border-l-4 border-l-emerald-500 border-slate-200 dark:border-slate-800",
      bg: "bg-white dark:bg-slate-900",
      progressBg: "bg-emerald-500",
      titleColor: "text-emerald-950 dark:text-emerald-100",
      defaultTitle: "Succès",
    },
    error: {
      icon: <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />,
      border: "border-l-4 border-l-red-500 border-slate-200 dark:border-slate-800",
      bg: "bg-white dark:bg-slate-900",
      progressBg: "bg-red-500",
      titleColor: "text-red-950 dark:text-red-100",
      defaultTitle: "Erreur",
    },
    warning: {
      icon: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />,
      border: "border-l-4 border-l-amber-500 border-slate-200 dark:border-slate-800",
      bg: "bg-white dark:bg-slate-900",
      progressBg: "bg-amber-500",
      titleColor: "text-amber-950 dark:text-amber-100",
      defaultTitle: "Attention",
    },
    info: {
      icon: <Info className="w-5 h-5 text-royal-500 shrink-0" />,
      border: "border-l-4 border-l-royal-500 border-slate-200 dark:border-slate-800",
      bg: "bg-white dark:bg-slate-900",
      progressBg: "bg-royal-500",
      titleColor: "text-royal-950 dark:text-royal-100",
      defaultTitle: "Information",
    },
    loading: {
      icon: (
        <Loader2 className="w-5 h-5 text-royal-500 dark:text-royal-400 shrink-0 animate-spin" />
      ),
      border: "border-l-4 border-l-royal-400 border-slate-200 dark:border-slate-800",
      bg: "bg-white dark:bg-slate-900",
      progressBg: "bg-royal-400",
      titleColor: "text-royal-950 dark:text-royal-100",
      defaultTitle: "En cours...",
    },
  }[toast.type];

  return (
    <div
      role={toast.type === "error" || toast.type === "warning" ? "alert" : "status"}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "pointer-events-auto relative overflow-hidden rounded-xl border shadow-lg transition-all duration-300",
        "animate-in fade-in slide-in-from-bottom-3 duration-200",
        typeConfig.bg,
        typeConfig.border,
      )}
    >
      <div className="flex items-start gap-3 p-3.5 pr-2">
        <div className="mt-0.5">{typeConfig.icon}</div>
        <div className="flex-1 min-w-0 pr-1">
          {toast.title ? (
            <p className={cn("text-sm font-semibold mb-0.5", typeConfig.titleColor)}>
              {toast.title}
            </p>
          ) : null}
          <p className="text-sm text-slate-700 dark:text-slate-300 break-words leading-relaxed">
            {toast.message}
          </p>
          {toast.action && (
            <button
              type="button"
              onClick={() => {
                toast.action?.onClick();
                onDismiss(toast.id);
              }}
              className="mt-2 text-xs font-semibold text-royal-600 dark:text-royal-400 hover:underline inline-flex items-center"
            >
              {toast.action.label}
            </button>
          )}
        </div>
        {toast.dismissible && (
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            aria-label="Fermer la notification"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {toast.duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className={cn("h-full transition-all duration-75", typeConfig.progressBg)}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

// ==========================================
// REUSABLE CONFIRM DIALOG COMPONENT
// ==========================================

function ConfirmDialogComponent({
  state,
  onConfirm,
  onCancel,
}: {
  state: ConfirmState;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Auto-focus confirm button for keyboard accessibility
    confirmButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  const variantConfig = {
    danger: {
      icon: <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />,
      iconBg: "bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/50",
      buttonBg:
        "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 shadow-sm",
      defaultConfirm: "Supprimer",
    },
    warning: {
      icon: <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />,
      iconBg: "bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/50",
      buttonBg:
        "bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500 shadow-sm",
      defaultConfirm: "Confirmer",
    },
    primary: {
      icon: <Info className="w-6 h-6 text-royal-600 dark:text-royal-400" />,
      iconBg: "bg-royal-50 dark:bg-royal-950/50 border border-royal-200 dark:border-royal-900/50",
      buttonBg:
        "bg-royal-600 hover:bg-royal-700 text-white focus:ring-royal-500 shadow-sm",
      defaultConfirm: "Valider",
    },
  }[state.variant || "danger"];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
              variantConfig.iconBg,
            )}
          >
            {variantConfig.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3
              id="confirm-dialog-title"
              className="text-base font-semibold text-slate-900 dark:text-slate-100"
            >
              {state.title}
            </h3>
            <div className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {state.message}
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={state.isLoading}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-50 transition-colors"
          >
            {state.cancelLabel || "Annuler"}
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            onClick={onConfirm}
            disabled={state.isLoading}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 transition-colors flex items-center gap-2",
              variantConfig.buttonBg,
            )}
          >
            {state.isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{state.confirmLabel || variantConfig.defaultConfirm}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
