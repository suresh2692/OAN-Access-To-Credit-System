import { NextResponse } from 'next/server';

// Same-origin CSRF guard for state-changing API routes.
//
// Browsers always attach an `Origin` header to cross-site requests and to
// state-changing same-origin requests (POST/PUT/PATCH/DELETE). A forged
// cross-site request therefore carries the attacker's origin, which will not
// match our host and is rejected. Requests with no `Origin` header cannot be
// forged cross-site by a browser fetch/XHR, so they are allowed (this keeps
// non-browser/server-to-server clients working).
//
// `Sec-Fetch-Site` is checked as a second, independent signal. It is set by the
// browser itself and cannot be written by page script, so it still rejects a
// cross-site request in the corner cases where `Origin` is absent or stripped
// by an intermediary. Requests without it (older browsers, server-to-server)
// fall through to the Origin check unchanged.
//
// Returns a 403 NextResponse when the request must be blocked, otherwise null.
export function checkCsrf(request: Request): NextResponse | null {
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') {
    return NextResponse.json({ message: 'Cross-origin request blocked' }, { status: 403 });
  }

  const origin = request.headers.get('origin');
  if (!origin) return null;

  const host = request.headers.get('host');

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return NextResponse.json({ message: 'Invalid Origin header' }, { status: 403 });
  }

  if (!host || originHost !== host) {
    return NextResponse.json({ message: 'Cross-origin request blocked' }, { status: 403 });
  }

  return null;
}
