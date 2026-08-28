import type {
    LoanProductDetail, LoanProductSummary, SellerDashboardStats, TaxonomyAttribute, TaxonomyCategory,
    TaxonomyTag
} from '@/lib/api/api.schemas';
import { extractFieldErrors } from '@/lib/api/fetchApi';
import { logger } from '@/lib/logger';
import type { AppDispatch, RootState } from '@/store';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { loanProductsService, DEFAULT_ARCHIVE_REASON, AUTO_APPROVAL_REASON } from '../api/loan-products.service';
import { taxonomyService } from '../api/taxonomy.service';
import type {
    ArchiveLoanProductInput, CreateLoanProductCompoundInput, ListProductsParams, SetLoanProductStatusInput, UpdateLoanProductCompoundInput
} from '../types/loan-products.types';

type AsyncStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

interface LoanProductsState {
  products: LoanProductSummary[];
  selectedProductDetail: LoanProductDetail | null;
  productComment: string | null;
  commentStatus: AsyncStatus;
  categories: TaxonomyCategory[];
  tags: TaxonomyTag[];
  attributes: TaxonomyAttribute[];
  stats: SellerDashboardStats | null;
  listStatus: AsyncStatus;
  detailStatus: AsyncStatus;
  taxonomyStatus: AsyncStatus;
  statsStatus: AsyncStatus;
  mutationStatus: AsyncStatus;
  listError: string | null;
  detailError: string | null;
  mutationError: string | null;
  mutationFieldErrors: Record<string, string> | null;
  latestDetailRequestId: string | null;
  latestCommentRequestId: string | null;
  /**
   * Bumped whenever a product mutation lands, for views that read the catalog
   * endpoint rather than `products` above. See `invalidateCatalog`.
   */
  catalogVersion: number;
}

const initialState: LoanProductsState = {
  products: [],
  selectedProductDetail: null,
  productComment: null,
  commentStatus: 'idle',
  categories: [],
  tags: [],
  attributes: [],
  stats: null,
  listStatus: 'idle',
  detailStatus: 'idle',
  taxonomyStatus: 'idle',
  statsStatus: 'idle',
  mutationStatus: 'idle',
  listError: null,
  detailError: null,
  mutationError: null,
  mutationFieldErrors: null,
  latestDetailRequestId: null,
  latestCommentRequestId: null,
  catalogVersion: 0,
};

export const fetchProducts = createAsyncThunk(
  'sellerProducts/fetchProducts',
  async (params: ListProductsParams | undefined, { rejectWithValue }) => {
    try {
      const response = await loanProductsService.listProducts(params);
      return response.data;
    } catch (error) {
      logger.error('fetchProducts thunk failed', { error });
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to load loan products');
    }
  }
);

export const fetchProductDetail = createAsyncThunk(
  'sellerProducts/fetchProductDetail',
  async (productId: string, { rejectWithValue }) => {
    try {
      const response = await loanProductsService.getProduct(productId);
      return response.data;
    } catch (error) {
      logger.error('fetchProductDetail thunk failed', { productId, error });
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to load product details');
    }
  }
);

export const fetchProductComment = createAsyncThunk(
  'sellerProducts/fetchProductComment',
  async (productId: string, { rejectWithValue }) => {
    try {
      const response = await loanProductsService.getProductComment(productId);
      return response.data;
    } catch (error) {
      logger.error('fetchProductComment thunk failed', { productId, error });
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to load product comment');
    }
  }
);

export const fetchTaxonomy = createAsyncThunk(
  'sellerProducts/fetchTaxonomy',
  async (_, { rejectWithValue }) => {
    try {
      const [categoriesRes, tagsRes, attributesRes] = await Promise.all([
        taxonomyService.getCategories(),
        taxonomyService.getTags(),
        taxonomyService.getAttributes(),
      ]);
      return {
        categories: categoriesRes.data,
        tags: tagsRes.data,
        attributes: attributesRes.data,
      };
    } catch (error) {
      logger.error('fetchTaxonomy thunk failed', { error });
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to load taxonomy metadata');
    }
  },
  {
    condition: (_, { getState }) => {
      const state = getState() as RootState;
      const status = state.sellerProducts.taxonomyStatus;
      if (status === 'succeeded' || status === 'loading') {
        return false;
      }
      return true;
    }
  }
);

