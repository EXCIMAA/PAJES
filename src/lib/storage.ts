// src/lib/storage.ts
// File storage utilities — now uses FastAPI backend instead of Supabase Storage.
import { fileApi } from "./apiClient";

const ALLOWED_EXTENSIONS = [
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
  "txt", "csv", "rtf", "odt", "ods", "odp",
  "jpg", "jpeg", "png", "gif", "webp",
  "zip", "7z",
];

const ALLOWED_MIME_PREFIXES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument",
  "application/vnd.ms-excel",
  "application/vnd.oasis.opendocument",
  "text/",
  "image/",
  "application/zip",
  "application/x-7z-compressed",
];

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) {
    return `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)} MB.`;
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
    return "File type not allowed. Accepted: PDF, Office documents, images, text, archives.";
  }

  const mimeOk = ALLOWED_MIME_PREFIXES.some((prefix) =>
    file.type.startsWith(prefix)
  );
  if (file.type && !mimeOk) {
    return "File type not allowed. Accepted: PDF, Office documents, images, text, archives.";
  }

  return null;
}

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
    const result = await fileApi.upload(file, { bucket, folder });
    return { path: result.storage_path, error: null };
  } catch (err: any) {
    return { path: null, error: err.message };
  }
}

export async function getSignedUrl(
  filePath: string,
  _expiresInSeconds: number = 3600,
  _bucket: string = "documents",
): Promise<string | null> {
  if (!filePath) return null;

  // Clean legacy Supabase public URLs if present
  let cleanPath = filePath;
  if (filePath.includes("/object/public/")) {
    const parts = filePath.split("/object/public/");
    if (parts.length > 1) {
      cleanPath = parts[1].split("/").slice(1).join("/");
    }
  } else if (filePath.includes("/object/")) {
    const parts = filePath.split("/object/");
    if (parts.length > 1) {
      cleanPath = parts[1].split("/").slice(1).join("/");
    }
  }

  // Return FastAPI download URL — the backend serves the file directly
  return `/api/v1/files/download?path=${encodeURIComponent(cleanPath)}`;
}

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
