'use client';

import { RoleTabs } from '@/app/(portal-account)/login/components/RoleTabs';
import { PORTALS, type PortalId } from '@/app/(portal-account)/login/portals';
import { PortalLoginForm } from '@/features/auth/components/PortalLoginForm';

/**
 * Renders one portal's sign-in pane from its entry in `PORTALS`.
 *
 * This is the whole of what the four per-role wrapper components used to do.
 */
export function PortalSignIn({ portal }: { portal: PortalId }) {
  const { roleTabs, form } = PORTALS[portal];

  if (!roleTabs) return <PortalLoginForm {...form} />;

  return (
    <div className="w-full flex flex-col">
      <RoleTabs />
      <PortalLoginForm {...form} />
    </div>
  );
}