export const fetchDashboardStats = createAsyncThunk(
  'sellerProducts/fetchDashboardStats',
  async (bankCode: string | undefined, { rejectWithValue }) => {
    try {
      const response = await loanProductsService.getDashboardStats(bankCode);
      return response.data;
    } catch (error) {
      logger.error('fetchDashboardStats thunk failed', { bankCode, error });
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to load dashboard statistics');
    }
  }
);

/**
 * Publishes a product straight to Active when the acting user is a Bank Admin.
 *
 * A Bank Admin is the person who would otherwise sit in the approval queue, so
 * routing their own product through it just to have them approve it themselves
 * is a no-op with extra clicks. Every other user kind — Bank Agents especially —
 * still lands in Pending Approval and needs a real review.
 *
 * Returns whether the product ended up approved so callers refetch exactly once:
 * `setProductStatus` already refetches, a plain create/edit does not.
 */
async function autoApproveIfBankAdmin(
  productId: string,
  refetchParams: ListProductsParams | undefined,
  dispatch: AppDispatch,
  getState: () => RootState,
): Promise<boolean> {
  if (getState().auth.user?.kind !== 'bank_admin') return false;

  // `refetchParams` is spread rather than assigned: the project runs with
  // `exactOptionalPropertyTypes`, so an explicit `undefined` is not a valid
  // value for the optional property.
  const result = await dispatch(setProductStatus({
    productId,
    status: 'Active',
    reason: AUTO_APPROVAL_REASON,
    ...(refetchParams !== undefined ? { refetchParams } : {}),
  }));

  if (setProductStatus.rejected.match(result)) {
    // The product exists but is still Pending Approval. Not fatal — a human can
    // approve it from the queue — but it must not pass silently, and the caller
    // still needs a refetch so the list shows the real status rather than the
    // Active one we failed to set.
    logger.error('Auto-approval failed; product remains Pending Approval', { productId });
    return false;
  }
  return true;
}

/**
 * Refreshes every view a product mutation invalidates.
 *
 * There are three, and missing one is how a page ends up showing pre-mutation
 * data: the seller list this slice holds, the sidebar's pending-approval count,
 * and the catalog. The catalog is the one that bites — the bank's own loan
 * product page renders `farmer.catalog.list_catalog`, not the
 * `seller.list_products` that lands in `products`, so refetching this slice
 * leaves that page untouched.
 *
 * Called from exactly one place per mutation. `createProductCompound` and
 * `updateProductCompound` delegate to `setProductStatus` when they
 * auto-approve, and calling this on both sides would fire two catalog requests
 * for one edit.
 */
async function refreshProductViews(
  refetchParams: ListProductsParams | undefined,
  dispatch: AppDispatch,
): Promise<void> {
  // Dispatched before the await so the catalog request goes out alongside the
  // seller-list one rather than queueing behind it.
  dispatch(invalidateCatalog());
  await dispatch(fetchProducts(refetchParams));
  dispatch(fetchDashboardStats());
}

export const createProductCompound = createAsyncThunk<
  { product_ids: string[] },
  CreateLoanProductCompoundInput,
  { state: RootState; dispatch: AppDispatch }
>(
  'sellerProducts/createProductCompound',
  async (input, { dispatch, getState, rejectWithValue }) => {
    try {
      const created = await loanProductsService.createProduct(input.payload);
      const productId = created.data.product_ids?.[0];

      if (!productId) {
        throw new Error('No product ID returned from creation');
      }

      if (input.categoryTermIds && input.categoryTermIds.length > 0) {
        await taxonomyService.setProductCategories(productId, input.categoryTermIds);
      }
      if (input.tagTermIds && input.tagTermIds.length > 0) {
        await taxonomyService.setProductTags(productId, input.tagTermIds);
      }
      if (input.attributes && Object.keys(input.attributes).length > 0) {
        await taxonomyService.setProductAttributes(productId, input.attributes);
      }

      const approved = await autoApproveIfBankAdmin(productId, input.refetchParams, dispatch, getState);
      // Skipped when approval succeeded: `setProductStatus` refreshed already.
      if (!approved) {
        await refreshProductViews(input.refetchParams, dispatch);
      }
      return created.data;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to create loan product';
      logger.error('createProductCompound thunk failed', msg);
      return rejectWithValue({ message: msg, fieldErrors: extractFieldErrors(error) });
    }
  }
);

export const updateProductCompound = createAsyncThunk<
  { product_id: string },
  UpdateLoanProductCompoundInput,
  { state: RootState; dispatch: AppDispatch }
