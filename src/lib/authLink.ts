export function getAuthLinkToken(): string {
  const url = new URL(window.location.href);
  return (
    url.searchParams.get("token") ??
    new URLSearchParams(url.hash.replace(/^#/, "")).get("token") ??
    ""
  );
}

export function clearAuthLinkToken(): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("token") && !url.hash) return;
  url.searchParams.delete("token");
  url.hash = "";
  window.history.replaceState(
    window.history.state,
    "",
    `${url.pathname}${url.search}`,
  );
}
