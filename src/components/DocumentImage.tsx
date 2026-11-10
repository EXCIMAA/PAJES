// src/components/DocumentImage.tsx
import { useEffect, useState } from "react";
import { getSignedUrl } from "../lib/storage";

interface DocumentImageProps {
  filePath: string;
  bucket?: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  fallback?: React.ReactNode;
}

/**
 * Affiche une image depuis un bucket privé Supabase
 * en générant automatiquement une Signed URL (valide 1h).
 */
export function DocumentImage({
  filePath,
  bucket = "documents",
  alt = "Image",
  className = "",
  style,
  fallback = null,
}: DocumentImageProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (!filePath) {
        setLoading(false);
        setError(true);
        return;
      }

      // Si c'est déjà une URL valide (http/https), on l'utilise directement
      if (
        filePath.startsWith("http://") ||
        filePath.startsWith("https://") ||
        filePath.startsWith("data:")
      ) {
        if (isMounted) {
          setSignedUrl(filePath);
          setLoading(false);
        }
        return;
      }

      // Sinon, générer une Signed URL
      const url = await getSignedUrl(filePath, 3600, bucket);
      if (isMounted) {
        setSignedUrl(url);
        setError(!url);
        setLoading(false);
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [filePath, bucket]);

  if (loading) {
    return (
      <div
        className={className}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...style,
        }}
      >
        <i className="fas fa-spinner fa-spin" style={{ color: "#475569" }}></i>
      </div>
    );
  }

  if (error || !signedUrl) {
    return <>{fallback}</>;
  }

  return (
    <img
      src={signedUrl}
      alt={alt}
      className={className}
      style={style}
      onError={() => setError(true)}
    />
  );
}
