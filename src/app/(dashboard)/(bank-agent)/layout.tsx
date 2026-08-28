'use client';

import { DashboardShell, resolvePageTitle } from '@/components/layout/DashboardShell';
import { NavSection } from '@/components/Sidebar';
import { FileText, LayoutDashboard, Package } from 'lucide-react';
import { usePathname } from 'next/navigation';
import React from 'react';

const navigationSections: NavSection[] = [
  {
    title: 'DASHBOARDS',
    items: [
      {
        path: '/agent-dashboard',
        activePaths: ['/agent-dashboard'],
        label: 'Dashboard',
        icon: LayoutDashboard,
      },
      {
        path: '/agent-loan-products',
        activePaths: ['/agent-loan-products'],
        label: 'Loan Products',
        icon: Package,
      },
      {
        path: '/agent-application-lists',
        activePaths: ['/agent-application-lists'],
        label: 'Applications Lists',
        icon: FileText,
      },
      // No Discover Loans here. The catalog endpoints behind that page
      // (`list_catalog`, `get_catalog_facets`) are @require_role([FARMER_ROLE,
      // DEVELOPMENT_AGENT_ROLE]), so every request a bank agent made from it
      // came back 403 — and /loan-discovery only exists under the (dev-agent)
      // route group, so clicking it swapped the whole shell to the dev-agent
      // portal. Bank agents browse their own bank's catalog at
      // /agent-loan-products.
    ],
  },
];

export default function BankAgentLayout({ children }: { children: React.ReactNode }) {
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
