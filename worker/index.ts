/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

/**
 * App documents and React Server Component payloads must never survive a
 * deployment in the browser cache. A stale document/RSC response can point at
 * chunks from the previous build and leave Safari with a blank screen.
 *
 * Fingerprinted /_next/static/* assets are intentionally NOT changed here:
 * vinext serves those as immutable build assets and they are safe to cache.
 */
function isDocumentOrRscRequest(request: Request, url: URL) {
  const accept = request.headers.get("accept") ?? "";
  const destination = request.headers.get("sec-fetch-dest") ?? "";

  return (
    destination === "document" ||
    accept.includes("text/html") ||
    accept.includes("text/x-component") ||
    url.pathname.endsWith(".rsc") ||
    url.searchParams.has("_rsc")
  );
}

function withoutCacheValidators(request: Request) {
  const headers = new Headers(request.headers);
  headers.delete("if-none-match");
  headers.delete("if-modified-since");

  return new Request(request, { headers });
}

function withNoStore(response: Response) {
  const headers = new Headers(response.headers);

  // Browser cache / Safari page cache.
  headers.set("Cache-Control", "private, no-store, max-age=0");
  headers.set("Pragma", "no-cache");
  headers.set("Expires", "0");

  // Keep dynamic responses out of Cloudflare/CDN caches as well.
  headers.set("CDN-Cache-Control", "no-store");
  headers.set("Cloudflare-CDN-Cache-Control", "no-store");

  // A dynamic response should not be validated against a representation from
  // an older deployment.
  headers.delete("ETag");
  headers.delete("Last-Modified");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    const pageOrRsc = isDocumentOrRscRequest(request, url);
    const dynamicApi = url.pathname.startsWith("/api/");

    // Do not let a conditional request reuse a document/RSC representation
    // from a previous deployment. Static build assets keep their normal
    // immutable caching path.
    const appRequest = pageOrRsc && (request.method === "GET" || request.method === "HEAD")
      ? withoutCacheValidators(request)
      : request;

    const response = await handler.fetch(appRequest, env, ctx);
    const contentType = response.headers.get("content-type") ?? "";
    const dynamicResponse =
      pageOrRsc ||
      dynamicApi ||
      contentType.includes("text/html") ||
      contentType.includes("text/x-component");

    return dynamicResponse ? withNoStore(response) : response;
  },
};

export default worker;