>(
  'sellerProducts/updateProductCompound',
  async (input, { dispatch, getState, rejectWithValue }) => {
    try {
      const updated = await loanProductsService.updateProduct(input.payload);
      const productId = input.payload.product_id;

      if (input.categoryTermIds !== undefined) {
        await taxonomyService.setProductCategories(productId, input.categoryTermIds);
      }
      if (input.tagTermIds !== undefined) {
        await taxonomyService.setProductTags(productId, input.tagTermIds);
      }
      if (input.attributes !== undefined) {
        await taxonomyService.setProductAttributes(productId, input.attributes);
      }

      const approved = await autoApproveIfBankAdmin(productId, input.refetchParams, dispatch, getState);
      // Skipped when approval succeeded: `setProductStatus` refreshed already.
      if (!approved) {
        await refreshProductViews(input.refetchParams, dispatch);
      }

      return updated.data;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to update loan product';
      logger.error('updateProductCompound thunk failed', msg);
      return rejectWithValue({ message: msg, fieldErrors: extractFieldErrors(error) });
    }
  }
);

export const setProductStatus = createAsyncThunk<
  null,
  SetLoanProductStatusInput,
  { state: RootState; dispatch: AppDispatch }
>(
  'sellerProducts/setProductStatus',
  async (input, { dispatch, rejectWithValue }) => {
    try {
      const response = await loanProductsService.setProductStatus(input.productId, input.status, input.reason);
      // Approving/rejecting moves a product out of "pending" and changes the
      // badge on its catalog card, so every view has to be told.
      await refreshProductViews(input.refetchParams, dispatch);
      return response.data;
    } catch (error) {
      logger.error('setProductStatus thunk failed', { input, error });
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update loan product status');
    }
  }
);

export const archiveProduct = createAsyncThunk<
  null,
  string | ArchiveLoanProductInput,
  { state: RootState; dispatch: AppDispatch }
>(
  'sellerProducts/archiveProduct',
  async (input, { dispatch, rejectWithValue }) => {
    try {
      const productId = typeof input === 'string' ? input : input.productId;
      const reason = typeof input === 'string' ? DEFAULT_ARCHIVE_REASON : (input.reason?.trim() || DEFAULT_ARCHIVE_REASON);
      const refetchParams = typeof input === 'string' ? undefined : input.refetchParams;
      const response = await loanProductsService.archiveProduct(productId, reason);
      await refreshProductViews(refetchParams, dispatch);
      return response.data;
    } catch (error) {
      logger.error('archiveProduct thunk failed', { input, error });
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to archive loan product');
    }
  }
);

