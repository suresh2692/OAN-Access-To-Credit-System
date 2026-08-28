import { getClientIp } from '@/lib/clientIp';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

// Header and body sanitization for the two routes that relay traffic between
// the browser and the Frappe bench (`/api/proxy/*` and `/api/files/*`).
//
// Both directions are allowlisted rather than blocklisted. A blocklist has to
// enumerate every header that must not cross, and silently starts leaking the
// moment either side adds a new one; an allowlist fails closed instead.

// --- Request: browser -> backend ------------------------------------------

/**
 * Client headers that may reach the bench.
 *
 * Everything else is dropped, which notably includes the whole `x-forwarded-*`
 * / `forwarded` / `x-real-ip` family: Frappe reads the *leftmost*
 * `X-Forwarded-For` entry into `frappe.local.request_ip`, so relaying the
 * client's own value hands it control of the IP its rate limits, login-attempt
 * tracker and audit log all key on. We re-derive and set those headers below.
 *
 * `cookie` is absent deliberately — the browser's cookies are ours, not the
 * bench's, and the JWT is attached as an `Authorization` header instead.
 *
 * The range and conditional headers are the inbound half of pairs whose outbound
 * half is already relayed. Allowing `accept-ranges`/`content-range` back but
 * dropping `range` on the way in advertises resumable downloads and then serves
 * the whole file anyway, which breaks seek and resume on the large loan
 * documents this proxy exists to serve; the same applies to relaying `etag` and
 * `last-modified` while discarding the `if-*` headers that make them useful.
 */
const FORWARDED_REQUEST_HEADERS: ReadonlySet<string> = new Set([
  'accept',
  'accept-language',
  'content-type',
  'user-agent',
  'x-request-id',
  'range',
  'if-range',
  'if-none-match',
  'if-modified-since',
]);

/**
 * Builds the header set for the upstream request.
 *
 * `authToken` is injected server-side from the httpOnly cookie; the browser
 * never holds it and cannot influence it.
 */
