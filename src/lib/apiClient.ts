// src/lib/apiClient.ts
// Centralized API client — all frontend database access goes through
// FastAPI endpoints (no direct Supabase access).
import { api } from "./api";

export type TableRow = Record<string, unknown>;
export type TableListResponse = TableRow[];

// ── Generic table CRUD (replaces supabase.from(table)) ──────────────────

export const dbApi = {
  list<T = TableRow>(
    table: string,
    options?: {
      limit?: number;
      offset?: number;
      orderBy?: string;
      orderAsc?: boolean;
      filters?: Record<string, string>;
    },
  ) {
    const params = new URLSearchParams();
    if (options?.limit) params.set("limit", String(options.limit));
    if (options?.offset) params.set("offset", String(options.offset));
    if (options?.orderBy) params.set("orderBy", options.orderBy);
    params.set("orderAsc", String(options?.orderAsc ?? true));
    Object.entries(options?.filters ?? {}).forEach(([k, v]) =>
      params.set(k, v),
    );
    const qs = params.toString();
    return api.get<TableListResponse>(
      `/db/tables/${table}${qs ? `?${qs}` : ""}`,
    ) as Promise<T[]>;
  },

  get<T = TableRow>(table: string, id: string) {
    return api.get<T>(`/db/tables/${table}/${id}`);
  },

  create<T = TableRow>(table: string, body: Record<string, unknown>) {
    return api.post<T>(`/db/tables/${table}`, body);
  },

  update<T = TableRow>(table: string, id: string, body: Record<string, unknown>) {
    return api.put<T>(`/db/tables/${table}/${id}`, body);
  },

  remove(table: string, id: string) {
    return api.delete<void>(`/db/tables/${table}/${id}`);
  },

  upsert<T = TableRow>(table: string, body: Record<string, unknown>) {
    return api.post<T>(`/db/tables/${table}/upsert`, body);
  },
};

// ── File storage (replaces supabase.storage) ────────────────────────────

export interface FileInfo {
  id: string;
  original_name: string;
  storage_path: string;
  bucket: string;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_by: string | null;
  is_public: boolean;
  created_at: string | null;
}

export interface FileUploadResult {
  id: string;
  original_name: string;
  storage_path: string;
  bucket: string;
  mime_type: string | null;
  size_bytes: number | null;
  download_url: string;
}

export const fileApi = {
  upload(
    file: File,
    options?: { bucket?: string; folder?: string },
  ) {
    const formData = new FormData();
    formData.append("file", file);
    if (options?.bucket) formData.append("bucket", options.bucket);
    if (options?.folder) formData.append("folder", options.folder);
    return api.post<FileUploadResult>("/files/upload", formData);
  },

  list(options?: { bucket?: string; limit?: number; offset?: number }) {
    const params = new URLSearchParams();
    if (options?.bucket) params.set("bucket", options.bucket);
    if (options?.limit) params.set("limit", String(options.limit));
    if (options?.offset) params.set("offset", String(options.offset));
    const qs = params.toString();
    return api.get<{ files: FileInfo[]; total: number }>(
      `/files${qs ? `?${qs}` : ""}`,
    );
  },

  download(fileId: string) {
    return `/api/v1/files/${fileId}/download`;
  },

  remove(fileId: string) {
    return api.delete<void>(`/files/${fileId}`);
  },
};

// ── Auth (already migrated to FastAPI) ──────────────────────────────────

export { authApi } from "../api/auth";

// ── Permissions ─────────────────────────────────────────────────────────

export const permissionsApi = {
  myPermissions() {
    return api.get<{ role: string | null; permissions: Record<string, unknown> }>(
      "/permissions/me",
    );
  },
  matrix() {
    return api.get<{ matrix: Record<string, unknown>; roles: string[]; modules: string[] }>(
      "/permissions/matrix",
    );
  },
  roles() {
    return api.get<string[]>("/permissions/roles");
  },
  modules() {
    return api.get<string[]>("/permissions/modules");
  },
  role(role: string) {
    return api.get<{ role: string; permissions: Record<string, unknown> }>(
      `/permissions/role/${role}`,
    );
  },
};

// ── Health ──────────────────────────────────────────────────────────────

export const healthApi = {
  ready() {
    return api.get<{ status: string; db: { ok: boolean; detail: string } }>(
      "/health/ready",
    );
  },
};
