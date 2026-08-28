import { PortalShell } from '@/app/(portal-account)/components/PortalShell';
import { CreateAccountForm } from '@/features/seller/components/create-account/CreateAccountForm';

export default function CreateAccountPage() {
  return (
    <PortalShell badge="Bank Portal">
      <CreateAccountForm />
    </PortalShell>
  );
}
