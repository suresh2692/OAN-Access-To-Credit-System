import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { FormCard } from './FormCard';

interface RegisterFooterCardProps {
  isLoading: boolean;
  isAgreed: boolean;
  onBack: () => void;
}

export function RegisterFooterCard({ isLoading, isAgreed, onBack }: RegisterFooterCardProps) {
  return (
    <FormCard bodyClassName="flex items-center justify-between">
      <button
        type="button"
        onClick={onBack}
        className="px-6 py-2.5 border border-[#D1D5DB] text-[#374151] rounded-lg font-bold text-[14px] hover:bg-gray-50 transition-colors flex items-center space-x-2"
      >
        <ArrowLeft size={16} />
        <span>Back</span>
      </button>

      <button
        type="submit"
        disabled={isLoading || !isAgreed}
        className="px-6 py-2.5 bg-[#16A34A] hover:bg-[#15803d] text-white rounded-lg font-bold text-[14px] transition-all duration-300 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#16A34A] shadow-sm"
      >
        {isLoading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            <span>Registering...</span>
          </>
        ) : (
          <>
            <span>Register Organization</span>
            <ArrowRight size={16} />
          </>
        )}
      </button>
    </FormCard>
  );
}
