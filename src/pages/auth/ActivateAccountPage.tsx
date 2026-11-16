// src/pages/auth/ActivateAccountPage.tsx
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  ArrowRight,
  Loader2,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { notify } from "../../contexts/NotificationContext";
import { clearAuthLinkToken, getAuthLinkToken } from "../../lib/authLink";
import { cn } from "../../lib/utils";

export function ActivateAccountPage() {
  const navigate = useNavigate();
  const [token] = useState(getAuthLinkToken);
  const { activateAccount } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    password?: string;
    confirmPassword?: string;
  }>({});
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    clearAuthLinkToken();
    if (!token) {
      setError("Le lien d'activation est invalide ou expiré.");
    }
  }, [token]);

  const validate = (): boolean => {
    const errors: { password?: string; confirmPassword?: string } = {};

    if (!password) {
      errors.password = "Veuillez renseigner votre mot de passe.";
    } else if (password.length < 8) {
      errors.password = "Le mot de passe doit comporter au moins 8 caractères.";
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Veuillez confirmer votre mot de passe.";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Les mots de passe ne correspondent pas.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError("Ce lien d'activation est manquant ou a expiré.");
      return;
    }

    if (!validate()) {
      return;
    }

    setLoading(true);
    try {
      const result = await activateAccount(token, password);
      if (result.error) {
        setError(result.error);
        notify.error(result.error);
      } else {
        setActivated(true);
        notify.success("Votre compte PAJES a été activé avec succès.");
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Une erreur est survenue lors de l'activation.";
      setError(msg);
      notify.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 transition-colors">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xl transition-all">
        {/* Brand header */}
        <div className="mb-6 flex items-center gap-3.5 border-b border-slate-100 dark:border-slate-800/80 pb-5">
          <div
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-xl transition-colors",
              activated
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                : "bg-royal-50 dark:bg-royal-950/40 text-royal-600 dark:text-royal-400",
            )}
          >
            {activated ? (
              <CheckCircle2 className="h-6 w-6" />
            ) : (
              <ShieldCheck className="h-6 w-6" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-royal-600 dark:text-royal-400">
                PAJES
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {activated ? "Compte activé avec succès" : "Activation de votre compte"}
            </h1>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-3.5 text-sm text-red-700 dark:text-red-300"
          >
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
            <div className="leading-relaxed">{error}</div>
          </div>
        )}

        {activated ? (
          <div className="space-y-6">
            <div className="rounded-xl border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/60 dark:bg-emerald-950/20 p-4">
              <p className="text-sm text-emerald-900 dark:text-emerald-200 leading-relaxed font-medium">
                Votre compte a été activé avec succès.
              </p>
              <p className="mt-2 text-xs text-emerald-800/80 dark:text-emerald-300/80 leading-relaxed">
                Vous pouvez maintenant vous connecter en toute sécurité avec votre
                adresse e-mail et le mot de passe que vous venez de confirmer ou
                choisir.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/login", { replace: true })}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-royal-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-royal-700 active:bg-royal-800 transition-colors"
            >
              <span>Accéder à la page de connexion</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Clear instructions */}
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-2">
              <p className="font-medium text-slate-800 dark:text-slate-200">
                Consignes pour finaliser votre activation :
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                <li>
                  <strong className="text-slate-700 dark:text-slate-300">
                    Si votre compte a déjà un mot de passe
                  </strong>{" "}
                  défini à l'inscription, veuillez saisir ce mot de passe et le
                  confirmer.
                </li>
                <li>
                  <strong className="text-slate-700 dark:text-slate-300">
                    Si votre compte n'en a pas encore
                  </strong>
                  , choisissez un nouveau mot de passe sécurisé et confirmez-le.
                </li>
                <li>Le mot de passe doit comporter au moins 8 caractères.</li>
              </ul>
            </div>

            {/* Password input */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label
                  htmlFor="activation-password"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-200"
                >
                  Mot de passe
                </label>
              </div>
              <div className="relative">
                <input
                  id="activation-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) {
                      setFieldErrors((prev) => ({ ...prev, password: undefined }));
                    }
                  }}
                  disabled={!token || loading}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={cn(
                    "w-full rounded-xl border px-3.5 py-2.5 pr-10 text-sm transition-colors",
                    "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100",
                    "focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-900",
                    fieldErrors.password
                      ? "border-red-400 focus:ring-red-400"
                      : "border-slate-200 dark:border-slate-700 focus:ring-royal-500",
                  )}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {/* Confirm password input */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label
                  htmlFor="activation-confirm"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-200"
                >
                  Confirmer le mot de passe
                </label>
              </div>
              <div className="relative">
                <input
                  id="activation-confirm"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirmPassword) {
                      setFieldErrors((prev) => ({
                        ...prev,
                        confirmPassword: undefined,
                      }));
                    }
                  }}
                  disabled={!token || loading}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className={cn(
                    "w-full rounded-xl border px-3.5 py-2.5 pr-10 text-sm transition-colors",
                    "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100",
                    "focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-900",
                    fieldErrors.confirmPassword
                      ? "border-red-400 focus:ring-red-400"
                      : "border-slate-200 dark:border-slate-700 focus:ring-royal-500",
                  )}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={
                    showConfirmPassword
                      ? "Masquer la confirmation"
                      : "Afficher la confirmation"
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {fieldErrors.confirmPassword}
                </p>
              )}
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={!token || loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-royal-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-royal-700 active:bg-royal-800 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Activation en cours...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Activer mon compte</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default ActivateAccountPage;
