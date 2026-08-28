# Security Headers & Iframe Configuration

## X-Frame-Options

When rendering internal documents (like PDFs from an API route) inside an `<iframe>` or `<object>` tag, global Next.js security headers can inadvertently block the content.

- **`DENY`**: Completely disables framing the page, even by your own application. Browsers will refuse to render the iframe and throw a console error (`Refused to display... in a frame because it set 'X-Frame-Options' to 'deny'`), even if the network request returns `200 OK`.
- **`SAMEORIGIN`**: Allows framing, but **only** if the iframe is hosted on the exact same origin (e.g., `localhost:3000` or `app.com`). This is the correct configuration for internal previews while maintaining protection against clickjacking from external sites.

## Content Security Policy (CSP)

A modern, robust alternative (or addition) to `X-Frame-Options` is the `frame-ancestors` directive in the Content Security Policy:

```http
Content-Security-Policy: frame-ancestors 'self';
```

This achieves the exact same protection as `SAMEORIGIN` and is the standard supported by modern browsers.

### Quick Fix Reference (Next.js)

If internal PDFs or frames are failing to render, check `next.config.mjs` (or your middleware):

```javascript
// next.config.mjs
{ key: 'X-Frame-Options', value: 'SAMEORIGIN' }
```

## Architecture / Tech Debt Notes

### PDF Generation Implementation
- **Current State (MVP):** `Step4Success.tsx` implements the "Download PDF" functionality using a basic client-side `window.print()` trigger. This requires users to manually select "Save as PDF" in their browser print dialog.
- **Why this was chosen:** Avoids the massive bundle size bloat and performance lag of client-side libraries (like `jspdf` or `html2canvas`). 
- **Future Action Item (Issue):** Move PDF generation to the Frappe backend. We should create a dedicated API endpoint (e.g., `loanService.downloadApplicationPdf(applicationId)`) that returns a generated PDF file using `wkhtmltopdf` or WeasyPrint. This ensures consistent formatting, auditability, and a seamless 1-click download experience for users without blocking the browser's main thread.
