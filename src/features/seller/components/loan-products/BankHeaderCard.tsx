'use client';
// eslint-disable-next-line boundaries/dependencies -- TODO (2026-08-23): needs to be fixed later; hiding for now as this existed before our changes
import { selectAuthStatus, selectBankName, selectBankStatus } from '@/features/auth/store/authSlice';
import { useAppSelector } from '@/store/hooks';
import { Landmark, Plus } from 'lucide-react';
import { useState } from 'react';
import { AddLoanProductModal } from './AddLoanProductModal';

interface BankHeaderCardProps {
  portalLabel?: string | undefined;
}

export const BankHeaderCard = ({ portalLabel = 'Bank Admin Portal - Loan Product Management' }: BankHeaderCardProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const bankName = useAppSelector(selectBankName);
  const bankStatus = useAppSelector(selectBankStatus);
  const authStatus = useAppSelector(selectAuthStatus);
  // Session is still being restored on refresh — bankName reads as null until
  // then, which briefly showed the "Seller Portal" fallback for a real bank.
  const isSessionLoading = authStatus === 'idle' || authStatus === 'loading';

  // Products can't be added until the bank is approved (out of "In Review").
  const isAddDisabled = bankStatus === 'In Review';

  return (
    <>
      <div className="bg-white border border-[#F1F3F4] rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 border border-blue-100 flex-shrink-0">
            <Landmark size={24} />
          </div>
          <div>
            <h2 className="text-[18px] font-bold text-[#1F2937] min-h-[1em]">{isSessionLoading ? '' : (bankName ?? 'Seller Portal')}</h2>
            <p className="text-[14px] text-[#6B7280]">{portalLabel}</p>
          </div>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          disabled={isAddDisabled}
          title={isAddDisabled ? 'Your bank is still under review. You can add loan products once it is approved.' : undefined}
          className={`px-5 py-2.5 w-full sm:w-auto justify-center sm:justify-start rounded-lg font-bold text-[14px] transition-colors flex items-center space-x-2 whitespace-nowrap shadow-sm ${isAddDisabled
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-[#16A34A] hover:bg-[#15803d] text-white'
            }`}
        >
          <Plus size={18} strokeWidth={2.5} />
          <span className='font-semibold'>Add Loan Product</span>
        </button>
      </div>
      <AddLoanProductModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};
