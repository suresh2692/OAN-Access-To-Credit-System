'use client';

import { DashboardShell, resolvePageTitle } from '@/components/layout/DashboardShell';
import { NavSection } from '@/components/Sidebar';
import { selectAuthStatus, selectBankStatus, selectUser } from '@/features/auth/store/authSlice';
import { fetchDashboardStats, selectSellerStats } from '@/features/seller/store/loanProductsSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { ClipboardCheck, FileText, LayoutDashboard, Package, ShieldCheck } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useMemo } from 'react';

// Only for paths with no nav item of their own; a matching nav item's label wins.
const PAGE_TITLES: Record<string, string> = {
  '/profile': 'My Profile',
  '/kyc-compliance': 'KYC & Compliance',
};

export default function BankAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const authStatus = useAppSelector(selectAuthStatus);
  const bankStatus = useAppSelector(selectBankStatus);
  const sellerStats = useAppSelector(selectSellerStats);

  // getMe has finished (either way) — until then `user` is null simply because
  // the session hasn't loaded, not because the bank is unprovisioned.
  const authResolved = authStatus === 'succeeded' || authStatus === 'failed';
  // A bank_admin whose bank isn't set up yet comes back with all bank fields
  // null. The dashboard needs a provisioned bank (its stats fetch 404s
  // otherwise), so gate these users to onboarding.
  const needsOnboarding = user?.kind === 'bank_admin' && !user.bankId;

  useEffect(() => {
    if (authResolved && needsOnboarding) {
      router.replace('/onboarding');
    }
  }, [authResolved, needsOnboarding, router]);

  // The Product Approvals badge needs the same stats the dashboard shows. Fetched
  // here so the count is right on every page of the portal, not just the one that
  // happens to load stats for its own tiles.
  useEffect(() => {
    if (authResolved && !needsOnboarding && !sellerStats) {
      dispatch(fetchDashboardStats());
    }
  }, [authResolved, needsOnboarding, sellerStats, dispatch]);

  const navigationSections: NavSection[] = useMemo(() => {
    // Straight from get_stats. Deriving it as total - active overcounted: nothing
    // is excluded from `total_products`, so that subtraction also swept in
    // Rejected and Archived products, while /product-approvals lists only the
    // `Pending Approval` ones this badge counts.
    const pendingApprovals = sellerStats?.pending_products;

    return [
      {
        title: 'DASHBOARDS',
        items: [
          { path: '/dashboard', activePaths: ['/dashboard'], label: 'Dashboard', icon: LayoutDashboard },
          { path: '/loan-products', activePaths: ['/loan-products'], label: 'Loan Products', icon: Package },
          { path: '/application-lists', activePaths: ['/application-lists'], label: 'Applications Lists', icon: FileText },
          {
            path: '/product-approvals',
            activePaths: ['/product-approvals'],
            label: 'Product Approvals',
            icon: ClipboardCheck,
            badge: pendingApprovals,
          },
          // KYC is only actionable while the bank is still being reviewed;
          // once approved the section has nothing left to collect.
          ...(bankStatus === 'In Review'
            ? [{
                path: '/kyc-compliance',
                activePaths: ['/kyc-compliance'],
                label: 'KYC & Compliance',
                icon: ShieldCheck,
                badge: 1,
              }]
            : []),
        ],
      },
    ];
  }, [bankStatus, sellerStats]);

  // Don't mount the dashboard (and fire its stats fetch) until we know the bank
  // is provisioned — avoids the flash + the failing request during the redirect.
  if (!authResolved || needsOnboarding) {
    return null;
  }

  return (
    <DashboardShell
      sections={navigationSections}
      pageTitle={resolvePageTitle(navigationSections, pathname, PAGE_TITLES)}
    >
      {children}
    </DashboardShell>
  );
}
