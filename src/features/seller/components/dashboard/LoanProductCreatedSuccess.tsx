'use client';
import { Check } from 'lucide-react';

interface LoanProductCreatedSuccessProps {
  onDone: () => void;
  height?: string;
}

export function LoanProductCreatedSuccess({ onDone, height = 'h-[420px]' }: LoanProductCreatedSuccessProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-16 text-center ${height} max-h-[60vh]`}>
      <div className="relative w-20 h-20 mx-auto mb-8">
        <div className="absolute inset-0 bg-[#D1FAE5] rounded-full opacity-50 animate-ping"></div>
        <div className="relative w-full h-[80px] bg-[#ECFDF5] rounded-full flex items-center justify-center shadow-sm border-[6px] border-[#D1FAE5] transform transition-transform hover:scale-110 duration-300">
          <Check strokeWidth={4} className="w-10 h-10 text-[#10B981] animate-pulse" />
        </div>
      </div>
      <h2 className="text-[24px] font-bold text-[#1F2937] mb-4 animate-in slide-in-from-bottom-4 fade-in duration-500 delay-300 fill-mode-both">
        Loan Product Saved!
      </h2>
      <p className="text-[18px] text-[#6B7280] max-w-[400px] mb-12 leading-relaxed animate-in slide-in-from-bottom-4 fade-in duration-500 delay-500 fill-mode-both">
        Your loan product changes have been saved successfully.
      </p>
      <button
        onClick={onDone}
        className="px-8 py-3.5 bg-[#16A34A] hover:bg-[#15803d] text-white rounded-xl text-[16px] font-bold transition-transform hover:scale-[1.02] active:scale-[0.98] w-full max-w-[280px] shadow-sm animate-in zoom-in fade-in duration-500 delay-700 fill-mode-both"
      >
        Done
      </button>
    </div>
  );
}
