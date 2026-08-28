'use client';
import { Portal } from '@/components/Portal';
import { LoanProductCreatedSuccess } from '@/features/seller/components/dashboard/LoanProductCreatedSuccess';
import { LoanTypeDropdown } from '@/features/seller/components/dashboard/LoanTypeDropdown';
import { ProductAttributesGrid, ProductImageDropzone, ProductTextField, type ProductFieldMode } from '@/features/seller/components/loan-products/ProductFormFields';
import type { ProductFormState } from '@/features/seller/utils/loan-product-form.utils';
import { useModalA11y } from '@/hooks/useModalA11y';
import type { TaxonomyAttribute } from '@/lib/api/api.schemas';
import { AlertCircle, Loader2, Package, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useId } from 'react';

interface BaseLoanProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  // The single source of truth for this modal's behaviour and styling:
  //   add  → compact create form
  //   edit → roomier update form
  //   view → edit layout, rendered read-only
  mode: ProductFieldMode;
  // Optional header overrides; each mode has a sensible default (see MODE_HEADER).
  title?: string;
  subtitle?: string;

  // Data / State
  form: ProductFormState;
  // The interaction callbacks below are optional: in read-only ('view') mode every
  // input is disabled, so a read-only caller can omit them instead of passing no-op
  // stubs. They default to no-ops inside the component.
  onFormChange?: (updates: Partial<ProductFormState>) => void;

  // Image
  imagePreview: string | null;
  onImageSelect?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImageRemove?: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;

  // Taxonomy Options
  categoryOptions: { term_id: string; term_name: string }[] | undefined;
  tagOptions: { term_id: string; term_name: string }[] | undefined;
  realAttributes: TaxonomyAttribute[] | undefined;

  // Taxonomy Selections
  selectedCategoryTermIds: string[];
  onChangeCategories?: (ids: string[]) => void;

  selectedTagTermIds: string[];
  onChangeTags?: (ids: string[]) => void;

  selectedAttributeTermIds: string[];
  onToggleAttribute?: (id: string) => void;

  // Errors / Loading
  fieldErrors?: Record<string, string>;
  onClearFieldError?: (key: string) => void;
  globalError?: string | null;
  isLoadingDetail?: boolean;
  detailError?: string | null;
  // Bank Admin's reason for rejecting the product; shown as a banner so the
  // seller knows what to fix before resubmitting. Absent for non-rejected ones.
  rejectionComment?: string | null;

  // Actions
  footerActions: ReactNode;

  // Success Flow — only the create/edit flows reach success; view omits both.
  isSuccess?: boolean;
  onSuccessDone?: () => void;
}

// Default header copy per mode; callers may still override via title/subtitle.
const MODE_HEADER: Record<ProductFieldMode, { title: string; subtitle: string }> = {
  add: { title: 'New Loan Product', subtitle: 'Products you create are published immediately as Active.' },
  edit: { title: 'Edit Loan Product', subtitle: 'Changes are saved to the bank product catalog.' },
  view: { title: 'View Loan Product', subtitle: 'Viewing product details.' },
};

