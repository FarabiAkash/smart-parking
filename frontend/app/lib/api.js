const API_BASE = typeof window !== "undefined" ? "http://127.0.0.1:8000" : "http://127.0.0.1:8000";

export function apiUrl(path) {
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function fetchJson(path, options = {}) {
  const res = await fetch(apiUrl(path), { ...options, headers: { "Content-Type": "application/json", ...options.headers } });
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  return res.json();
}

export async function fetchBlob(path, options = {}) {
  const res = await fetch(apiUrl(path), options);
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  return res.blob();
}
