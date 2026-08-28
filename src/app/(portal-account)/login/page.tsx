import { PortalShell } from '@/app/(portal-account)/components/PortalShell';
import { LoginForm } from '@/app/(portal-account)/login/components/LoginForm';

export default function LoginPage() {
  return (
    <PortalShell>
      <LoginForm />
    </PortalShell>
  );
}
