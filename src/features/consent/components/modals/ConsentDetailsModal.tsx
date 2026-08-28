import { Portal } from '@/components/Portal';
import { CheckCircle2, X } from 'lucide-react';

interface ConsentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestedDataFields?: { field_name: string; field_value: string }[] | undefined;
  purpose?: string | undefined;
  validityFrom?: string | undefined;
  validityTo?: string | undefined;
}

export function ConsentDetailsModal({
  isOpen,
  onClose,
  requestedDataFields,
  purpose,
  validityFrom,
  validityTo,
}: ConsentDetailsModalProps) {
  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0F172A]/40 backdrop-blur-sm p-4">
      <div className="relative flex flex-col bg-white rounded-[10px] w-full max-w-[605px] overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="flex flex-row justify-between items-center px-6 h-[77px] border-b border-[#E5E7EB]">
          <div>
            <h2 className="font-roboto font-bold text-[20px] leading-7 text-[#111827] m-0">
              Consent Details
            </h2>
            {validityFrom && validityTo && (
              <p className="text-xs text-gray-500 mt-0.5">
                Valid: {validityFrom} to {validityTo}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded hover:bg-gray-100 transition-colors"
          >
            <X size={20} className="text-[#0A0A0A]" />
          </button>
        </div>

        {/* Body Container */}
        <div className="flex flex-col px-6 pt-6 gap-4 pb-8">
          {purpose && (
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-xs text-gray-700">
              <span className="font-semibold text-gray-500 uppercase tracking-wider block text-[10px] mb-0.5">
                Purpose
              </span>
              <span>{purpose}</span>
            </div>
          )}

          <p className="font-inter font-medium text-[15px] leading-5 text-[#111827] mb-2">
            Data shared as part of Agri Loan consent:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(requestedDataFields || []).map((item) => (
              <div
                key={item.field_name}
                className="flex items-center p-4 gap-3 bg-[#F0FDFA] border border-[#A7F3D0] rounded-lg"
              >
                <CheckCircle2 size={24} className="text-[#10B981] shrink-0" fill="#10B981" color="white" />
                <span className="font-inter font-medium text-[15px] text-[#374151]">
                  {item.field_name}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );

  return <Portal>{modalContent}</Portal>;
}
