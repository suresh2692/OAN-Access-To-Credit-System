import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { AlertCircle, CreditCard } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { type CreditInfoFormData } from '../schemas/credit.schema';
import { addCreditInfoThunk, fetchCreditInfoThunk, selectCreditInfo, selectIsLeadFinalized, selectVerificationBlocked } from '../store/newLeadSlice';
import { CreditInformationModal } from './modals/CreditInformationModal';

export function CreditInformationSection() {
  const dispatch = useAppDispatch();
  const creditInfo = useAppSelector(selectCreditInfo);
  const isFinalized = useAppSelector(selectIsLeadFinalized);
  const verificationBlocked = useAppSelector(selectVerificationBlocked);
  const params = useParams();
  const leadId = params?.id as string;
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Highlight as a verification blocker only if a verify attempt failed and no credit info exists yet.
  const isMissingForVerification = verificationBlocked && creditInfo.length === 0;

  useEffect(() => {
    if (leadId) {
      dispatch(fetchCreditInfoThunk(leadId));
    }
  }, [dispatch, leadId]);

  const handleSubmit = async (data: CreditInfoFormData & { productId?: string }) => {
    if (!leadId) return;

    await dispatch(addCreditInfoThunk({
      leadId,
      ...(data.productId ? { loan_product: data.productId } : { loan_type: data.loanType }),
      loan_amount: data.loanAmount.toString(), // The API seems to expect a string here based on previous payload or DTO, we should check `addCreditInfoThunk` type
      purpose_message: data.purposeMessage
    })).unwrap();
    setIsModalOpen(false);
  };

  return (
    <section className={`flex flex-col items-center pb-6 gap-6 w-full bg-white border shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 rounded-xl ${isMissingForVerification ? 'border-[#EF4444] border-l-4' : 'border-[#F1F3F4]'}`}>
      <div className="flex flex-row justify-between items-center p-5 pt-4 pb-4 w-full border-b border-[#F1F3F4] font-semibold">
        <h2 className="font-inter font-semibold text-lg leading-7 flex items-center gap-2 text-[#232F34]">
          <CreditCard size={20} className="text-[#6B7280]" />
          Credit Information
          {isMissingForVerification && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FEF2F2] border border-[#FECACA] rounded-md text-[#DC2626] text-xs font-medium">
              <AlertCircle size={12} />
              Required for verification
            </span>
          )}
        </h2>
        {!isFinalized && (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex flex-row justify-center items-center px-4 py-5 gap-2 h-8 bg-white border border-[#16A34A] rounded-lg text-[#16A34A] font-roboto font-bold text-base leading-6 hover:bg-[#F0FDFA] transition-colors"
          >
            + Add
          </button>
        )}
      </div>

      <div className="flex flex-col items-start px-4 sm:px-6 w-full overflow-hidden">
        <div className="w-full overflow-x-auto">
          <div className="w-full min-w-max sm:min-w-0">
            <div className="w-full bg-[#EEF4FB]/50 border-b border-[#D4D4D4] flex flex-row">
              <div className="p-3 px-4 w-[140px] sm:w-[177px] shrink-0">
                <span className="font-inter font-semibold text-sm leading-4 tracking-wide text-[#4F4F58]">Loan Product</span>
              </div>
              <div className="p-3 px-4 w-[140px] sm:w-[177px] shrink-0">
                <span className="font-roboto font-semibold text-sm leading-4 tracking-wide text-[#4F4F58]">Loan Amount</span>
              </div>
              <div className="p-3 px-4 flex-1 min-w-[150px]">
                <span className="font-roboto font-semibold text-sm leading-4 tracking-wide text-[#4F4F58]">Purpose Message</span>
              </div>
            </div>

            <div className="flex flex-col w-full">
              {creditInfo.map((info) => (
                <div key={info.id} className="flex flex-row w-full border-b border-[#D4D4D4]/50 hover:bg-slate-50 transition-colors">
                  <div className="p-2 px-4 w-[140px] sm:w-[177px] shrink-0 flex flex-col justify-center">
                    <div className="inline-flex items-center px-2.5 py-1 gap-1.5 bg-[#F0FDFA] border border-[#CCFBF1] rounded-md w-fit">
                      <span className="font-inter text-xs leading-4 text-[#1E6865]">
                        {info.type}
                      </span>
                    </div>
                  </div>
                  <div className="p-2 px-4 w-[140px] sm:w-[177px] shrink-0 flex flex-col justify-center">
                    <span className="font-inter text-sm leading-5 text-[#232F34]">
                      {info.amount}
                    </span>
                  </div>
                  <div className="p-2 px-4 flex-1 min-w-[150px] flex flex-col justify-center">
                    <span className="font-roboto font-light text-sm leading-5 text-[#232F34]">
                      {info.purpose}
                    </span>
                  </div>
                </div>
              ))}
              {creditInfo.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 w-full animate-in fade-in zoom-in duration-500">
                  <div className="bg-[#F0FDFA] rounded-full p-4 mb-3 border border-[#CCFBF1] shadow-sm">
                    <CreditCard size={32} className="text-[#16A34A] animate-pulse" />
                  </div>
                  <h3 className="text-[#232F34] font-semibold text-[15px]">No credit information added yet</h3>
                  <p className="text-[#6B7280] text-[13px] mt-1">Click the + Add button to record new credit details.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <CreditInformationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </section>
  );
}
