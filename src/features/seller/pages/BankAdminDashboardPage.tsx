'use client';
import { BankHeaderCard } from '@/features/seller/components/loan-products/BankHeaderCard';
import { KycAlertBanner } from '@/features/seller/components/dashboard/KycAlertBanner';
import { LoanApplicationsTable } from '@/features/seller/components/dashboard/LoanApplicationsTable';
import { MetricCards } from '@/features/seller/components/dashboard/MetricCards';
import { fetchDashboardStats, selectSellerStats } from '@/features/seller/store/loanProductsSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { useEffect } from 'react';

export default function BankAdminDashboardPage() {
  const dispatch = useAppDispatch();
  const stats = useAppSelector(selectSellerStats);

  useEffect(() => {
    dispatch(fetchDashboardStats());
    // Loan fetching (with active filters) is owned by <LoanApplicationsTable/>.
  }, [dispatch]);

  return (
    <div className="w-full mx-auto space-y-6">
      <BankHeaderCard portalLabel="Bank Admin Portal - Loan Product Management" />
      <KycAlertBanner />
      <MetricCards
        totalProducts={stats?.total_products ?? 0}
        activeProducts={stats?.active_products ?? 0}
        totalApplications={stats?.total_applications ?? 0}
        totalApplicants={stats?.total_applicants ?? 0}
        pendingLabel="Pending Approvals"
        pendingValue={String(stats?.pending_products ?? 0)}
      />
      <LoanApplicationsTable />
    </div>
  );
}
