// src/pages/PendingApprovalPage.tsx
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Hexagon, Clock, LogOut } from "lucide-react";

export function PendingApprovalPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  // ✅ Safe display name resolution (try multiple sources)
  const displayName =
    (user as any)?.full_name ||
    (user as any)?.user_metadata?.full_name ||
    (user as any)?.user_metadata?.first_name ||
    user?.email ||
    "utilisateur";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-6">
          <Clock className="w-8 h-8 text-amber-400" />
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">
          Compte en attente de validation
        </h1>

        <p className="text-slate-400 text-sm mb-6">
          Bonjour {displayName},
          <br />
          <br />
          Votre compte a bien été créé, mais aucun rôle ne vous a encore été
          attribué. Un administrateur doit valider votre accès avant que vous
          puissiez utiliser PAJES.
        </p>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 mb-6 text-left">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">
            Que faire ?
          </p>
          <ul className="text-sm text-slate-400 space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="text-amber-400 mt-0.5">•</span>
              Contactez votre administrateur PAJES
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-400 mt-0.5">•</span>
              Demandez-lui d'attribuer un rôle à votre compte
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-400 mt-0.5">•</span>
              Reconnectez-vous une fois le rôle attribué
            </li>
          </ul>
        </div>

        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Se déconnecter
        </button>

        <div className="flex items-center justify-center gap-2 mt-8 text-slate-600">
          <Hexagon className="w-4 h-4" />
          <span className="text-xs">PAJES — Gestion d'entreprise</span>
        </div>
      </div>
    </div>
  );
}
