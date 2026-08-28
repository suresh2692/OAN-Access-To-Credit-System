const isProduction = process.env.NODE_ENV === 'production';

// Central logging surface. Routing all logs through here gives a single place
// to later forward to an observability platform (Sentry/Datadog) and to redact
// PII before it is emitted — important for a financial app. Errors are always
// emitted (production included) so failures are never silently lost; debug/info
// and warning noise is suppressed in production.
export const logger = {
  warn(message: string, ...optionalParams: unknown[]): void {
    if (!isProduction) {
      console.warn(message, ...optionalParams);
    }
  },
  error(message: string, ...optionalParams: unknown[]): void {
    console.error(message, ...optionalParams);
    // TODO: forward to production error reporting (e.g. Sentry/Datadog) here.
  },
  /**
   * Security-relevant events: rejected sign-ins, rate limits tripped, refused
   * token refreshes, backend detail withheld from a response.
   *
   * Always emitted, production included. These are deliberately NOT `warn`:
   * warnings are suppressed in production, and the whole point of these lines is
   * that the detail we refuse to show the browser is still available to whoever
   * is investigating. Losing them in the one environment that matters would make
   * the generic error messages a blind spot rather than a safeguard.
   */
  security(message: string, ...optionalParams: unknown[]): void {
    console.warn(`[security] ${message}`, ...optionalParams);
    // TODO: forward to the audit/SIEM sink alongside error reporting.
  },
  log(message: string, ...optionalParams: unknown[]): void {
    if (!isProduction) {
      console.log(message, ...optionalParams);
    }
  }
};
