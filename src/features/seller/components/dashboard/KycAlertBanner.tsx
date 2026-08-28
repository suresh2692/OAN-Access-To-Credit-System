 'use client';
// eslint-disable-next-line boundaries/dependencies -- TODO (2026-08-23): needs to be fixed later; hiding for now as this existed before our changes
import { selectBankStatus } from '@/features/auth/store/authSlice';
import { useAppSelector } from '@/store/hooks';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export function KycAlertBanner() {
  const bankStatus = useAppSelector(selectBankStatus);

  if (bankStatus === 'Active') {
    return null;
  }

  return (
    <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 rounded-xl">
      <div className="flex items-start sm:items-center space-x-3">
        <AlertTriangle size={20} className="text-[#D97706] mt-0.5 sm:mt-0 flex-shrink-0" />
        <div>
          <h3 className="text-[14px] font-bold text-[#92400E]">KYC Verification Pending</h3>
          <p className="text-[14px] text-[#92400E]/80">
            Upload your Tax Registration Certificate and add GRO & Operations contacts to activate loan product publishing.
          </p>
        </div>
      </div>

      <Link
        href="/kyc-compliance"
        className="flex items-center space-x-1.5 text-[14px] font-bold text-[#D97706] hover:text-[#B45309] transition-colors whitespace-nowrap"
      >
        <span>Complete KYC</span>
        <ArrowRight size={16} />
      </Link>
    </div>
  );
}
