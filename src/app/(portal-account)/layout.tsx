'use client';

import { Header } from '@/app/(portal-account)/components/Header';
import { DashboardHeader } from '@/components/header/DashboardHeader';
import { usePathname } from 'next/navigation';

export default function PortalAccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Onboarding is reached by an authenticated (but not-yet-provisioned) bank
  // admin, so it gets the dashboard header with the profile menu rather than the
  // public login/create-account header.
  const isOnboarding = pathname.startsWith('/onboarding');

  // Determine which tab is active based on the URL
  const activeTab = pathname.includes('/create-account') ? 'create-account' : 'login';

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col font-sans">
      {isOnboarding ? (
        <DashboardHeader title="Complete Registration" />
      ) : (
        <Header activeTab={activeTab} />
      )}
      {children}
    </div>
  );
}
