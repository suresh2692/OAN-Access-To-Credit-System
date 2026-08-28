'use client';

import { DashboardShell, resolvePageTitle } from '@/components/layout/DashboardShell';
import { NavSection } from '@/components/Sidebar';
import { FileText, LayoutDashboard, Search } from 'lucide-react';
import { usePathname } from 'next/navigation';
import React from 'react';

const navigationSections: NavSection[] = [
  {
    title: 'DASHBOARDS',
    items: [
      {
        path: '/farmer-dashboard',
        activePaths: ['/farmer-dashboard'],
        label: 'Dashboard',
        icon: LayoutDashboard,
      },
      {
        path: '/discover-loans',
        activePaths: ['/discover-loans'],
        label: 'Discover Loans',
        icon: Search,
      },
      {
        path: '/my-applications',
        activePaths: ['/my-applications'],
        label: 'My Applications',
        icon: FileText,
      },
    ],
  },
];

export default function FarmerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // The apply flow lives under /discover-loans but is its own task, so it gets
  // its own title rather than the nav item's.
  const pageTitle = pathname.startsWith('/discover-loans/apply')
    ? 'New Loan Application'
    : resolvePageTitle(navigationSections, pathname);

  return (
    // No subtitle: the header used to read "Farmer ID: ETH-2847" for every
    // farmer who ever signed in. The layout has no access to the real id — it is
    // on A2C Farmer Profile, which only the dashboard summary fetches — and the
    // profile card on the dashboard already shows it. `DashboardHeader` falls
    // back to the role label, which at least is true of everyone.
    <DashboardShell
      sections={navigationSections}
      pageTitle={pageTitle}
      innerContentClassName="p-6 md:p-10"
    >
      {children}
    </DashboardShell>
  );
}
