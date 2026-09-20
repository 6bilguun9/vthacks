/** Accept browser keys only; a service-role JWT must never initialize a browser client. */
export function validPublicSupabaseConfig(url: string, key: string): boolean {
  try {
    const parsed = new URL(url);
    if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') return false;
    if (key.startsWith("sb_publishable_") && key.length > 20) return true;
    const payload = key.split(".")[1];
    if (!payload) return false;
    const claims = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as { role?: unknown };
    return claims.role === "anon";
  } catch { return false; }
}
