'use client';
import {
    clearMutationError,
    clearProductComment,
    fetchProductComment,
    fetchProductDetail,
    fetchTaxonomy,
    selectAttributes,
    selectProductComment,
    selectCategories,
    selectDetailError,
    selectDetailStatus,
    selectProductsMutationError,
    selectProductsMutationStatus,
    selectSelectedProductDetail,
    selectTags,
    updateProductCompound
} from '@/features/seller/store/loanProductsSlice';
import { logger } from '@/lib/logger';
import { toast } from '@/lib/toast';
import type { UpdateLoanProductCompoundInput, UpdateLoanProductPayload } from '@/features/seller/types/loan-products.types';
import type { LoanProductSummary } from '@/lib/api/api.schemas';
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
import { Loader2, Save } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { BaseLoanProductModal } from './BaseLoanProductModal';
import { canEditLoanProduct } from './LoanProductCard';

type EditableProduct = LoanProductSummary | { id?: string; name?: string; title?: string; product_name?: string };

interface EditLoanProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: EditableProduct | null;
}

function getProductStatus(product: EditableProduct): string | undefined {
  if ('status' in product && typeof product.status === 'string') {
    return product.status;
  }
  return undefined;
}

function getProductId(product: EditableProduct): string {
  if ('name' in product && typeof product.name === 'string' && product.name) {
    return product.name;
  }
  if ('id' in product && typeof product.id === 'string' && product.id) {
    return product.id;
  }
  return '';
}

