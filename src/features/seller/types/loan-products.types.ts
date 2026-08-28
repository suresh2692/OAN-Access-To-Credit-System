export interface ListProductsParams {
  status?: 'Active' | 'Archived' | 'Pending Approval' | 'Rejected';
  search?: string;
  category?: string;
  tag?: string;
  min_interest_rate?: number;
  max_interest_rate?: number;
  min_amount?: number;
  max_amount?: number;
  tenure_months?: number;
  limit?: number;
  start?: number;
}

export interface CreateLoanProductPayload {
  product_name: string;
  min_interest_rate: number;
  max_amount: number;
  tenure_months: number;
  max_interest_rate?: number;
  min_amount?: number;
  description?: string;
  image?: string;
  product_meta?: Array<{ meta_key: string; meta_value: string }>;
}

export interface UpdateLoanProductPayload {
  product_id: string;
  product_name?: string;
  min_interest_rate?: number;
  max_interest_rate?: number;
  min_amount?: number;
  max_amount?: number;
  tenure_months?: number;
  description?: string;
  image?: string;
  product_meta?: Array<{ meta_key: string; meta_value: string }>;
}

export interface CreateLoanProductCompoundInput {
  payload: CreateLoanProductPayload;
  categoryTermIds?: string[];
  tagTermIds?: string[];
  attributes?: Record<string, string[]>;
  refetchParams?: ListProductsParams;
}

export interface UpdateLoanProductCompoundInput {
  payload: UpdateLoanProductPayload;
  categoryTermIds?: string[];
  tagTermIds?: string[];
  attributes?: Record<string, string[]>;
  refetchParams?: ListProductsParams;
}

export interface ArchiveLoanProductInput {
  productId: string;
  reason?: string;
  refetchParams?: ListProductsParams;
}

// `reason` means something different per status, so the shape is a discriminated
// union rather than one optional field: a required approval comment when
// approving, optional when archiving, a required explanation when rejecting, and
// nothing when moving a product back to Pending Approval.
export type SetLoanProductStatusInput = {
  productId: string;
  refetchParams?: ListProductsParams;
} & (
  | { status: 'Active'; reason: string }
  | { status: 'Archived'; reason?: string }
  | { status: 'Rejected'; reason: string }
  | { status: 'Pending Approval'; reason?: never }
);
