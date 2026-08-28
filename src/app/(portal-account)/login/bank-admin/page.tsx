import { PortalShell } from '@/app/(portal-account)/components/PortalShell';
import { PortalSignIn } from '@/app/(portal-account)/login/components/PortalSignIn';
import { PORTALS } from '@/app/(portal-account)/login/portals';

export default function BankAdminLoginPage() {
  return (
    <PortalShell badge={PORTALS['bank-admin'].badge} backHref="/login">
      <PortalSignIn portal="bank-admin" />
    </PortalShell>
  );
}
