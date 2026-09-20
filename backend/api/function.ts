import { createApp } from "../src/create-app.js";
import { readConfig } from "../src/config/env.js";

const app = createApp(readConfig());

function responseHeaders(source: Record<string, string | number | string[] | undefined>) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(source)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) headers.append(name, item);
      continue;
    }
    headers.set(name, String(value));
  }
  return headers;
}

function requestTarget(url: URL) {
  const rewrittenPath = url.searchParams.get("__vercel_path");
  if (rewrittenPath === null) return `${url.pathname}${url.search}`;

  url.searchParams.delete("__vercel_path");
  const path = rewrittenPath.replace(/^\/+/, "");
  const query = url.searchParams.toString();
  return `/api/v1/${path}${query ? `?${query}` : ""}`;
}

export default {
  async fetch(request: Request) {
    await app.ready();
    const url = new URL(request.url);
    const payload = request.method === "GET" || request.method === "HEAD"
      ? undefined
      : Buffer.from(await request.arrayBuffer());
    const injection = {
      method: request.method as "GET" | "HEAD" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS",
      url: requestTarget(url),
      headers: Object.fromEntries(request.headers.entries()),
      remoteAddress: request.headers.get("x-vercel-forwarded-for")
        ?? request.headers.get("x-forwarded-for")
        ?? "127.0.0.1",
    };
    const response = payload === undefined
      ? await app.inject(injection)
      : await app.inject({ ...injection, payload });

    const hasBody = request.method !== "HEAD" && ![101, 204, 205, 304].includes(response.statusCode);
    return new Response(hasBody ? response.body : null, {
      status: response.statusCode,
      headers: responseHeaders(response.headers),
    });
  },
};
