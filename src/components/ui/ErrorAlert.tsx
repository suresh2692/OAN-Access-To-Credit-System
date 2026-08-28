import { AlertCircle } from 'lucide-react';

/**
 * The red banner a form shows when the whole submission failed.
 *
 * Six files had grown their own copy of this div — same red-50 fill and red-200
 * border every time, but three paddings, two radii, three text sizes, and
 * `role="alert"` on exactly one of them. The odd one out was the accessible one:
 * without the role, a screen reader announces nothing when the banner appears,
 * so the only signal that a sign-in failed was a colour the user could not see.
 * Centralising it makes that the default rather than the exception.
 *
 * Field-level messages are not this component — those belong next to the input
 * they are about, and `extractFieldErrors` in `lib/api/fetchApi` pulls them out
 * of the envelope for exactly that.
 */
export interface ErrorAlertProps {
  children: React.ReactNode;
  /**
   * Drop the icon where the surrounding layout already signals the error state
   * (a field list that is entirely red, say). The role is announced either way.
   */
  icon?: boolean;
  /** Spacing and width, which is the one thing every call site really did vary. */
  className?: string;
}

export function ErrorAlert({ children, icon = true, className = '' }: ErrorAlertProps) {
  return (
    <div
      role="alert"
      className={`w-full flex items-start gap-2.5 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium text-left animate-in fade-in slide-in-from-top-1 duration-200 ${className}`}
    >
      {icon && <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={16} aria-hidden="true" />}
      <span className="leading-5 min-w-0">{children}</span>
    </div>
  );
}

export default ErrorAlert;
