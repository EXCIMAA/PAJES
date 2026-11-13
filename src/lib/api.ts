export const API_UNAUTHORIZED_EVENT = "pajes:api-unauthorized";

const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000/api/v1";
const API_BASE_URL = normalizeApiBase(
  import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL,
);
const API_REQUEST_TIMEOUT_MS = 15_000;
const CSRF_HEADER_NAME = "X-CSRF-Token";
const CSRF_BOOTSTRAP_PATH = "/health";
const UNAUTHORIZED_NOTIFICATION_EXEMPT_PATHS = new Set([
  "/auth/me",
  "/auth/login",
  "/auth/signup",
  "/auth/activate",
  "/auth/reset-password",
  "/auth/reset-password/confirm",
]);

let csrfToken: string | null = null;
let csrfBootstrapPromise: Promise<void> | null = null;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly detail?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class ApiNetworkError extends Error {
  constructor(
    message: string,
    readonly method: string,
    readonly path: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ApiNetworkError";
  }
}

export class ApiTimeoutError extends ApiNetworkError {
  constructor(method: string, path: string) {
    super(
      `Le serveur PAJES n'a pas répondu à temps (${method} ${path}).`,
      method,
      path,
    );
    this.name = "ApiTimeoutError";
  }
}

type ApiRequestOptions = Omit<RequestInit, "body" | "method"> & {
  body?: unknown;
};

function normalizeApiBase(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("VITE_API_BASE_URL doit être une URL absolue valide.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("VITE_API_BASE_URL doit utiliser HTTP ou HTTPS.");
  }
  if (url.search || url.hash) {
    throw new Error("VITE_API_BASE_URL ne doit pas contenir query ou fragment.");
  }
  url.pathname = url.pathname.replace(/\/{2,}/g, "/").replace(/\/+$/, "");
  return url;
}

function normalizedRequestPath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed || trimmed.includes("://")) {
    throw new Error("Les routes API doivent être des chemins relatifs.");
  }
  const [pathname] = trimmed.split(/[?#]/, 1);
  return `/${pathname.replace(/^\/+|\/+$/g, "").replace(/\/{2,}/g, "/")}`;
}

function requestUrl(path: string): URL {
  const url = new URL(API_BASE_URL);
  const normalizedPath = normalizedRequestPath(path);
  const basePath = url.pathname.replace(/\/+$/, "");
  const routePath =
    normalizedPath === basePath || normalizedPath.startsWith(`${basePath}/`)
      ? normalizedPath
      : `${basePath}${normalizedPath}`;
  const queryStart = path.indexOf("?");
  const hashStart = path.indexOf("#");
  const suffixStart =
    queryStart < 0
      ? hashStart
      : hashStart < 0
        ? queryStart
        : Math.min(queryStart, hashStart);
  url.pathname = routePath.replace(/\/{2,}/g, "/");
  if (suffixStart >= 0) {
    const suffix = path.slice(suffixStart);
    if (suffix.startsWith("?")) {
      const [query] = suffix.split("#", 1);
      url.search = query;
    }
  }
  return url;
}

function endpointPath(url: URL): string {
  const basePath = API_BASE_URL.pathname.replace(/\/+$/, "");
  const path = url.pathname.startsWith(`${basePath}/`)
    ? url.pathname.slice(basePath.length)
    : url.pathname;
  return path || "/";
}

function errorMessage(status: number, detail: unknown): string {
  const statusMessages: Record<number, string> = {
    401: "Votre session a expiré. Veuillez vous reconnecter.",
    403: "Vous n'êtes pas autorisé à effectuer cette action.",
    404: "La ressource demandée est introuvable.",
    422: "Les données envoyées sont invalides.",
    429: "Trop de tentatives. Veuillez patienter avant de réessayer.",
    500: "Une erreur interne est survenue. Veuillez réessayer.",
    503: "Le service d'authentification est temporairement indisponible.",
  };
  if ([429, 500, 503].includes(status)) return statusMessages[status];

  if (typeof detail === "string" && detail.trim()) return detail;

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (typeof item === "object" && item !== null && "msg" in item) {
          return String(item.msg);
        }
        return "";
      })
      .filter(Boolean);
    if (messages.length) return messages.join(". ");
  }

  return statusMessages[status] ?? `La requête a échoué (${status}).`;
}

async function readResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const text = await response.text();
  if (!text) return undefined;

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  }
  return text;
}

