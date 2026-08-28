'use client';
import { BankHeaderCard } from '@/features/seller/components/loan-products/BankHeaderCard';
import { LoanApplicationsTable } from '@/features/seller/components/dashboard/LoanApplicationsTable';
import { MetricCards } from '@/features/seller/components/dashboard/MetricCards';
import { fetchDashboardStats, selectSellerStats } from '@/features/seller/store/loanProductsSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { useEffect } from 'react';

export default function AgentDashboardPage() {
  const dispatch = useAppDispatch();
  const stats = useAppSelector(selectSellerStats);

  useEffect(() => {
    dispatch(fetchDashboardStats());
  }, [dispatch]);

  return (
    <div className="w-full mx-auto space-y-6">
      <BankHeaderCard portalLabel="Bank Agent Portal - Loan Product Management" />
      {/* The pending tile counts products this agent submitted that the bank
          admin has not ruled on yet. It read `pending_applications` — a
          loan-application count (the `In Transition` archetype) — which has
          nothing to do with a product approval. */}
      <MetricCards
        totalProducts={stats?.total_products ?? 0}
        activeProducts={stats?.active_products ?? 0}
        totalApplications={stats?.total_applications ?? 0}
        totalApplicants={stats?.total_applicants ?? 0}
        pendingLabel="Awaiting Admin Approvals"
        pendingValue={String(stats?.pending_products ?? 0)}
      />
      <LoanApplicationsTable />
    </div>
  );
}