export function buildUpstreamHeaders(request: Request, authToken?: string): Headers {
  const headers = new Headers();

  request.headers.forEach((value, key) => {
    if (FORWARDED_REQUEST_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  // Set — never append — so whatever the caller sent is replaced rather than
  // prepended to. `getClientIp` reads from the trusted end of the chain.
  headers.set('X-Forwarded-For', getClientIp(request));

  const url = new URL(request.url);
  headers.set('X-Forwarded-Proto', url.protocol.replace(':', ''));
  headers.set('X-Forwarded-Host', url.host);

  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  return headers;
}

// --- Response: backend -> browser -----------------------------------------

/**
 * Backend headers the browser is allowed to see.
 *
 * Two categories matter most among the ones this excludes:
 *
 *  - `set-cookie`. Frappe issues its own `sid`/`system_user` cookies on some
 *    paths. Relayed verbatim they land on our origin, where a backend-issued
 *    cookie could shadow or evict the httpOnly session cookies this app
 *    depends on. The bench session is irrelevant to a JWT client anyway.
 *  - Tech disclosure (`server`, `x-powered-by`, `x-frappe-*`), which advertises
 *    the stack and version to anyone reading a response.
 *
 * `content-encoding` and `content-length` are also excluded: the body is
 * decoded (and sometimes rewritten) on the way through, so relaying the
 * original values would describe a payload the browser is not receiving.
 *
 * `location` is absent here but is NOT dropped — it is handled separately in
 * `buildClientResponse`, which rewrites it to point back through this proxy.
 * Relaying it verbatim would publish the bench's URL; dropping it (which is what
 * this allowlist did on its own) leaves the browser a 3xx with nowhere to go.
 */
const FORWARDED_RESPONSE_HEADERS: ReadonlySet<string> = new Set([
  'content-type',
  'content-disposition',
  'content-language',
  'content-range',
  'accept-ranges',
  'cache-control',
  'expires',
  'last-modified',
  'etag',
  'vary',
  'retry-after',
]);

export function sanitizeResponseHeaders(source: Headers): Headers {
  const headers = new Headers();
  source.forEach((value, key) => {
    if (FORWARDED_RESPONSE_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });
  return headers;
}

/**
 * Rewrites an upstream `Location` so it points back through this proxy.
 *
 * Three cases, in order of how the browser would be harmed without this:
 *
 *  - Same-origin as the bench (absolute or relative): re-expressed as a path
 *    under `proxyPrefix`, so the redirect stays followable and the backend's
 *    hostname never reaches the browser.
 *  - Any other origin: dropped. The bench has no business redirecting our users
 *    off-site, and relaying it unchecked would make this route an open redirect
 *    for anything that can influence a backend response.
 *
 * Returns `null` when the header must not be relayed.
 */
export function rewriteLocation(location: string, proxyPrefix: string): string | null {
  const backend = new URL(env.API_BASE_URL);

  let target: URL;
  try {
    // A relative Location resolves against the backend, which is the origin that
    // issued it — matching how the browser would have resolved it upstream.
    target = new URL(location, backend);
  } catch {
    return null;
  }

  if (target.origin !== backend.origin) return null;

  // env.API_BASE_URL may itself carry a path prefix; strip it so the result is
  // `<proxyPrefix>/<same path the route would have built>`.
  const basePath = backend.pathname.replace(/\/+$/, '');
  const path =
    basePath && target.pathname.startsWith(basePath)
      ? target.pathname.slice(basePath.length)
      : target.pathname;

  return `${proxyPrefix}${path.startsWith('/') ? '' : '/'}${path}${target.search}${target.hash}`;
}

// --- Response body ---------------------------------------------------------

/**
 * Frappe debug fields that must not reach the browser.
 *
 * `_server_messages` and `exc` are the loud ones: on any unhandled exception
 * they carry the traceback — exception class, absolute file paths, line
 * numbers and, for a failed query, the SQL itself. That is a map of the
 * backend handed to whoever triggered the error.
 *
 * `exc_type` is kept on purpose. It is a bare class name with no path, query or
 * line number in it, and the app branches on it for legitimate UX (a
 * `DoesNotExistError` from farmer lookup renders "not found" rather than a
 * generic failure).
 */
const FRAPPE_DEBUG_FIELDS = ['_server_messages', '_debug_messages', 'exc', 'exception', 'traceback'] as const;

function isJsonContentType(contentType: string | null): boolean {
  return !!contentType && /\bapplication\/(json|.*\+json)\b/i.test(contentType);
}

/**
 * Cheap pre-check for whether a JSON body is worth parsing.
 *
 * Every one of the debug fields has to appear literally, as a quoted key, for
 * `stripDebugFields` to find anything — so a handful of substring scans decide
 * it without building an object graph. The overwhelming majority of responses
 * are clean, and those now skip both `JSON.parse` and the re-serialization.
 *
 * False positives are harmless (the string appears somewhere in a value, we
 * parse, nothing is stripped, `raw` is returned unchanged). False negatives are
 * impossible, which is the property that matters: if the key is there, the
 * substring is there.
 */
function mayContainDebugFields(raw: string): boolean {
  return FRAPPE_DEBUG_FIELDS.some((field) => raw.includes(`"${field}"`));
}

/**
 * Strips Frappe's debug fields from a JSON payload, logging what was removed so
 * the detail stays available to operators without being shipped to the browser.
 *
 * Returns the payload unchanged when there was nothing to strip, so the common
 * (successful) case re-serializes identically.
 */
function stripDebugFields(payload: unknown, targetUrl: string): { changed: boolean; payload: unknown } {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { changed: false, payload };
  }

  const record = payload as Record<string, unknown>;
  const removed: string[] = [];

  for (const field of FRAPPE_DEBUG_FIELDS) {
    if (field in record) {
      removed.push(field);
      delete record[field];
    }
  }

  if (removed.length === 0) return { changed: false, payload };

  logger.security(
    `Stripped Frappe debug field(s) [${removed.join(', ')}] from the response for ${targetUrl}`
  );
  return { changed: true, payload: record };
}

export interface BuildClientResponseOptions {
  /**
   * Route prefix a relayed `Location` should be rewritten onto (`/api/proxy`).
   *
   * Omit it for routes that follow redirects upstream (`/api/files` uses fetch's
   * default `redirect: 'follow'`, so no 3xx ever reaches here) — a `Location`
   * arriving without a prefix to rewrite onto is dropped and logged.
   */
  proxyPrefix?: string;
}

/**
 * Relays the upstream response to the browser with headers allowlisted and, for
 * JSON, debug fields removed.
 *
 * Only JSON is buffered. Anything else — file downloads above all — is streamed
 * straight through, so a large document never has to fit in memory. JSON cannot
 * be streamed and inspected at the same time, so it is read in full; what a
 * clean 2xx avoids is the parse and re-serialization, not the read.
 */
export async function buildClientResponse(
  response: Response,
  targetUrl: string,
  options: BuildClientResponseOptions = {}
): Promise<{ body: BodyInit | null; init: ResponseInit }> {
  const headers = sanitizeResponseHeaders(response.headers);

  // A route using `redirect: 'manual'` hands us the 3xx itself. Without this the
  // browser received the status with no Location and simply stopped.
  const location = response.headers.get('location');
  if (location) {
    const rewritten = options.proxyPrefix
      ? rewriteLocation(location, options.proxyPrefix)
      : null;

    if (rewritten) {
      headers.set('location', rewritten);
    } else {
      logger.security(
        `Dropped a Location header from ${targetUrl} that did not resolve to the backend origin`
      );
    }
  }

  const init: ResponseInit = {
    status: response.status,
    statusText: response.statusText,
    headers,
  };

  if (!isJsonContentType(response.headers.get('content-type'))) {
    return { body: response.body, init };
  }

  const raw = await response.text();
  if (!raw) return { body: raw, init };

  // Fast path: a successful response with no debug field in it is handed back as
  // the string it arrived as, with no parse and no re-serialization. This is
  // what almost every API call takes.
  //
  // Gated on `response.ok` deliberately. The parse below is not only there to
  // strip fields — an unparseable body claiming to be JSON is replaced wholesale
  // because that is what a bench stack-trace page looks like, and a substring
  // scan would not recognize one. Error responses therefore keep the full
  // treatment; only the successful ones skip it.
  if (response.ok && !mayContainDebugFields(raw)) return { body: raw, init };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Content-Type claimed JSON but the body is not parseable. Rather than
    // guess at its contents, replace it — an unparseable "JSON" response from
    // the bench is an error page, and error pages are what leak stack traces.
    logger.security(
      `Non-JSON body on a JSON response from ${targetUrl}; replaced with a generic error`
    );
    return {
      body: JSON.stringify({ message: 'The server returned an unexpected response.' }),
      init,
    };
  }

  const { changed, payload } = stripDebugFields(parsed, targetUrl);
  return { body: changed ? JSON.stringify(payload) : raw, init };
}