export function EditLoanProductModal({ isOpen, onClose, product }: EditLoanProductModalProps) {
  const dispatch = useAppDispatch();
  const mutationStatus = useAppSelector(selectProductsMutationStatus);
  const mutationError = useAppSelector(selectProductsMutationError);
  const detail = useAppSelector(selectSelectedProductDetail);
  const detailStatus = useAppSelector(selectDetailStatus);
  const productComment = useAppSelector(selectProductComment);
  const detailError = useAppSelector(selectDetailError);
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
    // This modal stays mounted while closed (isOpen just gates the render via
    // the early return inside BaseLoanProductModal), so its form state must be reset here on
    // reopen rather than relying on unmount/remount to clear stale values.
    if (isOpen && product) {
      void dispatch(fetchTaxonomy());
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsSuccess(false);
      setLocalError(null);
      setFieldErrors({});
      setImagePreview(null);
      dispatch(clearMutationError());
      dispatch(clearProductComment());
      const pId = getProductId(product);
      if (pId) {
        dispatch(fetchProductDetail(pId));
        // The rejection comment only exists for rejected products, so only that
        // case is worth a round trip; everything else stays without a banner.
        if (getProductStatus(product) === 'Rejected') {
          dispatch(fetchProductComment(pId));
        }
      }
    }
  }, [dispatch, isOpen, product]);

  useEffect(() => {
    // Populates the form once the fetched product detail arrives
    if (detail && detailStatus === 'succeeded') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({
        productName: detail.product_name ?? '',
        minInterestRate: detail.min_interest_rate?.toString() ?? '',
        maxInterestRate: detail.max_interest_rate?.toString() ?? '',
        minAmount: detail.min_amount?.toString() ?? '',
        maxAmount: detail.max_amount?.toString() ?? '',
        tenureMonths: detail.tenure_months?.toString() ?? '',
        description: detail.description ?? '',
      });

      if (detail.image) setImagePreview(detail.image);

      if (detail.categories && detail.categories.length > 0) {
        setSelectedCategoryTermIds(detail.categories);
      }
      if (detail.tags && detail.tags.length > 0) {
        setSelectedTagTermIds(detail.tags);
      }
      if (detail.attributes && Object.keys(detail.attributes).length > 0) {
        const flatAttrKeys = Object.values(detail.attributes).flat();
        setSelectedAttributeTermIds(flatAttrKeys);
      }
    }
  }, [detail, detailStatus]);

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
    if (file.size > MAX_PRODUCT_IMAGE_BYTES) { setLocalError('Image size must be less than 5MB.'); return; }
    readImageFileAsDataUrl(file, setImagePreview);
  };

  const productStatus = detail?.status ?? getProductStatus(product as EditableProduct);
  const canEdit = canEditLoanProduct(productStatus);

  const handleSaveData = async () => {
    if (!product) {
      setLocalError('No loan product selected.');
      return;
    }
    const productId = getProductId(product);
    if (!productId) {
      setLocalError('Invalid loan product ID.');
      return;
    }

    if (!canEdit) {
      setLocalError('Active or pending loan products cannot be edited.');
      return;
    }

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

    // Upload image if user selected a new one (base64 = new selection; URL = existing)
    let imageUrl: string | undefined;
    try {
      imageUrl = await resolveProductImageUrl(imagePreview);
    } catch (error) {
      logger.error('Loan product image upload failed (update)', { error });
      setLocalError('Failed to upload product image. Please try again.');
      return;
    }

    // Group selected attributes by their backend slug/taxonomy key
    const attributesPayload = buildAttributesPayload(selectedAttributeTermIds, fetchedAttributes);

    const updatePayload: UpdateLoanProductPayload = {
      product_id: productId,
      product_name: productName,
      min_interest_rate: minInterestRate,
      max_amount: maxAmount,
      tenure_months: tenureMonths,
    };

    if (maxInterestRate !== null) {
      updatePayload.max_interest_rate = maxInterestRate;
    }
    if (minAmount !== null) {
      updatePayload.min_amount = minAmount;
    }
    if (form.description.trim() !== '') updatePayload.description = form.description.trim();
    if (imageUrl) updatePayload.image = imageUrl;

    const compoundInput: UpdateLoanProductCompoundInput = {
      payload: updatePayload,
      categoryTermIds: selectedCategoryTermIds,
      tagTermIds: selectedTagTermIds,
      attributes: attributesPayload,
    };

    const result = await dispatch(updateProductCompound(compoundInput));

    if (updateProductCompound.fulfilled.match(result)) {
      setIsSuccess(true);
    } else {
      const errMsg =
        (result.payload as { message?: string } | undefined)?.message ??
        'Failed to update loan product.';
      toast.error(errMsg);
    }
  };

  const isSubmitting = mutationStatus === 'loading';
  const isLoadingDetail = detailStatus === 'loading' || detailStatus === 'idle';
  const categoryOptions = mapTermOptions(fetchedCategories);
  const tagOptions = mapTermOptions(fetchedTags);
  const realAttributes = filterEligibilityAttributes(fetchedAttributes);

  const footerActions = (
    <div className="flex items-center justify-end gap-4 border-t border-[#E5E7EB] p-6">
      <button
        type="button"
        onClick={onClose}
        disabled={isSubmitting}
        className="rounded-lg border border-[#D1D5DB] bg-white px-6 py-2.5 text-[14px] font-bold text-[#374151] transition-colors hover:bg-gray-50 disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={handleSaveData}
        disabled={isSubmitting || isLoadingDetail || !canEdit}
        className="flex min-w-[160px] items-center justify-center gap-2 rounded-lg bg-[#16A34A] px-6 py-2.5 text-[14px] font-bold text-white transition-colors hover:bg-[#15803d] disabled:cursor-not-allowed disabled:opacity-80"
      >
        {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
        <span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
      </button>
    </div>
  );

  return (
    <BaseLoanProductModal
      isOpen={isOpen}
      onClose={onClose}
      mode="edit"
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
      isLoadingDetail={isLoadingDetail}
      detailError={detailError}
      rejectionComment={productComment}
      footerActions={footerActions}
      isSuccess={isSuccess}
      onSuccessDone={() => {
        onClose();
        setTimeout(() => setIsSuccess(false), 300);
      }}
    />
  );
}
