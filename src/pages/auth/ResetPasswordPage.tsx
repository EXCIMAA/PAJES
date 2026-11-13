// src/pages/auth/ResetPasswordPage.tsx
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Eye, EyeOff, Hexagon, Lock } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { clearAuthLinkToken, getAuthLinkToken } from "../../lib/authLink";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [token] = useState(getAuthLinkToken);
  const { confirmPasswordReset } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    clearAuthLinkToken();
    if (!token) {
      setError(
        "Lien invalide ou expiré. Refaites une demande depuis la page de connexion.",
      );
    }
    setChecking(false);
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    try {
      if (!token) {
        setError(
          "Lien invalide ou expiré. Refaites une demande depuis la page de connexion.",
        );
        return;
      }
      const result = await confirmPasswordReset(token, password);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuccess(true);
      window.setTimeout(() => {
        navigate("/login", { replace: true });
      }, 2500);
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-royal-600/30 border-t-royal-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Brand panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-royal-600 flex-col justify-between p-12 text-white">
        <div>
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
              <Hexagon className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-wide">PAJES</span>
          </div>

          <h1 className="text-3xl xl:text-4xl font-bold leading-tight mb-4">
            Réinitialiser votre mot de passe
          </h1>
          <p className="text-royal-100 text-base leading-relaxed max-w-md">
            Choisissez un nouveau mot de passe sécurisé pour retrouver l'accès à
            votre compte PAJES.
          </p>
        </div>
        <p className="text-sm text-royal-200/70">
          © {new Date().getFullYear()} PAJES. Tous droits réservés.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex flex-col bg-white min-h-screen">
        <div className="lg:hidden flex items-center gap-3 p-6 bg-royal-600 text-white">
          <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
            <Hexagon className="w-5 h-5 text-white" />
          </div>
          <p className="font-bold">PAJES</p>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md">
            <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-royal-100 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-royal-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Nouveau mot de passe
                  </h2>
                  <p className="text-xs text-slate-500">
                    Choisissez un mot de passe sécurisé
                  </p>
                </div>
              </div>

              {error && (
                <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 text-red-600 text-sm border border-red-100">
                  {error}
                </div>
              )}

              {success ? (
                <div className="py-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                    <Check className="w-6 h-6 text-green-600" strokeWidth={3} />
                  </div>
                  <p className="text-slate-700 font-medium">
                    Mot de passe modifié avec succès !
                  </p>
                  <p className="text-sm text-slate-500 mt-2">
                    Redirection vers la connexion...
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-slate-700 mb-1.5"
                    >
                      Nouveau mot de passe
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="auth-input pr-10"
                        autoComplete="new-password"
                        required
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

                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className="block text-sm font-medium text-slate-700 mb-1.5"
                    >
                      Confirmer le mot de passe
                    </label>
                    <div className="relative">
                      <input
                        id="confirmPassword"
                        type={showConfirm ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="auth-input pr-10"
                        autoComplete="new-password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showConfirm ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !token}
                    className="w-full py-2.5 px-4 rounded-lg bg-royal-600 text-white text-sm font-medium hover:bg-royal-700 focus:outline-none focus:ring-2 focus:ring-royal-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
                  >
                    {loading
                      ? "Modification..."
                      : "Valider le nouveau mot de passe"}
                  </button>
                </form>
              )}
            </div>

            <p className="text-center text-sm text-slate-500 mt-6">
              <button
                type="button"
                onClick={() => navigate("/login", { replace: true })}
                className="text-royal-600 hover:text-royal-700 font-medium"
              >
                ← Retour à la connexion
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
