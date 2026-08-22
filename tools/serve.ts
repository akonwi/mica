#!/usr/bin/env bun

import { dirname, resolve, sep } from "node:path";

const ROOT = dirname(import.meta.dir);
const port = Number(Bun.env.PORT ?? 8471);
const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, must-revalidate",
  Expires: "0",
};

function respond(body: BodyInit | null, status = 200): Response {
  return new Response(body, { status, headers: NO_CACHE_HEADERS });
}

const server = Bun.serve({
  hostname: "0.0.0.0",
  port,
  async fetch(request) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return respond("method not allowed", 405);
    }

    let pathname: string;
    try {
      pathname = decodeURIComponent(new URL(request.url).pathname);
    } catch {
      return respond("bad request", 400);
    }
    if (pathname === "/mica" || pathname.startsWith("/mica/")) {
      pathname = pathname.slice(5) || "/";
    }
    if (pathname === "/") pathname = "/index.html";
    if (pathname.endsWith("/")) return respond("not found", 404);

    const path = resolve(ROOT, `.${pathname}`);
    if (path !== ROOT && !path.startsWith(`${ROOT}${sep}`)) {
      return respond("forbidden", 403);
    }
    const file = Bun.file(path);
    if (!(await file.exists())) return respond("not found", 404);

    return new Response(file, { headers: NO_CACHE_HEADERS });
  },
});

console.log(`mica docs listening on http://localhost:${server.port}`);
