import { Portal } from '@/components/Portal';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { SelectField } from '@/components/ui/SelectField';
// eslint-disable-next-line boundaries/dependencies -- Lead creation modal consumes marketplace catalog to populate loan product dropdown
import { getCatalog } from '@/features/(farmer-application)/api/farmerApi';
// eslint-disable-next-line boundaries/dependencies -- Lead creation modal consumes marketplace catalog to populate loan product dropdown
import type { FarmerLoanProduct } from '@/features/(farmer-application)/types';
import { resolveCategory } from '@/types/loan-catalog';
import { Building2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NumericInput } from '@/components/ui/NumericInput';
import { formatAmount, formatRateRange, formatTenure } from '@/lib/format/loanTerms';
import { creditInfoSchema, type CreditInfoFormData } from '../../schemas/credit.schema';

interface CreditInformationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreditInfoFormData & { productId?: string }) => Promise<void>;
}

export function CreditInformationModal({ isOpen, onClose, onSubmit }: CreditInformationModalProps) {
  const [products, setProducts] = useState<FarmerLoanProduct[]>([]);

  const [loanType, setLoanType] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [purposeMessage, setPurposeMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      getCatalog({ limit: 100 })
        .then((res) => {
          setProducts(res?.data?.products || []);
        })
        .catch(() => {
          setProducts([]);
        });

      // This modal stays mounted while closed (isOpen just gates the render
      // via the early return below), so its form state must be reset here on
      // reopen rather than relying on unmount/remount to clear stale values.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoanType('');
      setLoanAmount('');
      setPurposeMessage('');
      setError(null);
      setFieldErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    // 1. Run local Zod schema validation
    const validationResult = creditInfoSchema.safeParse({ loanType, loanAmount, purposeMessage });
    if (!validationResult.success) {
      // Set field errors from Zod validation
      const issues = validationResult.error.flatten().fieldErrors;
      const formattedErrors: Record<string, string> = {};
      for (const [key, messages] of Object.entries(issues)) {
        if (messages && messages.length > 0 && messages[0] !== undefined) {
          formattedErrors[key] = messages[0];
        }
      }
      setFieldErrors(formattedErrors);
      setError('Please correct the validation errors below.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setFieldErrors({});
    try {
      const selectedProduct = products.find((p) => p.product_name === validationResult.data.loanType);
      const payload: CreditInfoFormData & { productId?: string } = { ...validationResult.data };
      if (selectedProduct?.name) {
        payload.productId = selectedProduct.name;
      }
      await onSubmit(payload);
    } catch (err) {
      setIsSubmitting(false);
      const structuredMessage = (err as { message?: { message?: string; details?: Record<string, string> } })?.message;
      const serverMessage = structuredMessage?.message || (typeof err === 'string' ? err : 'Failed to add credit information');
      setError(serverMessage);

      if (structuredMessage?.details) {
        setFieldErrors(structuredMessage.details);
      }
    }
  };

  const amountError = fieldErrors.loan_amount || fieldErrors.loanAmount;
  const typeError = fieldErrors.loan_type || fieldErrors.loanType;
  const purposeError = fieldErrors.purpose_message || fieldErrors.purposeMessage;

  // Clear a field's error (and the general banner) as soon as the user edits it,
  // so a stale validation message/red border doesn't linger after a fix.
  const clearFieldError = (...keys: string[]) => {
    setFieldErrors((prev) => {
      if (!keys.some((k) => k in prev)) return prev;
      const next = { ...prev };
      for (const k of keys) delete next[k];
      return next;
    });
    setError(null);
  };

  const selectedProduct = products.find((p) => p.product_name === loanType);
  const selectedCategory = selectedProduct ? resolveCategory(selectedProduct) : undefined;

  const productOptions = [...new Set(products.map((p) => p.product_name))];

  const modalContent = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="relative flex flex-col items-start p-0 w-[95%] sm:w-[799px] max-w-full bg-white rounded-[10px] shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="box-border flex flex-row justify-between items-center p-6 w-full h-[77px] border-b border-[#E5E7EB]">
            <h2 className="font-inter font-semibold text-[18px] leading-[28px] tracking-[-0.439453px] text-[#0A0A0A]">
              Credit Information
            </h2>
            <button
              onClick={onClose}
              className="flex flex-col items-start p-[4px_4px_0px] w-[28px] h-[28px] rounded-[4px] hover:bg-gray-100 transition-colors"
            >
              <X size={20} color="#0A0A0A" strokeWidth={1.66667} />
            </button>
          </div>

          <div
            className="w-full"
            onKeyDown={(e) => {
              // Preserve Enter-to-submit now that there is no native <form>.
              // Ignore Enter in the textarea so it can still insert newlines.
              if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
                e.preventDefault();
                handleSubmit();
              }
            }}
          >
            {/* Body */}
            <div className="flex flex-col items-start p-[24px_24px_0px] gap-[16px] w-full">
              {/* General Error Banner */}
              {error && <ErrorAlert>{error}</ErrorAlert>}

              {/* Form Fields Container */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-[24px] w-full">

                {/* Loan Product Row */}
                <div className="flex flex-col items-start p-0 gap-[6px] w-full">
                  <label className="font-roboto font-medium text-[14px] leading-[20px] text-[#111827]">
                    Loan Product <span className="text-red-500">*</span>
                  </label>
                  <div className="w-full relative z-50">
                    <SelectField
                      options={productOptions}
                      value={loanType}
                      onChange={(v) => {
                        setLoanType(v);
                        clearFieldError('loan_type', 'loanType');
                      }}
                      error={typeError}
                      placeholder="Select Loan Product"
                    />
                  </div>
                </div>

                {/* Loan Amount Row */}
                <div className="flex flex-col items-start p-0 gap-[6px] w-full">
                  <label className="font-roboto font-medium text-[14px] leading-[20px] text-[#111827]">
                    Loan Amount <span className="text-red-500">*</span>
                  </label>
                  <NumericInput
                    placeholder="Enter Loan Amount"
                    value={loanAmount}
                    onChange={(e) => {
                      setLoanAmount(e.target.value);
                      clearFieldError('loan_amount', 'loanAmount');
                    }}
                    className={`box-border flex flex-row items-center p-[8px_16px] w-full h-[44px] bg-white border rounded-[8px] font-roboto font-normal text-[14px] leading-[16px] text-[#111827] placeholder:text-[#C6C6C6] outline-none focus:ring-1 ${amountError
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-[#16A34A] focus:border-[#16A34A] focus:ring-[#16A34A]'
                      }`}
                  />
                  {amountError && (
                    <span className="text-red-500 font-roboto text-xs mt-1">
                      {amountError}
                    </span>
                  )}
                </div>

              {/* Product Details Card (Shown on Selection) */}
              {selectedProduct && (
                <div className="w-full bg-[#F0FDF4] border border-[#BBF7D0] rounded-[8px] p-3.5 flex flex-col gap-2 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[#166534] font-semibold text-xs">
                      <Building2 size={15} className="text-[#16A34A] shrink-0" />
                      <span>{selectedProduct.bank_name || selectedProduct.bank || 'Lending Institution'}</span>
                    </div>
                    {selectedCategory && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#DCFCE7] text-[#15803D] capitalize">
                        {selectedCategory.replace(/-/g, ' ')}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-[#BBF7D0]/60 text-xs">
                    <div>
                      <span className="text-[#4B5563] text-[11px] block font-medium">Allowable Amount</span>
                      <span className="font-semibold text-[#111827]">
                        {selectedProduct.min_amount != null && selectedProduct.max_amount != null
                          ? `${formatAmount(selectedProduct.min_amount)} – ${formatAmount(selectedProduct.max_amount)}`
                          : selectedProduct.max_amount != null
                            ? `Up to ${formatAmount(selectedProduct.max_amount)}`
                            : selectedProduct.min_amount != null
                              ? `From ${formatAmount(selectedProduct.min_amount)}`
                              : '—'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[#4B5563] text-[11px] block font-medium">Interest Rate</span>
                      <span className="font-semibold text-[#111827]">
                        {formatRateRange(selectedProduct.min_interest_rate, selectedProduct.max_interest_rate)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[#4B5563] text-[11px] block font-medium">Tenure</span>
                      <span className="font-semibold text-[#111827]">
                        {formatTenure(selectedProduct.tenure_months)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

                {/* Purpose Message Row */}
                <div className="flex flex-col items-start p-0 gap-[6px] w-full sm:col-span-2">
                  <label className="font-roboto font-medium text-[14px] leading-[20px] text-[#111827]">
                    Purpose Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    placeholder="Enter purpose message"
                    value={purposeMessage}
                    onChange={(e) => {
                      setPurposeMessage(e.target.value);
                      clearFieldError('purpose_message', 'purposeMessage');
                    }}
                    className={`box-border flex flex-row justify-center items-start p-[12px_16px] w-full h-[140px] bg-white border rounded-[8px] font-roboto font-normal text-[14px] leading-[16px] text-[#111827] placeholder:text-[#C6C6C6] outline-none focus:ring-1 resize-none ${
                      purposeError
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                        : 'border-[#D1D5DB] focus:border-[#3B82F6] focus:ring-[#3B82F6]'
                    }`}
                  />
                  {purposeError && (
                    <span className="text-red-500 font-roboto text-xs mt-1">
                      {purposeError}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="box-border flex flex-row justify-end items-center p-[24px] gap-[12px] w-full h-[87px] border-t border-[#E5E7EB] mt-[24px]">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="box-border flex flex-col justify-center items-center p-[8px_16px] w-[76.86px] h-[40px] bg-white border border-[#D4D4D4] shadow-[0px_1px_2px_rgba(0,0,0,0.05)] rounded-[8px] hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="font-roboto font-medium text-[14px] leading-[20px] text-center text-[#111827]">
                  Cancel
                </span>
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || !loanType || !loanAmount || !purposeMessage}
                className="relative flex flex-row justify-center items-center p-[10px_24px] min-w-[93px] h-[40px] bg-[#16A34A] rounded-[8px] hover:bg-[#15803d] transition-colors overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#16A34A]"
              >
                <div className="absolute inset-0 bg-white/0 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] rounded-[8px]" />
                <span className="relative z-10 font-roboto font-semibold text-[14px] leading-[20px] text-center text-white flex items-center gap-2">
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    'Submit'
                  )}
                </span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  );

  return <Portal>{modalContent}</Portal>;
}
