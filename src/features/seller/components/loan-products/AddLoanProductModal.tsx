'use client';
import {
  clearMutationError,
  createProductCompound,
  fetchTaxonomy,
  selectAttributes,
  selectCategories,
  selectMutationFieldErrors,
  selectProductsMutationError,
  selectProductsMutationStatus,
  selectTags
} from '@/features/seller/store/loanProductsSlice';
import { logger } from '@/lib/logger';
import { toast } from '@/lib/toast';
import type { CreateLoanProductCompoundInput, CreateLoanProductPayload } from '@/features/seller/types/loan-products.types';
import {
  buildAttributesPayload,
  filterEligibilityAttributes,
  initialProductFormState as initialFormState,
  mapTermOptions,
  MAX_PRODUCT_IMAGE_BYTES,
  readImageFileAsDataUrl,
  resolveProductImageUrl,
  toggleSelectedId,
  toNumber,
  validateProductForm,
  type ProductFormState
} from '@/features/seller/utils/loan-product-form.utils';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { Loader2, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { BaseLoanProductModal } from './BaseLoanProductModal';

interface AddLoanProductModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddLoanProductModal({ isOpen, onClose }: AddLoanProductModalProps) {
  const dispatch = useAppDispatch();
  const mutationStatus = useAppSelector(selectProductsMutationStatus);
  const mutationError = useAppSelector(selectProductsMutationError);
  const backendFieldErrors = useAppSelector(selectMutationFieldErrors);
  const fetchedCategories = useAppSelector(selectCategories);
  const fetchedTags = useAppSelector(selectTags);
  const fetchedAttributes = useAppSelector(selectAttributes);

  const [form, setForm] = useState<ProductFormState>(initialFormState);
  const [selectedCategoryTermIds, setSelectedCategoryTermIds] = useState<string[]>([]);
  const [selectedTagTermIds, setSelectedTagTermIds] = useState<string[]>([]);
  const [selectedAttributeTermIds, setSelectedAttributeTermIds] = useState<string[]>([]);
  const [isSuccess, setIsSuccess] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // This modal stays mounted while closed (isOpen just gates the render inside BaseLoanProductModal)
    // so its form state must be reset here on reopen.
    if (isOpen) {
      void dispatch(fetchTaxonomy());
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(initialFormState);
      setSelectedCategoryTermIds([]);
      setSelectedTagTermIds([]);
      setSelectedAttributeTermIds([]);
      setIsSuccess(false);
      setLocalError(null);
      setFieldErrors({});
      setImagePreview(null);
      dispatch(clearMutationError());
    }
  }, [dispatch, isOpen]);

  // Merge backend field errors into local field errors when they arrive
  useEffect(() => {
    if (backendFieldErrors && Object.keys(backendFieldErrors).length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFieldErrors(backendFieldErrors);
    }
  }, [backendFieldErrors]);

  const handleFormChange = (updates: Partial<ProductFormState>) => {
    setForm((curr) => ({ ...curr, ...updates }));
  };

  const clearFieldError = (key: string) =>
    setFieldErrors((prev) => { const next = { ...prev }; delete next[key]; return next; });

  const toggleAttribute = (termId: string) => {
    setSelectedAttributeTermIds((prev) => toggleSelectedId(prev, termId));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_PRODUCT_IMAGE_BYTES) {
      setLocalError('Image size must be less than 5MB.');
      return;
    }
    readImageFileAsDataUrl(file, setImagePreview);
  };

  const handleCreatePublish = async () => {
    const errors = validateProductForm(form);
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }

    const productName = form.productName.trim();
    const minInterestRate = toNumber(form.minInterestRate)!;
    const maxInterestRate = form.maxInterestRate.trim() ? toNumber(form.maxInterestRate) : null;
    const minAmount = form.minAmount.trim() ? toNumber(form.minAmount) : null;
    const maxAmount = toNumber(form.maxAmount)!;
    const tenureMonths = toNumber(form.tenureMonths)!;

    setFieldErrors({});
    setLocalError(null);
    setIsSuccess(false);

    // Upload image first if one was selected
    let imageUrl: string | undefined;
    try {
      imageUrl = await resolveProductImageUrl(imagePreview);
    } catch (error) {
      logger.error('Loan product image upload failed (create)', { error });
      setLocalError('Failed to upload product image. Please try again.');
      return;
    }

    // Dynamic grouping of selected attributes by taxonomy key/slug
    const attributesPayload = buildAttributesPayload(selectedAttributeTermIds, fetchedAttributes);

    const createPayload: CreateLoanProductPayload = {
      product_name: productName,
      min_interest_rate: minInterestRate,
      max_amount: maxAmount,
      tenure_months: tenureMonths,
    };

    if (maxInterestRate !== null) createPayload.max_interest_rate = maxInterestRate;
    if (minAmount !== null) createPayload.min_amount = minAmount;
    if (form.description.trim()) createPayload.description = form.description.trim();
    if (imageUrl) createPayload.image = imageUrl;

    const compoundInput: CreateLoanProductCompoundInput = {
      payload: createPayload,
    };
    if (selectedCategoryTermIds.length > 0) {
      compoundInput.categoryTermIds = selectedCategoryTermIds;
    }
    if (selectedTagTermIds.length > 0) {
      compoundInput.tagTermIds = selectedTagTermIds;
    }
    if (Object.keys(attributesPayload).length > 0) {
      compoundInput.attributes = attributesPayload;
    }

    const result = await dispatch(createProductCompound(compoundInput));

    if (createProductCompound.fulfilled.match(result)) {
      setIsSuccess(true);
      setForm(initialFormState);
    } else {
      const errMsg =
        (result.payload as { message?: string } | undefined)?.message ??
        'Failed to create loan product.';
      toast.error(errMsg);
    }
  };

  const isSubmitting = mutationStatus === 'loading';
  const categoryOptions = mapTermOptions(fetchedCategories);
  const tagOptions = mapTermOptions(fetchedTags);
  const realAttributes = filterEligibilityAttributes(fetchedAttributes);

  const footerActions = (
    <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 border-t border-gray-200 p-4 sm:p-6 bg-white">
      <button
        type="button"
        onClick={onClose}
        disabled={isSubmitting}
        className="w-full sm:w-auto rounded-lg border border-gray-300 px-6 py-2.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={handleCreatePublish}
        disabled={isSubmitting}
        className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-[#16A34A] px-6 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#15803d] disabled:cursor-not-allowed disabled:opacity-80"
      >
        {isSubmitting ? <Loader2 size={16} className="animate-spin shrink-0" /> : <Plus size={16} strokeWidth={2.5} className="shrink-0" />}
        <span className='font-semibold whitespace-nowrap'>{isSubmitting ? 'Publishing...' : 'Create & Publish'}</span>
      </button>
    </div>
  );

  return (
    <BaseLoanProductModal
      isOpen={isOpen}
      onClose={onClose}
      mode="add"
      form={form}
      onFormChange={handleFormChange}
      imagePreview={imagePreview}
      onImageSelect={handleImageSelect}
      onImageRemove={() => setImagePreview(null)}
      fileInputRef={fileInputRef}
      categoryOptions={categoryOptions}
      tagOptions={tagOptions}
      realAttributes={realAttributes}
      selectedCategoryTermIds={selectedCategoryTermIds}
      onChangeCategories={setSelectedCategoryTermIds}
      selectedTagTermIds={selectedTagTermIds}
      onChangeTags={setSelectedTagTermIds}
      selectedAttributeTermIds={selectedAttributeTermIds}
      onToggleAttribute={toggleAttribute}
      fieldErrors={fieldErrors}
      onClearFieldError={clearFieldError}
      globalError={localError ?? mutationError}
      footerActions={footerActions}
      isSuccess={isSuccess}
      onSuccessDone={() => {
        onClose();
        setTimeout(() => setIsSuccess(false), 300);
      }}
    />
  );
}
