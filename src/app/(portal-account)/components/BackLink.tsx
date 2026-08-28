'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface BackLinkProps {
  /** Where Back leads when there is no history to step back through. */
  href: string;
  label?: string;
}

/**
 * The "Back" affordance above the portal card.
 *
 * It is a real `<Link href>` first: that keeps middle-click, ctrl-click and
 * "open in new tab" working, and it is what renders before hydration.
 *
 * On a plain left-click it steps back through browser history instead, because
 * `href` is a fixed destination and history is not. Every portal points Back at
 * `/login`, so a farmer who went chooser -> farmer sign-in -> "Register account"
 * -> Back was sent to the chooser rather than to the sign-in page they came
 * from, losing a step they had already taken.
 *
 * The history check happens in the handler rather than on mount, so there is no
 * server/client mismatch to reconcile: a click only ever happens in a browser.
 * `history.length === 1` means this page is the first entry in the tab —
 * someone opened a bookmark or followed a link from outside — and there is
 * nothing to go back to. There the `href` stands, which is why it is still the
 * element's real destination rather than a `#`.
 */
export function BackLink({ href, label = 'Back' }: BackLinkProps) {
  const router = useRouter();

  return (
    <Link
      href={href}
      onClick={(event) => {
        // A modified click is the user asking for a new tab or window. Calling
        // router.back() would hijack it and navigate this one instead.
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (window.history.length <= 1) return;
        event.preventDefault();
        router.back();
      }}
      className="inline-flex items-center space-x-2 text-[#4B5563] hover:text-[#111827] font-medium text-sm transition-colors"
    >
      <ArrowLeft size={16} strokeWidth={2.5} />
      <span>{label}</span>
    </Link>
  );
}
