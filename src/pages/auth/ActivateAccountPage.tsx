import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Hexagon, Lock } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { clearAuthLinkToken, getAuthLinkToken } from "../../lib/authLink";

export function ActivateAccountPage() {
  const navigate = useNavigate();
  const [token] = useState(getAuthLinkToken);
  const { activateAccount } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    clearAuthLinkToken();
    if (token) {
      return;
    } else {
      setError("Lien d'activation invalide ou expiré.");
    }
  }, [token]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
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
      const result = await activateAccount(token, password);
      if (result.error) {
        setError(result.error);
      } else {
        setActivated(true);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-lg">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-royal-100">
            {activated ? (
              <Hexagon className="h-5 w-5 text-royal-600" />
            ) : (
              <Lock className="h-5 w-5 text-royal-600" />
            )}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              {activated ? "Compte activé" : "Activer votre compte"}
            </h1>
            <p className="text-sm text-slate-500">PAJES</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        {activated ? (
          <div>
            <p className="mb-6 text-sm text-slate-600">
              Votre mot de passe est enregistré. Connectez-vous pour continuer.
            </p>
            <button
              type="button"
              onClick={() => navigate("/login", { replace: true })}
              className="w-full rounded-lg bg-royal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-royal-700"
            >
              Aller à la connexion
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="activation-password"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Nouveau mot de passe
              </label>
              <input
                id="activation-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="auth-input"
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                required
                disabled={!token || loading}
              />
            </div>
            <div>
              <label
                htmlFor="activation-confirm"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Confirmer le mot de passe
              </label>
              <input
                id="activation-confirm"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="auth-input"
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                required
                disabled={!token || loading}
              />
            </div>
            <button
              type="submit"
              disabled={!token || loading}
              className="w-full rounded-lg bg-royal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-royal-700 disabled:opacity-50"
            >
              {loading ? "Activation..." : "Définir le mot de passe"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default ActivateAccountPage;
