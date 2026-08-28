import { PortalShell } from '@/app/(portal-account)/components/PortalShell';
import { ResetPasswordForm } from './components/ResetPasswordForm';

export default function ResetPasswordPage() {
  return (
    <PortalShell backHref="/login" backLabel="Back to Login">
      <ResetPasswordForm />
    </PortalShell>
  );
}
