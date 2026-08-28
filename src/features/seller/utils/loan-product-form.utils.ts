import { onboardingService } from '@/features/seller/api/onboarding.service';
import type { TaxonomyAttribute } from '@/lib/api/api.schemas';

// Shared form/validation/upload logic used by both AddLoanProductModal and
// EditLoanProductModal to avoid duplicating this behavior in two places.

export interface ProductFormState {
  productName: string;
  minInterestRate: string;
  maxInterestRate: string;
  minAmount: string;
  maxAmount: string;
  tenureMonths: string;
  description: string;
}

export const initialProductFormState: ProductFormState = {
  productName: '',
  minInterestRate: '',
  maxInterestRate: '',
  minAmount: '',
  maxAmount: '',
  tenureMonths: '',
  description: '',
};

export const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;

export function toNumber(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

// Shared by AddLoanProductModal and EditLoanProductModal so both forms apply
// the same field-level rules — previously only Add validated and surfaced
// per-field errors, which is exactly the kind of drift duplicated JSX invites.
export function validateProductForm(form: ProductFormState): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.productName.trim()) errors.product_name = 'Product name is required.';
  if (!form.minInterestRate.trim()) errors.min_interest_rate = 'Required.';
  if (!form.maxAmount.trim()) errors.max_amount = 'Required.';
  if (!form.tenureMonths.trim()) errors.tenure_months = 'Required.';
  const minRate = toNumber(form.minInterestRate);
  const maxRate = form.maxInterestRate.trim() ? toNumber(form.maxInterestRate) : null;
  const minAmt = form.minAmount.trim() ? toNumber(form.minAmount) : null;
  const maxAmt = toNumber(form.maxAmount);
  if (maxRate !== null && minRate !== null && maxRate < minRate)
    errors.max_interest_rate = 'Must be ≥ minimum interest rate.';
  if (minAmt !== null && maxAmt !== null && minAmt > maxAmt)
    errors.min_amount = 'Must be ≤ maximum amount.';
  return errors;
}

export function toggleSelectedId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((existing) => existing !== id) : [...ids, id];
}

export function mapTermOptions<T extends { term_id: string; term_name: string }>(
  terms: T[] | undefined
): Array<{ term_id: string; term_name: string }> | undefined {
  return terms && terms.length > 0 ? terms.map((t) => ({ term_id: t.term_id, term_name: t.term_name })) : undefined;
}

export function filterEligibilityAttributes(
  attributes: TaxonomyAttribute[] | undefined
): TaxonomyAttribute[] | undefined {
  return attributes?.filter(
    (attr) => !attr.term_name.startsWith('Tag_') && !attr.term_name.startsWith('Category_')
  );
}

export function buildAttributesPayload(
  selectedAttributeTermIds: string[],
  fetchedAttributes: TaxonomyAttribute[]
): Record<string, string[]> {
  const attributesPayload: Record<string, string[]> = {};
  selectedAttributeTermIds.forEach((termId) => {
    const matched = fetchedAttributes.find((attr) => attr.term_id === termId);
    if (matched) {
      const taxonomyKey = matched.slug || matched.term_id;
      if (!attributesPayload[taxonomyKey]) {
        attributesPayload[taxonomyKey] = [];
      }
      attributesPayload[taxonomyKey].push(matched.term_id);
    }
  });
  return attributesPayload;
}

// Reads a File as a base64 data URL, mirroring the previous inline FileReader usage exactly.
export function readImageFileAsDataUrl(file: File, onResult: (dataUrl: string) => void): void {
  const reader = new FileReader();
  reader.onloadend = () => onResult(reader.result as string);
  reader.readAsDataURL(file);
}

// Resolves the image URL to submit: an already-hosted URL is passed through unchanged,
// a freshly-selected data URL is uploaded, and no image yields undefined.
export async function resolveProductImageUrl(imagePreview: string | null): Promise<string | undefined> {
  if (!imagePreview) return undefined;
  if (imagePreview.startsWith('data:')) {
    const base64Content = imagePreview.split(',')[1] ?? '';
    const uploadRes = await onboardingService.uploadImage({ filename: 'product-image.jpg', filedata: base64Content });
    return uploadRes.data?.file_url;
  }
  // Any non-data-URL preview is an already-hosted image — either an absolute
  // http(s) URL or a same-origin proxied /api/files/... path (see
  // toProxiedFileUrl) — so it's passed through unchanged rather than matched
  // against a specific URL shape.
  return imagePreview;
}
