'use client';
// Same list the Bank Agent portal renders, under the admin's own chrome. The
// endpoint behind it (`get_all_loans`) is bank-scoped server-side and hides
// Draft applications from every bank role, so an admin sees exactly its own
// bank's submitted applications — no admin-specific variant is needed here.
import AgentApplicationListClient from '@/app/(dashboard)/(bank-agent)/agent-application-lists/components/AgentApplicationListClient';

export default function BankAdminApplicationsPage() {
  return <AgentApplicationListClient />;
}
