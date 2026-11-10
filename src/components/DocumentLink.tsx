// src/components/DocumentLink.tsx
import { useEffect, useState } from "react";
import { getSignedUrl } from "../lib/storage";
import { FileText } from "lucide-react";

interface DocumentLinkProps {
  filePath: string;
  bucket?: string;
  label?: string;
  className?: string;
  /** Afficher une icône ? */
  showIcon?: boolean;
}

export function DocumentLink({
  filePath,
  bucket = "documents",
  label = "Voir le document",
  className = "",
  showIcon = true,
}: DocumentLinkProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      const url = await getSignedUrl(filePath, 3600, bucket);
      if (isMounted) {
        setSignedUrl(url);
        setLoading(false);
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [filePath, bucket]);

  if (loading) {
    return <span className="text-slate-400 text-xs">Chargement...</span>;
  }

  if (!signedUrl) {
    return (
      <span className="text-error-500 text-xs flex items-center gap-1">
        {showIcon && <FileText className="w-3 h-3" />}
        Document introuvable
      </span>
    );
  }

  return (
    <a
      href={signedUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`text-primary-500 hover:text-primary-600 text-xs flex items-center gap-1 ${className}`}
    >
      {showIcon && <FileText className="w-3 h-3" />}
      {label}
    </a>
  );
}