function responseDetail(body: unknown): unknown {
  if (typeof body !== "object" || body === null || !("detail" in body)) {
    return undefined;
  }
  return body.detail;
}

function shouldNotifyUnauthorized(path: string): boolean {
  return !UNAUTHORIZED_NOTIFICATION_EXEMPT_PATHS.has(path);
}

function networkError(method: string, url: URL, cause: unknown): ApiNetworkError {
  const path = `${url.pathname}${url.search}`;
  return new ApiNetworkError(
    `Impossible de joindre le serveur PAJES (${method} ${url.pathname}). Vérifiez l'API et VITE_API_BASE_URL.`,
    method,
    path,
    cause,
  );
}

async function performRequest(
  method: string,
  url: URL,
  init: RequestInit,
  sourceSignal?: AbortSignal | null,
): Promise<{ response: Response; body: unknown }> {
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, API_REQUEST_TIMEOUT_MS);
  const forwardAbort = () => controller.abort(sourceSignal?.reason);
  if (sourceSignal?.aborted) forwardAbort();
  else sourceSignal?.addEventListener("abort", forwardAbort, { once: true });

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    return { response, body: await readResponseBody(response) };
  } catch (error) {
    if (sourceSignal?.aborted) throw error;
    if (timedOut) throw new ApiTimeoutError(method, endpointPath(url));
    // A fetch rejection after a response was received (e.g. a CORS-exposed
    // body read failure) means the server was reachable; do not misreport it
    // as a network outage.
    throw networkError(method, url, error);
  } finally {
    clearTimeout(timeout);
    sourceSignal?.removeEventListener("abort", forwardAbort);
  }
}

async function bootstrapCsrfToken(): Promise<void> {
  if (csrfToken) return;
  if (csrfBootstrapPromise) return csrfBootstrapPromise;

  csrfBootstrapPromise = (async () => {
    const url = requestUrl(CSRF_BOOTSTRAP_PATH);
    const { response, body } = await performRequest(
      "GET",
      url,
      { method: "GET", credentials: "include" },
    );

    csrfToken = response.headers.get(CSRF_HEADER_NAME);
    if (!response.ok || !csrfToken) {
      throw new ApiError(
        errorMessage(response.status, responseDetail(body)),
        response.status,
        responseDetail(body),
      );
    }
  })();

  try {
    await csrfBootstrapPromise;
  } finally {
    csrfBootstrapPromise = null;
  }
}

async function request<T>(
  method: string,
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const url = requestUrl(path);
  const normalizedPath = endpointPath(url);
  const headers = new Headers(options.headers);
  const body = options.body;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  if (body !== undefined && !isFormData && typeof body !== "string") {
    headers.set("Content-Type", "application/json");
  }

  if (
    ["POST", "PUT", "PATCH", "DELETE"].includes(method)
  ) {
    await bootstrapCsrfToken();
    headers.set(CSRF_HEADER_NAME, csrfToken!);
  }

  const { response, body: responseBody } = await performRequest(
    method,
    url,
    {
      ...options,
      method,
      headers,
      credentials: "include",
      body:
        body === undefined
          ? undefined
          : isFormData || typeof body === "string"
            ? body
            : JSON.stringify(body),
    },
    options.signal,
  );

  const returnedCsrfToken = response.headers.get(CSRF_HEADER_NAME);
  if (returnedCsrfToken) csrfToken = returnedCsrfToken;

  if (!response.ok) {
    const detail = responseDetail(responseBody);
    if (response.status === 401 && shouldNotifyUnauthorized(normalizedPath)) {
      window.dispatchEvent(new CustomEvent(API_UNAUTHORIZED_EVENT));
    }
    throw new ApiError(
      errorMessage(response.status, detail),
      response.status,
      detail,
    );
  }

  return responseBody as T;
}

export const api = {
  get<T>(path: string, options?: Omit<ApiRequestOptions, "body">) {
    return request<T>("GET", path, options);
  },
  post<T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, "body">) {
    return request<T>("POST", path, { ...options, body });
  },
  put<T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, "body">) {
    return request<T>("PUT", path, { ...options, body });
  },
  patch<T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, "body">) {
    return request<T>("PATCH", path, { ...options, body });
  },
  delete<T>(path: string, options?: Omit<ApiRequestOptions, "body">) {
    return request<T>("DELETE", path, options);
  },
};
