// src/pages/auth/AuthPage.tsx
import { FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Check, Eye, EyeOff, Hexagon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/AuthContext";
import { LanguageSwitcher } from "../../components/ui/LanguageSwitcher";
import { cn } from "../../lib/utils";

type AuthMode = "signin" | "signup";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function AuthPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    signIn,
    signUp,
    resetPassword,
    signInDemo,
    session,
    isDemo,
    loading: authLoading,
    authError,
  } = useAuth();

  const FEATURES = [
    {
      title: t("auth.unifiedPlatform"),
      description: t("auth.unifiedPlatform"),
    },
    {
      title: t("auth.realtimeAnalytics"),
      description: t("auth.realtimeAnalytics"),
    },
    {
      title: t("auth.enterpriseSecurity"),
      description: t("auth.enterpriseSecurity"),
    },
  ] as const;

  const initialMode: AuthMode =
    searchParams.get("tab") === "signup" ? "signup" : "signin";
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const submissionInProgress = useRef(false);

  useEffect(() => {
    if (!authLoading && (session || isDemo)) {
      navigate("/", { replace: true });
    }
  }, [session, isDemo, authLoading, navigate]);

  useEffect(() => {
    setSearchParams(mode === "signup" ? { tab: "signup" } : {}, {
      replace: true,
    });
  }, [mode, setSearchParams]);

  function switchMode(next: AuthMode) {
    setMode(next);
    setError(null);
    setSuccess(null);
  }

  function resolveError(code: string) {
    return code.startsWith("auth.errors.") ? t(code) : code;
  }

  function validate(): string | null {
    if (!email.trim()) return t("auth.errors.emailRequired");
    if (!isValidEmail(email)) return t("auth.errors.emailInvalid");
    if (mode === "signup") {
      if (!fullName.trim()) return t("auth.errors.fullNameRequired");
      if (!acceptTerms) return t("auth.errors.termsRequired");
    } else {
      if (!password) return t("auth.errors.passwordRequired");
      if (password.length < 6) return t("auth.errors.passwordMin");
    }
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submissionInProgress.current) return;
    setError(null);
    setSuccess(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    submissionInProgress.current = true;
    setLoading(true);
    try {
      if (mode === "signin") {
        const result = await signIn(email, password);
        if (result.error) setError(resolveError(result.error));
        else navigate("/", { replace: true });
      } else {
        const parts = fullName.trim().split(/\s+/);
        const firstName = parts[0] ?? "";
        const lastName = parts.slice(1).join(" ") || firstName;
        const result = await signUp({ email, firstName, lastName });
        if (result.error) setError(resolveError(result.error));
        else {
          setMode("signin");
          setSuccess(t("auth.activationInstructions"));
        }
      }
    } finally {
      submissionInProgress.current = false;
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    setError(null);
    setSuccess(null);

    if (!email.trim()) {
      setError(t("auth.errors.emailRequired"));
      return;
    }
    if (!isValidEmail(email)) {
      setError(t("auth.errors.emailInvalid"));
      return;
    }

    setLoading(true);
    try {
      const result = await resetPassword(email);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(
          t("auth.resetEmailSent") ||
            "Si un compte existe pour cette adresse, un e-mail de réinitialisation a été envoyé. Vérifiez votre boîte de réception et vos spams."
        );
      }
    } catch {
      setError(t("auth.errors.generic") || "Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDemoAccess() {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await signInDemo();
      navigate("/", { replace: true });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col lg:flex-row">
      {/* Brand panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-royal-600 flex-col justify-between p-12 text-white">
        <div>
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
              <Hexagon className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-wide">
              {t("app.name")}
            </span>
          </div>

          <h1 className="text-3xl xl:text-4xl font-bold leading-tight mb-4">
            {t("auth.enterprisePlatform")}
          </h1>
          <p className="text-royal-100 text-base leading-relaxed max-w-md">
            {t("auth.streamline")}
          </p>

          <ul className="mt-12 space-y-6">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="flex items-start gap-4">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                </div>
                <div>
                  <p className="font-semibold text-white">{feature.title}</p>
                  <p className="text-sm text-royal-100/80 mt-0.5">
                    {feature.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-sm text-royal-200/70">{t("auth.allRights")}</p>
      </div>

      {/* Form panel */}
      <div className="flex min-h-[100dvh] flex-1 flex-col bg-white">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center gap-3 bg-royal-600 px-4 py-4 text-white sm:px-6">
          <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
            <Hexagon className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold">{t("app.name")}</p>
            <p className="text-xs text-royal-100">
              {t("auth.enterprisePlatform")}
            </p>
          </div>
        </div>

        <div className="flex justify-end px-4 pt-3 sm:px-8 lg:px-10">
          <LanguageSwitcher />
        </div>

        <div className="flex flex-1 items-start justify-center px-4 py-5 sm:items-center sm:p-10">
          <div className="w-full max-w-md">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-lg sm:p-8">
              {/* Tabs */}
              <div className="flex border-b border-slate-200 mb-8">
                <button
                  type="button"
                  onClick={() => switchMode("signin")}
                  className={cn(
                    "flex-1 pb-3 text-sm font-medium transition-colors relative",
                    mode === "signin"
                      ? "text-royal-600"
                      : "text-slate-400 hover:text-slate-600",
                  )}
                >
                  {t("auth.signIn")}
                  {mode === "signin" && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-royal-600 rounded-full" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => switchMode("signup")}
                  className={cn(
                    "flex-1 pb-3 text-sm font-medium transition-colors relative",
                    mode === "signup"
                      ? "text-royal-600"
                      : "text-slate-400 hover:text-slate-600",
                  )}
                >
                  {t("auth.signUp")}
                  {mode === "signup" && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-royal-600 rounded-full" />
                  )}
                </button>
              </div>

              {error && (
                <div className="mb-4 px-3 py-2 rounded-lg bg-error-50 text-error-600 text-sm border border-error-100">
                  {error}
                </div>
              )}
              {authError && !error && (
                <div className="mb-4 px-3 py-2 rounded-lg bg-error-50 text-error-600 text-sm border border-error-100">
                  {authError}
                </div>
              )}
              {success && (
                <div className="mb-4 px-3 py-2 rounded-lg bg-success-50 text-success-700 text-sm border border-success-100">
                  {success}
                </div>
              )}

              <form
                id="auth-form"
                name="auth-form"
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                {mode === "signup" && (
                  <>
                    <div>
                      <label
                        htmlFor="fullName"
                        className="block text-sm font-medium text-slate-700 mb-1.5"
                      >
                        {t("auth.fullName")}
                      </label>
                      <input
                        id="fullName"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="auth-input"
                        autoComplete="name"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="company"
                        className="block text-sm font-medium text-slate-700 mb-1.5"
                      >
                        {t("auth.company")}
                      </label>
                      <input
                        id="company"
                        type="text"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        className="auth-input"
                        autoComplete="organization"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    {t("auth.emailAddress")}
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="pajes@gmail.com"
                    className="auth-input"
                    autoComplete="email"
                  />
                </div>

                {mode === "signin" && (
                  <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    {t("auth.password")}
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="auth-input pr-10"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  </div>
                )}

                {mode === "signup" && (
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acceptTerms}
                      onChange={(e) => setAcceptTerms(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-royal-600 focus:ring-royal-500"
                      aria-required="true"
                      aria-describedby="accept-terms-copy"
                    />
                    <span
                      id="accept-terms-copy"
                      className="text-sm text-slate-600"
                    >
                      {t("auth.acceptTerms")}{" "}
                      <a
                        href="/legal?document=terms"
                        target="_blank"
                        rel="noreferrer"
                        className="text-royal-600 hover:text-royal-700 font-medium"
                      >
                        {t("auth.terms")}
                      </a>{" "}
                      {t("auth.and")}{" "}
                      <a
                        href="/legal?document=privacy"
                        target="_blank"
                        rel="noreferrer"
                        className="text-royal-600 hover:text-royal-700 font-medium"
                      >
                        {t("auth.privacy")}
                      </a>
                    </span>
                  </label>
                )}

                {mode === "signin" && (
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded border-slate-300 text-royal-600 focus:ring-royal-500"
                      />
                      <span className="text-sm text-slate-600">
                        {t("auth.rememberMe")}
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-sm text-royal-600 hover:text-royal-700 font-medium"
                    >
                      {t("auth.forgotPassword")}
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-lg bg-royal-600 text-white text-sm font-medium hover:bg-royal-700 focus:outline-none focus:ring-2 focus:ring-royal-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
                >
                  {loading
                    ? mode === "signin"
                      ? t("auth.signingIn")
                      : t("auth.signingUp")
                    : mode === "signin"
                      ? t("auth.signIn")
                      : t("auth.signUp")}
                </button>
              </form>

              {mode === "signin" && (
                <>
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-white px-3 text-slate-400">
                        {t("topNav.or")}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleDemoAccess}
                    disabled={loading}
                    className="w-full py-2.5 px-4 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <span className="text-lg">🎭</span>
                    {t("auth.demoAccess") || "Accès Démo"}
                  </button>
                  <p className="text-xs text-slate-400 text-center mt-2">
                    Explorez PAJES avec des données fictives
                  </p>
                </>
              )}
            </div>

            <p className="text-center text-sm text-slate-500 mt-6">
              {mode === "signin"
                ? t("auth.noAccount")
                : t("auth.alreadyAccount")}{" "}
              <button
                type="button"
                onClick={() =>
                  switchMode(mode === "signin" ? "signup" : "signin")
                }
                className="text-royal-600 hover:text-royal-700 font-medium"
              >
                {mode === "signin"
                  ? t("auth.signUpAction")
                  : t("auth.signInAction")}
              </button>
            </p>

            <p className="mt-4 text-center text-sm">
              <a
                href="/legal"
                target="_blank"
                rel="noreferrer"
                className="text-royal-600 hover:text-royal-700 font-medium focus:outline-none focus:ring-2 focus:ring-royal-500 focus:ring-offset-2 rounded"
              >
                {t("legalCenter.title")}
              </a>
            </p>
          </div>
        </div>

        <p className="lg:hidden text-center text-xs text-slate-400 pb-6">
          {t("auth.allRights")}
        </p>

        <footer className="mt-auto px-6 pb-4 text-right text-[10px] leading-relaxed text-slate-400/70 sm:text-xs">
          <p>
            Developed by:{" "}
            <span className="font-semibold">
              TCHEBE MBIAFEU TRESOR DUPLEX
            </span>
          </p>
          <p className="italic">
            Software Engineer • IT Manager • Full-Stack Developer
          </p>
        </footer>
      </div>
    </div>
  );
}

export default AuthPage;