const loanProductsSlice = createSlice({
  name: 'sellerProducts',
  initialState,
  reducers: {
    clearMutationError(state) {
      state.mutationError = null;
      state.mutationFieldErrors = null;
      state.mutationStatus = 'idle';
    },
    clearSelectedProductDetail(state) {
      state.selectedProductDetail = null;
      state.detailStatus = 'idle';
    },
    clearProductComment(state) {
      state.productComment = null;
      state.commentStatus = 'idle';
    },
    /**
     * Marks the shared loan-product catalog stale.
     *
     * A counter rather than a flag nobody would clear: views subscribe to the
     * value and refetch when it moves, so there is no "who resets it" question
     * and two views can react to the same mutation independently.
     */
    invalidateCatalog(state) {
      state.catalogVersion += 1;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (s) => { s.listStatus = 'loading'; s.listError = null; })
      .addCase(fetchProducts.fulfilled, (s, action) => { s.listStatus = 'succeeded'; s.products = action.payload; })
      .addCase(fetchProducts.rejected, (s, action) => { s.listStatus = 'failed'; s.listError = action.payload as string; })
      .addCase(fetchProductDetail.pending, (s, action) => { s.latestDetailRequestId = action.meta.requestId; s.detailStatus = 'loading'; s.detailError = null; })
      .addCase(fetchProductDetail.fulfilled, (s, action) => { 
        if (s.latestDetailRequestId !== action.meta.requestId) return;
        s.detailStatus = 'succeeded'; s.selectedProductDetail = action.payload; 
      })
      .addCase(fetchProductDetail.rejected, (s, action) => { 
        if (s.latestDetailRequestId !== action.meta.requestId) return;
        s.detailStatus = 'failed'; s.detailError = action.payload as string; 
      })
      .addCase(fetchProductComment.pending, (s, action) => { s.latestCommentRequestId = action.meta.requestId; s.commentStatus = 'loading'; s.productComment = null; })
      .addCase(fetchProductComment.fulfilled, (s, action) => { 
        if (s.latestCommentRequestId !== action.meta.requestId) return;
        s.commentStatus = 'succeeded'; s.productComment = action.payload; 
      })
      .addCase(fetchProductComment.rejected, (s, action) => { 
        if (s.latestCommentRequestId !== action.meta.requestId) return;
        s.commentStatus = 'failed'; s.productComment = null; 
      })
      .addCase(fetchTaxonomy.pending, (s) => { s.taxonomyStatus = 'loading'; })
      .addCase(fetchTaxonomy.fulfilled, (s, action) => {
        s.taxonomyStatus = 'succeeded';
        s.categories = action.payload.categories;
        s.tags = action.payload.tags;
        s.attributes = action.payload.attributes;
      })
      .addCase(fetchTaxonomy.rejected, (s) => { s.taxonomyStatus = 'failed'; })
      .addCase(fetchDashboardStats.pending, (s) => { s.statsStatus = 'loading'; })
      .addCase(fetchDashboardStats.fulfilled, (s, action) => { s.statsStatus = 'succeeded'; s.stats = action.payload; })
      .addCase(fetchDashboardStats.rejected, (s) => { s.statsStatus = 'failed'; })
      .addCase(createProductCompound.pending, (s) => { s.mutationStatus = 'loading'; s.mutationError = null; s.mutationFieldErrors = null; })
      .addCase(createProductCompound.fulfilled, (s) => { s.mutationStatus = 'succeeded'; s.mutationFieldErrors = null; })
      .addCase(createProductCompound.rejected, (s, action) => {
        const p = action.payload as { message: string; fieldErrors: Record<string, string> } | undefined;
        s.mutationStatus = 'failed';
        s.mutationError = p?.message ?? 'Failed to create loan product';
        s.mutationFieldErrors = p?.fieldErrors ?? null;
      })
      .addCase(updateProductCompound.pending, (s) => { s.mutationStatus = 'loading'; s.mutationError = null; s.mutationFieldErrors = null; })
      .addCase(updateProductCompound.fulfilled, (s) => { s.mutationStatus = 'succeeded'; })
      .addCase(updateProductCompound.rejected, (s, action) => {
        const p = action.payload as { message: string; fieldErrors: Record<string, string> } | undefined;
        s.mutationStatus = 'failed';
        s.mutationError = p?.message ?? 'Failed to update loan product';
        s.mutationFieldErrors = p?.fieldErrors ?? null;
      })
      .addCase(archiveProduct.pending, (s) => { s.mutationStatus = 'loading'; s.mutationError = null; })
      .addCase(archiveProduct.fulfilled, (s) => { s.mutationStatus = 'succeeded'; })
      .addCase(archiveProduct.rejected, (s, action) => { s.mutationStatus = 'failed'; s.mutationError = action.payload as string; });
  },
});

export const { clearMutationError, clearSelectedProductDetail, clearProductComment, invalidateCatalog } = loanProductsSlice.actions;
export const sellerProductsReducer = loanProductsSlice.reducer;
export default loanProductsSlice.reducer;

export const selectProducts = (state: RootState) => state.sellerProducts.products;
export const selectSelectedProductDetail = (state: RootState) => state.sellerProducts.selectedProductDetail;
export const selectCategories = (state: RootState) => state.sellerProducts.categories;
export const selectTags = (state: RootState) => state.sellerProducts.tags;
export const selectAttributes = (state: RootState) => state.sellerProducts.attributes;
export const selectSellerStats = (state: RootState) => state.sellerProducts.stats;
export const selectProductsListStatus = (state: RootState) => state.sellerProducts.listStatus;
export const selectProductsListError = (state: RootState) => state.sellerProducts.listError;
export const selectProductsMutationStatus = (state: RootState) => state.sellerProducts.mutationStatus;
export const selectProductsMutationError = (state: RootState) => state.sellerProducts.mutationError;
export const selectDetailStatus = (state: RootState) => state.sellerProducts.detailStatus;
export const selectDetailError = (state: RootState) => state.sellerProducts.detailError;
export const selectMutationFieldErrors = (state: RootState) => state.sellerProducts.mutationFieldErrors;
export const selectProductComment = (state: RootState) => state.sellerProducts.productComment;
export const selectProductCommentStatus = (state: RootState) => state.sellerProducts.commentStatus;
/** Pass to `CatalogBrowser.refreshToken` from any view that renders the catalog. */
export const selectCatalogVersion = (state: RootState) => state.sellerProducts.catalogVersion;
