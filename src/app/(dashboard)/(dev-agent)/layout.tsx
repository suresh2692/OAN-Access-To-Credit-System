'use client';

import { DashboardShell, resolvePageTitle } from '@/components/layout/DashboardShell';
import { NavSection } from '@/components/Sidebar';
import { FileText, Search, Users } from 'lucide-react';
import { usePathname } from 'next/navigation';
import React from 'react';

const navigationSections: NavSection[] = [
  {
    title: 'DASHBOARDS',
    items: [
      {
        path: '/leads',
        activePaths: ['/leads', '/leads/new'],
        label: 'Leads Dashboard',
        icon: Users,
      },
      {
        path: '/loan-discovery',
        activePaths: ['/loan-discovery'],
        // Same page, same name as the farmer's at /discover-loans. The routes have
        // to differ -- two route groups cannot both own /discover-loans -- but the
        // label is what people read, and one surface should have one name.
        label: 'Discover Loans',
        icon: Search,
      },
      {
        path: '/dev-application-lists',
        activePaths: ['/dev-application-lists'],
        label: 'Application Lists',
        icon: FileText,
      },
    ],
  },
];

export default function DevAgentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <DashboardShell
      sections={navigationSections}
      pageTitle={resolvePageTitle(navigationSections, pathname)}
    >
      {children}
    </DashboardShell>
  );
}
