import { PortalShell } from '@/app/(portal-account)/components/PortalShell';
import { PortalSignIn } from '@/app/(portal-account)/login/components/PortalSignIn';
import { PORTALS } from '@/app/(portal-account)/login/portals';

export default function BankAgentLoginPage() {
  return (
    <PortalShell badge={PORTALS['bank-agent'].badge} backHref="/login">
      <PortalSignIn portal="bank-agent" />
    </PortalShell>
  );
}
