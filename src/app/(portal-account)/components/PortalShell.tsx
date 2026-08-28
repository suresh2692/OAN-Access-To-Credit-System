import { BackLink } from '@/app/(portal-account)/components/BackLink';
import { LanguageSelector } from '@/app/(portal-account)/components/LanguageSelector';
import { LeftSidebar } from '@/app/(portal-account)/components/leftSidebar';

interface PortalShellProps {
  /** Eyebrow on the green panel, naming the portal being signed in to. */
  badge?: string;
  /** Renders the "Back" link above the card, and is where it leads when there
   *  is no history to step back through. Omitted on the role chooser, which is
   *  itself where Back would lead. */
  backHref?: string;
  backLabel?: string;
  children: React.ReactNode;
}

/**
 * The split-card chrome shared by every sign-in / account screen.
 *
 * Each portal used to build this itself, so the card silently drifted apart —
 * different card widths and radii, two greens for the same panel, two language
 * pickers, a Back link in three styles. Anything that is the same on every
 * portal belongs here; only the right-hand pane is per-portal.
 */
export function PortalShell({
  badge,
  backHref,
  backLabel = 'Back',
  children,
}: PortalShellProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-start md:justify-center py-4 sm:py-8 px-4 sm:px-8">
      {/* Kept in the flow even with no link, so the card sits at the same
          height on the chooser and on the portal it navigates to. */}
      <div className="w-full max-w-5xl mb-4 shrink-0 min-h-[20px]">
        {backHref && <BackLink href={backHref} label={backLabel} />}
      </div>

      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] overflow-hidden flex flex-col md:flex-row md:min-h-[750px] shrink-0 mb-8">
        <LeftSidebar {...(badge ? { badge } : {})} />
        <div className="w-full md:w-[55%] p-6 sm:p-12 md:p-16 flex flex-col bg-white">
          <div className="flex justify-end mb-8 relative">
            <LanguageSelector />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
