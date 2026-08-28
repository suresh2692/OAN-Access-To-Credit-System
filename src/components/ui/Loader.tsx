import { cn } from '@/lib/utils';

/**
 * The one loading mark used everywhere in the app.
 *
 * Deliberately free of `'use client'` and of hooks: `loading.tsx` files are
 * server components, and every route boundary renders this, so it must not drag
 * a client bundle along with it. The motion is pure CSS (see the `loader-*`
 * keyframes in `tailwind.config.mts`) and respects `prefers-reduced-motion`
 * through the `motion-reduce:animate-none` variants below.
 */

const SIZES = {
  sm: { box: 'h-5 w-5', ring: 'border-2' },
  md: { box: 'h-9 w-9', ring: 'border-[3px]' },
  lg: { box: 'h-14 w-14', ring: 'border-4' },
} as const;

export type SpinnerSize = keyof typeof SIZES;

interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
}

/**
 * Two counter-rotating arcs over a soft halo. The second arc is what stops this
 * reading as the generic bootstrap spinner: at a glance it is the same shape,
 * but it has a direction and a rhythm of its own.
 */
export function Spinner({ size = 'md', className }: SpinnerProps) {
  const { box, ring } = SIZES[size];

  return (
    <span className={cn('relative inline-grid shrink-0 place-items-center', box, className)} aria-hidden="true">
      <span className="absolute inset-0 rounded-full bg-brand-green/10 animate-loader-halo motion-reduce:animate-none" />
      <span
        className={cn(
          'absolute inset-0 rounded-full border-brand-green/15',
          ring,
        )}
      />
      <span
        className={cn(
          'absolute inset-0 rounded-full border-transparent border-t-brand-green border-r-brand-green',
          'animate-loader-spin motion-reduce:animate-none',
          ring,
        )}
      />
      <span
        className={cn(
          'absolute inset-[22%] rounded-full border-transparent border-b-brand-green/45',
          'animate-loader-spin-reverse motion-reduce:animate-none',
          size === 'sm' ? 'border' : 'border-2',
        )}
      />
    </span>
  );
}

interface LoaderProps {
  size?: SpinnerSize;
  /** Shown under the mark. Pass `null` for a bare spinner. */
  label?: string | null;
  className?: string;
}

/**
 * Spinner plus copy, announced to assistive tech as a live status.
 *
 * `role="status"` rather than a bare div so a screen reader says what is
 * happening — a silent spinner is invisible to anyone not looking at it.
 */
export function Loader({ size = 'md', label = 'Loading…', className }: LoaderProps) {
  return (
    <div role="status" aria-live="polite" className={cn('flex flex-col items-center gap-3.5', className)}>
      <Spinner size={size} />
      {label === null ? (
        <span className="sr-only">Loading</span>
      ) : (
        <p className="text-sm font-semibold tracking-tight text-gray-500">{label}</p>
      )}
    </div>
  );
}

/**
 * Route-level loader for a whole page (used by the top-level `loading.tsx`).
 */
export function FullPageLoader({ label = 'Loading…' }: { label?: string | null }) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-page">
      <Loader size="lg" label={label} className="animate-fade-in-up" />
    </div>
  );
}

/**
 * Loader for a content region inside an existing shell — the sidebar and header
 * stay put while only the panel below them is replaced.
 */
export function PanelLoader({ label = 'Loading…' }: { label?: string | null }) {
  return (
    <div className="flex min-h-[420px] w-full flex-1 items-center justify-center">
      <Loader label={label} className="animate-fade-in-up" />
    </div>
  );
}