export function BaseLoanProductModal({
  isOpen, onClose, mode, title, subtitle,
  form, onFormChange = () => { },
  imagePreview, onImageSelect = () => { }, onImageRemove = () => { }, fileInputRef,
  categoryOptions, tagOptions, realAttributes,
  selectedCategoryTermIds, onChangeCategories = () => { },
  selectedTagTermIds, onChangeTags = () => { },
  selectedAttributeTermIds, onToggleAttribute = () => { },
  fieldErrors = {}, onClearFieldError = () => { }, globalError,
  isLoadingDetail = false, detailError,
  rejectionComment,
  footerActions,
  isSuccess = false, onSuccessDone = () => { },
}: BaseLoanProductModalProps) {
  const dialogRef = useModalA11y<HTMLDivElement>(isOpen, onClose);
  const titleId = useId();

  if (!isOpen) return null;

  const readOnly = mode === 'view';
  const resolvedTitle = title ?? MODE_HEADER[mode].title;
  const resolvedSubtitle = subtitle ?? MODE_HEADER[mode].subtitle;

  const labelClass = mode === 'add' ? 'text-xs text-gray-900' : 'text-[14px] text-[#1F2937]';
  const textareaClass = mode === 'add'
    ? 'border-gray-300 px-3.5 py-2 text-sm text-gray-900 focus:border-[#16A34A] focus:ring-[#16A34A]/20'
    : 'border-[#D1D5DB] px-4 py-2.5 text-[14px] focus:border-[#00C48C] focus:ring-[#00C48C]';

  return (
    <Portal>
      <div className="fixed inset-0 z-1000 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className={`flex max-h-[92vh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200 ${isSuccess ? 'max-w-[520px]' : 'max-w-[700px]'
            }`}
        >
          {isSuccess ? (
            <LoanProductCreatedSuccess onDone={onSuccessDone} />
          ) : (
            <>
              {/* Header */}
              <div className="flex items-start justify-between border-b border-gray-200 p-4 sm:p-6 gap-4">
                <div className="flex items-start sm:items-center space-x-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#E6F9F3]">
                    <Package className="h-6 w-6 text-[#00C48C]" />
                  </div>
                  <div className="pt-0.5 sm:pt-0">
                    <h2 id={titleId} className="text-[18px] font-bold text-[#1F2937] leading-tight">{resolvedTitle}</h2>
                    <p className="text-[14px] text-[#6B7280] mt-1 pr-2">{resolvedSubtitle}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 shrink-0 -mr-2 sm:mr-0"
                  aria-label="Close modal"
                >
                  <X size={24} />
                </button>
              </div>

              {isLoadingDetail ? (
                <div className="flex items-center justify-center p-12">
                  <Loader2 size={32} className="animate-spin text-[#00C48C]" />
                </div>
              ) : detailError ? (
                <div className="p-6">
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">
                    {detailError}
                  </div>
                </div>
              ) : (
                <div className="flex-1 space-y-6 overflow-y-auto p-6">
                  {rejectionComment ? (
                    <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                      <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-500" />
                      <div>
                        <p className="text-[13px] font-bold text-red-700">Rejection reason</p>
                        <p className="mt-0.5 whitespace-pre-line text-[14px] text-red-700">{rejectionComment}</p>
                      </div>
                    </div>
                  ) : null}

                  <ProductImageDropzone
                    mode={mode}
                    imagePreview={imagePreview}
                    onPick={() => fileInputRef.current?.click()}
                    onRemove={onImageRemove}
                    fileInputRef={fileInputRef}
                    onFileSelect={onImageSelect}
                    altText="Product"
                    placeholderText={readOnly ? "No product image" : "Click to upload product image"}
                    disabled={readOnly}
                  />

                  <ProductTextField
                    mode={mode}
                    label="Product Name"
                    required={!readOnly}
                    value={form.productName}
                    onChange={(v) => { onClearFieldError('product_name'); onFormChange({ productName: v }); }}
                    placeholder="Enter Product Name"
                    error={fieldErrors.product_name}
                    disabled={readOnly}
                  />

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className={`block font-bold mb-1.5 ${labelClass}`}>
                        Loan Type {!readOnly && <span className="text-red-500">*</span>}
                      </label>
                      <LoanTypeDropdown
                        selectedTypes={selectedCategoryTermIds}
                        options={categoryOptions}
                        placeholder="Select Loan Type"
                        singleSelect={true}
                        hideCheckbox={true}
                        onChange={onChangeCategories}
                        disabled={readOnly}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className={`block font-bold mb-1.5 ${labelClass}`}>
                        Loan Tags
                      </label>
                      <LoanTypeDropdown
                        selectedTypes={selectedTagTermIds}
                        options={tagOptions}
                        placeholder="Select Loan Tags"
                        onChange={onChangeTags}
                        disabled={readOnly}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <ProductTextField
                      mode={mode}
                      label="Min Interest rate (% p.a.)"
                      required={!readOnly}
                      type="number"
                      min="0"
                      max="99.99"
                      step="0.01"
                      maxIntegerDigits={2}
                      maxDecimalDigits={2}
                      value={form.minInterestRate}
                      onChange={(v) => { onClearFieldError('min_interest_rate'); onFormChange({ minInterestRate: v }); }}
                      placeholder="Enter minimum interest rate"
                      error={fieldErrors.min_interest_rate}
                      disabled={readOnly}
                    />
                    <ProductTextField
                      mode={mode}
                      label="Max interest rate (% p.a.)"
                      type="number"
                      min="0"
                      max="99.99"
                      step="0.01"
                      maxIntegerDigits={2}
                      maxDecimalDigits={2}
                      value={form.maxInterestRate}
                      onChange={(v) => { onClearFieldError('max_interest_rate'); onFormChange({ maxInterestRate: v }); }}
                      placeholder="Optional"
                      error={fieldErrors.max_interest_rate}
                      disabled={readOnly}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <ProductTextField
                      mode={mode}
                      label="Min amount (ETB)"
                      type="number"
                      min="0"
                      max="999999"
                      step="1"
                      maxDigits={6}
                      value={form.minAmount}
                      onChange={(v) => { onClearFieldError('min_amount'); onFormChange({ minAmount: v }); }}
                      placeholder="Optional"
                      error={fieldErrors.min_amount}
                      disabled={readOnly}
                    />
                    <ProductTextField
                      mode={mode}
                      label="Max amount (ETB)"
                      required={!readOnly}
                      type="number"
                      min="0"
                      max="999999"
                      step="1"
                      maxDigits={6}
                      value={form.maxAmount}
                      onChange={(v) => { onClearFieldError('max_amount'); onFormChange({ maxAmount: v }); }}
                      placeholder="Enter maximum amount"
                      error={fieldErrors.max_amount}
                      disabled={readOnly}
                    />
                  </div>

                  <ProductTextField
                    mode={mode}
                    label="Tenure (months)"
                    required={!readOnly}
                    type="number"
                    min="1"
                    max="9999"
                    step="1"
                    maxDigits={4}
                    value={form.tenureMonths}
                    onChange={(v) => { onClearFieldError('tenure_months'); onFormChange({ tenureMonths: v }); }}
                    placeholder="Enter tenure in months"
                    error={fieldErrors.tenure_months}
                    disabled={readOnly}
                  />

                  <ProductAttributesGrid
                    mode={mode}
                    heading="Eligibility Attributes"
                    attributes={realAttributes}
                    selectedAttributeTermIds={selectedAttributeTermIds}
                    onToggle={onToggleAttribute}
                    emptyMessage="No eligibility attributes configured."
                    disabled={readOnly}
                  />

                  <div className="space-y-1.5">
                    <label className={`block font-bold mb-1.5 ${labelClass}`}>Description</label>
                    <textarea
                      value={form.description}
                      onChange={(event) => onFormChange({ description: event.target.value })}
                      placeholder={readOnly ? "No description provided." : "Optional product description"}
                      rows={3}
                      disabled={readOnly}
                      className={`w-full rounded-lg border focus:outline-none focus:ring-1 ${textareaClass} ${readOnly ? 'bg-gray-50 opacity-70 cursor-not-allowed' : ''}`}
                    />
                  </div>

                  {globalError ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">
                      {globalError}
                    </div>
                  ) : null}
                </div>
              )}

              {footerActions}
            </>
          )}
        </div>
      </div>
    </Portal>
  );
}
