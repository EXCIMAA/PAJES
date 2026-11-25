// src/components/DocumentLink.tsx
import { useEffect, useState } from "react";
import { FileText } from "lucide-react";

interface DocumentLinkProps {
  filePath: string;
  bucket?: string;
  label?: string;
  className?: string;
  /** Afficher une icône ? */
  showIcon?: boolean;
  /** File ID for FastAPI download endpoint */
  fileId?: string;
}

export function DocumentLink({
  filePath,
  bucket = "documents",
  label = "Voir le document",
  className = "",
  showIcon = true,
  fileId,
}: DocumentLinkProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      try {
        // Use FastAPI download endpoint if fileId is available
        if (fileId) {
          if (isMounted) {
            setUrl(`/api/v1/files/${fileId}/download`);
            setLoading(false);
          }
          return;
        }
        // Fallback: construct URL from storage path
        const resolvedPath = filePath.startsWith("/")
          ? filePath
          : `/api/v1/files/download?path=${encodeURIComponent(filePath)}`;
        if (isMounted) {
          setUrl(resolvedPath);
          setLoading(false);
        }
      } catch {
        if (isMounted) {
          setUrl(null);
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [filePath, bucket, fileId]);

  if (loading) {
    return <span className="text-slate-400 text-xs">Chargement...</span>;
  }

  if (!url) {
    return (
      <span className="text-error-500 text-xs flex items-center gap-1">
        {showIcon && <FileText className="w-3 h-3" />}
        Document introuvable
      </span>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`text-primary-500 hover:text-primary-600 text-xs flex items-center gap-1 ${className}`}
    >
      {showIcon && <FileText className="w-3 h-3" />}
      {label}
    </a>
  );
}
