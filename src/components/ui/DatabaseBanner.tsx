import { AlertCircle, RefreshCw } from 'lucide-react';
import { useDatabase } from '../../contexts/DatabaseContext';

export function DatabaseBanner() {
  const { connected, checking, error, recheck } = useDatabase();

  if (checking || connected) return null;

  return (
    <div className="bg-error-500/10 border-b border-error-500/25 px-4 py-2 flex items-center justify-center gap-3 text-sm text-error-500">
      <AlertCircle className="w-4 h-4 shrink-0" />
      <span>
        Connexion à la base de données impossible
        {error ? ` : ${error}` : ''}
      </span>
      <button
        onClick={recheck}
        className="inline-flex items-center gap-1 text-xs font-medium hover:text-error-600 transition-colors"
      >
        <RefreshCw className="w-3 h-3" />
        Réessayer
      </button>
    </div>
  );
}
