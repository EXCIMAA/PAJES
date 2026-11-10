// src/lib/storage.ts
import { supabase } from "./supabase";

// ============================================================
// ALLOWED FILE TYPES & SIZE LIMITS
// ============================================================
const ALLOWED_EXTENSIONS = [
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'txt', 'csv', 'rtf', 'odt', 'ods', 'odp',
  'jpg', 'jpeg', 'png', 'gif', 'webp',
  'zip', '7z',
];

const ALLOWED_MIME_PREFIXES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument',
  'application/vnd.ms-excel',
  'application/vnd.oasis.opendocument',
  'text/',
  'image/',
  'application/zip',
  'application/x-7z-compressed',
];

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) {
    return `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)} MB.`;
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
    return 'File type not allowed. Accepted: PDF, Office documents, images, text, archives.';
  }

  const mimeOk = ALLOWED_MIME_PREFIXES.some((prefix) =>
    file.type.startsWith(prefix)
  );
  if (file.type && !mimeOk) {
    return 'File type not allowed. Accepted: PDF, Office documents, images, text, archives.';
  }

  return null;
}

// ============================================================
// UPLOAD : Envoie un fichier et retourne son PATH (pas l'URL)
// ============================================================
export async function uploadDocument(
  file: File,
  folder: string = "general",
  bucket: string = "documents",
): Promise<{ path: string | null; error: string | null }> {
  const validationError = validateFile(file);
  if (validationError) {
    return { path: null, error: validationError };
  }

  try {
    const ext = file.name.split(".").pop();
    const fileName = `${crypto.randomUUID()}.${ext}`;
    const path = `${folder}/${fileName}`;

    const { error } = await supabase.storage.from(bucket).upload(path, file);
    if (error) throw error;

    return { path, error: null };
  } catch (err: any) {
    return { path: null, error: err.message };
  }
}

// ============================================================
// SIGNED URL : Génère un lien temporaire pour voir un fichier privé
// Gère les anciens URLs publiques ET les nouveaux paths
// ============================================================
export async function getSignedUrl(
  filePath: string,
  expiresInSeconds: number = 3600,
  bucket: string = "documents",
): Promise<string | null> {
  if (!filePath) return null;

  // ⭐ Si c'est une ancienne URL publique complète, on extrait juste le path
  let cleanPath = filePath;
  if (filePath.includes("/object/public/")) {
    // Ex: https://xxx.supabase.co/storage/v1/object/public/documents/dossiers/xxx.pdf
    // On veut : dossiers/xxx.pdf
    const parts = filePath.split("/object/public/");
    if (parts.length > 1) {
      // parts[1] = "documents/dossiers/xxx.pdf"
      // On enlève le nom du bucket
      cleanPath = parts[1].split("/").slice(1).join("/");
    }
  } else if (filePath.includes("/object/")) {
    // Autres cas (signed URL, etc.)
    const parts = filePath.split("/object/");
    if (parts.length > 1) {
      cleanPath = parts[1].split("/").slice(1).join("/");
    }
  }

  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(cleanPath, expiresInSeconds);

    if (error) throw error;
    return data?.signedUrl || null;
  } catch {
    return null;
  }
}

// ============================================================
// UPLOAD AVEC SIGNED URL (combiné, pratique pour les formulaires)
// ============================================================
export async function uploadAndGetUrl(
  file: File,
  folder: string = "general",
  bucket: string = "documents",
): Promise<{ path: string | null; signedUrl: string | null; error: string | null }> {
  const { path, error } = await uploadDocument(file, folder, bucket);
  if (error || !path) {
    return { path: null, signedUrl: null, error };
  }

  const signedUrl = await getSignedUrl(path, 3600, bucket);
  return { path, signedUrl, error: null };
}