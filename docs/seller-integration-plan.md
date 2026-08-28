# Loan Marketplace Seller — Frontend Integration Plan

> **Audience:** Frontend engineers implementing the Seller (Bank Admin & Bank Agent) API integration.
> **Source of truth for endpoints:** [`docs/seller-backend.md`](file:///Users/arnav/Code/OAN-Access-To-Credit-System/docs/seller-backend.md) (backend API contract).
> **Scope:** Replace all mock/stub data on the seller surface (loan products, dashboard stats, KYC/onboarding, team management, seller registration) with real API calls, wired through Redux Toolkit, Zod-validated, with strict error handling and full adherence to `AGENTS.md` engineering standards.

---

## 0. Architectural Conventions & Engineering Standards

This codebase uses **Redux Toolkit** (`createAsyncThunk` + slices) for server-state management, direct `fetch` via the shared `fetchApi` helper (`src/lib/api/fetchApi.ts`), and **Zod** for runtime response validation.

### 0.1 Core Guidelines (Mandatory)

1. **Strict TypeScript & Zero `any`**: Every service, slice, schema, and component must be fully typed. Use `unknown` with Zod validation or explicit type guards when parsing external data.
2. **Explicit Async State Modeling**: Model async operations using explicit status unions (`'idle' | 'loading' | 'succeeded' | 'failed'`). Never substitute empty collections (`[]`), zeroes (`0`), or empty strings (`""`) for unresolved/loading state.
3. **No Lazy Optionals or Fake Defaults**: Do not mark fields as optional (`?`) merely to bypass type errors. Model missing domain states explicitly as `null` or via discriminated unions.
4. **No Silent Failures**: Every `catch` block must perform structured logging (`logger.error(...)`) with relevant context before propagating errors via `rejectWithValue` or custom typed error classes.
5. **Named Exports**: Prefer named exports for all services, thunks, selectors, types, and components.

---

## 0.2 Directory Layout — Shared Seller Feature

Bank Admin and Bank Agent call the **same** underlying seller API surface (Agents access a restricted subset of pages, not a different API). To eliminate code duplication, all seller data-layer logic lives in a unified feature directory. Role-Based Access Control (RBAC) is enforced at the route/proxy level (`src/proxy.ts` and `hasPortalAccess` in `src/lib/auth/rbac.ts`) — **services, slices, and schemas remain role-agnostic**.

```
src/features/seller/
├── api/
│   ├── loan-products.service.ts     # list_products, get_product, create_product, update_product, set_product_status
│   ├── taxonomy.service.ts          # get_categories, get_tags, get_attributes, set_product_{categories,tags,attributes}
│   ├── team.service.ts              # list_users, invite_team_member, deactivate_user, update_user_profile
│   └── onboarding.service.ts        # register_seller, save_org_contacts, upload_kyc_document, get_bank_status, update_bank_status
├── store/
│   ├── loanProductsSlice.ts         # Products, product detail, taxonomy terms, seller dashboard stats
│   ├── teamSlice.ts                 # Bank team member list, invite & profile mutation state
│   └── onboardingSlice.ts           # Bank onboarding status, contact details, KYC document state
├── types/
│   ├── loan-products.types.ts       # Loan product domain types and thunk payload contracts
│   ├── team.types.ts                # Team user domain types and invite/update payloads
│   └── onboarding.types.ts          # KYC & onboarding payload contracts
├── utils/
│   └── pdf-validation.ts            # Client-side PDF binary & Base64 validation engine
└── components/
    ├── loan-products/               # Shared product list, cards, modals (Add/Edit/Archive)
    ├── team/                        # Team member table, invite modal, edit modal (Bank Admin)
    ├── onboarding/                  # KYC upload card, org contact form, bank status banner
    └── dashboard/                   # Seller metric cards and product performance summaries
```

Portal pages in `src/app/(bank-admin)/` and `src/app/(bank-agent)/` act as thin wrappers importing composed components from `src/features/seller/components/`.

---

## 0.3 Complete Endpoint Coverage Matrix


| Endpoint                           | Method | Phase | Service Method                          | Target Slice        | Scope / Notes                              |
| ------------------------------------ | -------- | ------- | ----------------------------------------- | --------------------- | -------------------------------------------- |
| `auth.login`                       | POST   | —    | `authApi.loginUser`                     | `authSlice`         | ✅ Existing                                |
| `auth.refresh`                     | POST   | —    | `authApi.refreshToken`                  | `authSlice`         | ✅ Existing (`fetchApi` interceptor)       |
| `auth.logout`                      | POST   | —    | `authApi.logoutUser`                    | `authSlice`         | ✅ Existing                                |
| `auth.get_me`                      | GET    | —    | `authApi.getMe`                         | `authSlice`         | ✅ Existing                                |
| `auth.forgot_password`             | POST   | ❌    | Deferred                                | —                  | Separate authentication recovery task      |
| `auth.reset_password`              | POST   | ❌    | Deferred                                | —                  | Separate authentication recovery task      |
| `onboarding.register_seller`       | POST   | A     | `onboardingService.registerSeller`      | `onboardingSlice`   | Guest accessible; used on`/create-account` |
| `onboarding.register_bank`         | POST   | ❌    | Deferred                                | —                  | Out of scope for seller integration        |
| `onboarding.save_org_contacts`     | POST   | B     | `onboardingService.saveOrgContacts`     | `onboardingSlice`   | Bank Admin KYC page                        |
| `onboarding.upload_kyc_document`   | POST   | B     | `onboardingService.uploadKycDocument`   | `onboardingSlice`   | Bank Admin KYC page (validated PDF Base64) |
| `onboarding.get_bank_status`       | GET    | B     | `onboardingService.getBankStatus`       | `onboardingSlice`   | Bank Admin KYC page & status banner        |
| `onboarding.update_bank_status`    | POST   | B     | `onboardingService.updateBankStatus`    | `onboardingSlice`   | Triggered when KYC requirements met        |
| `onboarding.list_users`            | GET    | C     | `teamService.listUsers`                 | `teamSlice`         | Bank Admin team management page            |
| `onboarding.invite_team_member`    | POST   | C     | `teamService.inviteTeamMember`          | `teamSlice`         | Bank Admin invite modal                    |
| `onboarding.deactivate_user`       | POST   | C     | `teamService.deactivateUser`            | `teamSlice`         | Bank Admin team member actions             |
| `onboarding.update_user_profile`   | POST   | C     | `teamService.updateUserProfile`         | `teamSlice`         | Bank Admin edit team member modal          |
| `dashboard.get_stats`              | GET    | D     | `loanProductsService.getDashboardStats` | `loanProductsSlice` | Both Bank Admin & Bank Agent dashboards    |
| `loan_products.list_products`      | GET    | E     | `loanProductsService.listProducts`      | `loanProductsSlice` | Shared product list for Admin & Agent      |
| `loan_products.get_product`        | GET    | E     | `loanProductsService.getProduct`        | `loanProductsSlice` | Populates Edit Loan Product modal          |
| `loan_products.create_product`     | POST   | E     | `loanProductsService.createProduct`     | `loanProductsSlice` | Shared Add Product modal                   |
| `loan_products.update_product`     | POST   | E     | `loanProductsService.updateProduct`     | `loanProductsSlice` | Shared Edit Product modal                  |
| `loan_products.set_product_status` | POST   | E     | `loanProductsService.setProductStatus`  | `loanProductsSlice` | Status transition & archiving              |
| `taxonomy.get_categories`          | GET    | E     | `taxonomyService.getCategories`         | `loanProductsSlice` | Populates product category selector        |
| `taxonomy.get_tags`                | GET    | E     | `taxonomyService.getTags`               | `loanProductsSlice` | Populates product tag selector             |
| `taxonomy.get_attributes`          | GET    | E     | `taxonomyService.getAttributes`         | `loanProductsSlice` | Populates eligibility criteria selector    |
| `taxonomy.set_product_categories`  | POST   | E     | `taxonomyService.setProductCategories`  | `loanProductsSlice` | Assigns category terms to product          |
| `taxonomy.set_product_tags`        | POST   | E     | `taxonomyService.setProductTags`        | `loanProductsSlice` | Assigns tag terms to product               |
| `taxonomy.set_product_attributes`  | POST   | E     | `taxonomyService.setProductAttributes`  | `loanProductsSlice` | Assigns eligibility criteria dictionary    |
| `taxonomy.create_category`         | POST   | ⛔    | N/A                                     | —                  | A2C Platform Admin only                    |
| `taxonomy.create_tag`              | POST   | ⛔    | N/A                                     | —                  | A2C Platform Admin only                    |
| `taxonomy.create_attribute_term`   | POST   | ⛔    | N/A                                     | —                  | A2C Platform Admin only                    |

---

## 1. The Redux & Service Data Architecture

Every API transaction strictly follows this unidirection data pipeline:
`Component → dispatch(thunk) → service → fetchApi → Zod validateResponse → Redux reducer → memoized selector → Component`

### 1.1 Service Layer Implementations

Services are stateless object singletons with explicit method return types. Read methods invoke `validateResponse(schema, data, endpointName)` to enforce contract safety. Thrown errors are never swallowed inside services.

```ts
// src/features/seller/api/loan-products.service.ts
import { fetchApi } from '@/lib/api/fetchApi';
import {
  validateResponse,
  loanProductSummarySchema,
  loanProductDetailSchema,
  sellerDashboardStatsSchema,
  type LoanProductSummary,
  type LoanProductDetail,
  type SellerDashboardStats,
} from '@/lib/api/api.schemas';
import type { ApiResponse } from '@/types/api';
import { z } from 'zod';
import type { ListProductsParams, CreateLoanProductPayload, UpdateLoanProductPayload } from '../types/loan-products.types';

export const loanProductsService = {
  async listProducts(params?: ListProductsParams): Promise<ApiResponse<LoanProductSummary[]>> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          query.append(key, String(value));
        }
      });
    }
    const path = `oan_a2c.api.v1.seller.loan_products.list_products?${query.toString()}`;
    const raw = (await fetchApi(path)) as ApiResponse<Record<string, unknown>>;
    const productsData = raw.data?.products;

    return {
      ...raw,
      data: validateResponse(z.array(loanProductSummarySchema), productsData, 'seller.list_products'),
    };
  },

  async getProduct(productId: string): Promise<ApiResponse<LoanProductDetail>> {
    const path = `oan_a2c.api.v1.seller.loan_products.get_product?product_id=${encodeURIComponent(productId)}`;
    const raw = (await fetchApi(path)) as ApiResponse<Record<string, unknown>>;
    const productData = raw.data?.product;

    return {
      ...raw,
      data: validateResponse(loanProductDetailSchema, productData, 'seller.get_product'),
    };
  },

  async createProduct(payload: CreateLoanProductPayload): Promise<ApiResponse<{ product_id: string }>> {
    return fetchApi('oan_a2c.api.v1.seller.loan_products.create_product', {
      method: 'POST',
      body: JSON.stringify(payload),
    }) as Promise<ApiResponse<{ product_id: string }>>;
  },

  async updateProduct(payload: UpdateLoanProductPayload): Promise<ApiResponse<{ product_id: string }>> {
    return fetchApi('oan_a2c.api.v1.seller.loan_products.update_product', {
      method: 'POST',
      body: JSON.stringify(payload),
    }) as Promise<ApiResponse<{ product_id: string }>>;
  },

  async setProductStatus(productId: string, status: 'Draft' | 'Active' | 'Archived'): Promise<ApiResponse<null>> {
    return fetchApi('oan_a2c.api.v1.seller.loan_products.set_product_status', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId, status }),
    }) as Promise<ApiResponse<null>>;
  },

  async archiveProduct(productId: string): Promise<ApiResponse<null>> {
    return this.setProductStatus(productId, 'Archived');
  },

  async getDashboardStats(bankCode?: string): Promise<ApiResponse<SellerDashboardStats>> {
    const path = bankCode
      ? `oan_a2c.api.v1.seller.dashboard.get_stats?bank=${encodeURIComponent(bankCode)}`
      : 'oan_a2c.api.v1.seller.dashboard.get_stats';
    const raw = (await fetchApi(path)) as ApiResponse<Record<string, unknown>>;
    const statsData = raw.data?.stats;

    return {
      ...raw,
      data: validateResponse(sellerDashboardStatsSchema, statsData, 'seller.get_stats'),
    };
  },
};
```

```ts
// src/features/seller/api/taxonomy.service.ts
import { fetchApi } from '@/lib/api/fetchApi';
import {
  validateResponse,
  taxonomyCategorySchema,
  taxonomyTagSchema,
  taxonomyAttributeSchema,
  type TaxonomyCategory,
  type TaxonomyTag,
  type TaxonomyAttribute,
} from '@/lib/api/api.schemas';
import type { ApiResponse } from '@/types/api';
import { z } from 'zod';

export const taxonomyService = {
  async getCategories(): Promise<ApiResponse<TaxonomyCategory[]>> {
    const raw = (await fetchApi('oan_a2c.api.v1.seller.taxonomy.get_categories')) as ApiResponse<Record<string, unknown>>;
    return {
      ...raw,
      data: validateResponse(z.array(taxonomyCategorySchema), raw.data?.categories, 'seller.get_categories'),
    };
  },

  async getTags(): Promise<ApiResponse<TaxonomyTag[]>> {
    const raw = (await fetchApi('oan_a2c.api.v1.seller.taxonomy.get_tags')) as ApiResponse<Record<string, unknown>>;
    return {
      ...raw,
      data: validateResponse(z.array(taxonomyTagSchema), raw.data?.tags, 'seller.get_tags'),
    };
  },

  async getAttributes(): Promise<ApiResponse<TaxonomyAttribute[]>> {
    const raw = (await fetchApi('oan_a2c.api.v1.seller.taxonomy.get_attributes')) as ApiResponse<Record<string, unknown>>;
    return {
      ...raw,
      data: validateResponse(z.array(taxonomyAttributeSchema), raw.data?.attributes, 'seller.get_attributes'),
    };
  },

  async setProductCategories(productId: string, termIds: string[]): Promise<ApiResponse<null>> {
    return fetchApi('oan_a2c.api.v1.seller.taxonomy.set_product_categories', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId, term_ids: termIds }),
    }) as Promise<ApiResponse<null>>;
  },

  async setProductTags(productId: string, termIds: string[]): Promise<ApiResponse<null>> {
    return fetchApi('oan_a2c.api.v1.seller.taxonomy.set_product_tags', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId, term_ids: termIds }),
    }) as Promise<ApiResponse<null>>;
  },

  async setProductAttributes(productId: string, attributes: Record<string, string[]>): Promise<ApiResponse<null>> {
    return fetchApi('oan_a2c.api.v1.seller.taxonomy.set_product_attributes', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId, attributes }),
    }) as Promise<ApiResponse<null>>;
  },
};
```

```ts
// src/features/seller/api/onboarding.service.ts
import { fetchApi } from '@/lib/api/fetchApi';
import { validateResponse, bankStatusSchema, type BankStatus } from '@/lib/api/api.schemas';
import type { ApiResponse } from '@/types/api';
import type { RegisterSellerPayload, SaveOrgContactsPayload, UploadKycDocumentPayload } from '../types/onboarding.types';

export const onboardingService = {
  async registerSeller(payload: RegisterSellerPayload): Promise<ApiResponse<{ message: string }>> {
    return fetchApi('oan_a2c.api.v1.seller.onboarding.register_seller', {
      method: 'POST',
      body: JSON.stringify(payload),
    }) as Promise<ApiResponse<{ message: string }>>;
  },

  async saveOrgContacts(payload: SaveOrgContactsPayload): Promise<ApiResponse<{ message: string }>> {
    return fetchApi('oan_a2c.api.v1.seller.onboarding.save_org_contacts', {
      method: 'POST',
      body: JSON.stringify(payload),
    }) as Promise<ApiResponse<{ message: string }>>;
  },

  async uploadKycDocument(payload: UploadKycDocumentPayload): Promise<ApiResponse<{ message: string; file_url: string }>> {
    return fetchApi('oan_a2c.api.v1.seller.onboarding.upload_kyc_document', {
      method: 'POST',
      body: JSON.stringify(payload),
    }) as Promise<ApiResponse<{ message: string; file_url: string }>>;
  },

  async getBankStatus(): Promise<ApiResponse<BankStatus>> {
    const raw = (await fetchApi('oan_a2c.api.v1.seller.onboarding.get_bank_status')) as ApiResponse<Record<string, unknown>>;
    return {
      ...raw,
      data: validateResponse(bankStatusSchema, raw.data, 'seller.get_bank_status'),
    };
  },

  async updateBankStatus(bankCode: string, newStatus: 'Onboarding' | 'Active' | 'Suspended'): Promise<ApiResponse<{ message: string }>> {
    return fetchApi('oan_a2c.api.v1.seller.onboarding.update_bank_status', {
      method: 'POST',
      body: JSON.stringify({ bank_code: bankCode, new_status: newStatus }),
    }) as Promise<ApiResponse<{ message: string }>>;
  },
};
```

```ts
// src/features/seller/api/team.service.ts
import { fetchApi } from '@/lib/api/fetchApi';
import { validateResponse, teamUserSchema, type TeamUser } from '@/lib/api/api.schemas';
import type { ApiResponse } from '@/types/api';
import { z } from 'zod';
import type { InviteTeamMemberPayload, UpdateUserProfilePayload } from '../types/team.types';

export const teamService = {
  async listUsers(): Promise<ApiResponse<TeamUser[]>> {
    const raw = (await fetchApi('oan_a2c.api.v1.seller.onboarding.list_users')) as ApiResponse<Record<string, unknown>>;
    return {
      ...raw,
      data: validateResponse(z.array(teamUserSchema), raw.data?.users, 'seller.list_users'),
    };
  },

  async inviteTeamMember(payload: InviteTeamMemberPayload): Promise<ApiResponse<{ message: string }>> {
    return fetchApi('oan_a2c.api.v1.seller.onboarding.invite_team_member', {
      method: 'POST',
      body: JSON.stringify(payload),
    }) as Promise<ApiResponse<{ message: string }>>;
  },

  async deactivateUser(email: string): Promise<ApiResponse<{ message: string }>> {
    return fetchApi('oan_a2c.api.v1.seller.onboarding.deactivate_user', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }) as Promise<ApiResponse<{ message: string }>>;
  },

  async updateUserProfile(payload: UpdateUserProfilePayload): Promise<ApiResponse<{ message: string }>> {
    return fetchApi('oan_a2c.api.v1.seller.onboarding.update_user_profile', {
      method: 'POST',
      body: JSON.stringify(payload),
    }) as Promise<ApiResponse<{ message: string }>>;
  },
};
```

---

### 1.2 Redux Slice Specifications

Slices maintain clear isolation between read state (`listStatus`) and mutation state (`mutationStatus`).

```ts
// src/features/seller/store/loanProductsSlice.ts
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { RootState } from '@/store';
import { loanProductsService } from '../api/loan-products.service';
import { taxonomyService } from '../api/taxonomy.service';
import { logger } from '@/lib/logger';
import type {
  LoanProductSummary,
  LoanProductDetail,
  SellerDashboardStats,
  TaxonomyCategory,
  TaxonomyTag,
  TaxonomyAttribute,
} from '@/lib/api/api.schemas';
import type {
  ListProductsParams,
  CreateLoanProductCompoundInput,
  UpdateLoanProductCompoundInput,
} from '../types/loan-products.types';

type AsyncStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

interface LoanProductsState {
  products: LoanProductSummary[];
  selectedProductDetail: LoanProductDetail | null;
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
}

const initialState: LoanProductsState = {
  products: [],
  selectedProductDetail: null,
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

export const createProductCompound = createAsyncThunk(
  'sellerProducts/createProductCompound',
  async (input: CreateLoanProductCompoundInput, { dispatch, rejectWithValue }) => {
    try {
      const created = await loanProductsService.createProduct(input.payload);
      const productId = created.data.product_id;

      if (input.categoryTermIds && input.categoryTermIds.length > 0) {
        await taxonomyService.setProductCategories(productId, input.categoryTermIds);
      }
      if (input.tagTermIds && input.tagTermIds.length > 0) {
        await taxonomyService.setProductTags(productId, input.tagTermIds);
      }
      if (input.attributes && Object.keys(input.attributes).length > 0) {
        await taxonomyService.setProductAttributes(productId, input.attributes);
      }

      await dispatch(fetchProducts());
      return created.data;
    } catch (error) {
      logger.error('createProductCompound thunk failed', { input, error });
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create loan product');
    }
  }
);

export const updateProductCompound = createAsyncThunk(
  'sellerProducts/updateProductCompound',
  async (input: UpdateLoanProductCompoundInput, { dispatch, rejectWithValue }) => {
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

      await dispatch(fetchProducts());
      return updated.data;
    } catch (error) {
      logger.error('updateProductCompound thunk failed', { input, error });
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update loan product');
    }
  }
);

export const archiveProduct = createAsyncThunk(
  'sellerProducts/archiveProduct',
  async (productId: string, { dispatch, rejectWithValue }) => {
    try {
      const response = await loanProductsService.archiveProduct(productId);
      await dispatch(fetchProducts());
      return response.data;
    } catch (error) {
      logger.error('archiveProduct thunk failed', { productId, error });
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
      state.mutationStatus = 'idle';
    },
    clearSelectedProductDetail(state) {
      state.selectedProductDetail = null;
      state.detailStatus = 'idle';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (s) => { s.listStatus = 'loading'; s.listError = null; })
      .addCase(fetchProducts.fulfilled, (s, action) => { s.listStatus = 'succeeded'; s.products = action.payload; })
      .addCase(fetchProducts.rejected, (s, action) => { s.listStatus = 'failed'; s.listError = action.payload as string; })
      .addCase(fetchProductDetail.pending, (s) => { s.detailStatus = 'loading'; s.detailError = null; })
      .addCase(fetchProductDetail.fulfilled, (s, action) => { s.detailStatus = 'succeeded'; s.selectedProductDetail = action.payload; })
      .addCase(fetchProductDetail.rejected, (s, action) => { s.detailStatus = 'failed'; s.detailError = action.payload as string; })
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
      .addCase(createProductCompound.pending, (s) => { s.mutationStatus = 'loading'; s.mutationError = null; })
      .addCase(createProductCompound.fulfilled, (s) => { s.mutationStatus = 'succeeded'; })
      .addCase(createProductCompound.rejected, (s, action) => { s.mutationStatus = 'failed'; s.mutationError = action.payload as string; })
      .addCase(updateProductCompound.pending, (s) => { s.mutationStatus = 'loading'; s.mutationError = null; })
      .addCase(updateProductCompound.fulfilled, (s) => { s.mutationStatus = 'succeeded'; })
      .addCase(updateProductCompound.rejected, (s, action) => { s.mutationStatus = 'failed'; s.mutationError = action.payload as string; })
      .addCase(archiveProduct.pending, (s) => { s.mutationStatus = 'loading'; s.mutationError = null; })
      .addCase(archiveProduct.fulfilled, (s) => { s.mutationStatus = 'succeeded'; })
      .addCase(archiveProduct.rejected, (s, action) => { s.mutationStatus = 'failed'; s.mutationError = action.payload as string; });
  },
});

export const { clearMutationError, clearSelectedProductDetail } = loanProductsSlice.actions;
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
```

---

## 2. API Error Resilience & Classification

The central `fetchApi` function handles standard session refreshes on `401` and throws structured `ApiError` instances. The frontend seller feature translates these errors gracefully into UI feedback.

### 2.1 Error Mapping Matrix


| Backend Code           | HTTP | Cause                                     | Frontend Handling Strategy                                                                                             |
| ------------------------ | ------ | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `VALIDATION_ERROR`     | 400  | Schema regex/range violation or duplicate | Extract`error.responseData.details` object and map directly onto field errors in forms (e.g., password, email, phone). |
| `AUTHENTICATION_ERROR` | 401  | Invalid or expired token                  | Automatically handled by`fetchApi` single retry; if unresolvable, triggers logout via `unauthenticatedMiddleware`.     |
| `PERMISSION_DENIED`    | 403  | Role violation / cross-bank access        | Display non-blocking inline "Access Denied" notification or trigger route protection boundary.                         |
| `BANK_NOT_ONBOARDED`   | 403  | User has no assigned bank binding         | Redirect caller to onboarding KYC workflow or present Bank Setup Banner.                                               |
| `NOT_FOUND`            | 404  | Missing resource                          | Surface clear resource-not-found notification; reset active detail state.                                              |
| `INTERNAL_ERROR`       | 500  | Database transaction or server error      | Log full context (`logger.error`) and surface non-technical retry banner.                                              |

---

## 3. Zod Response & Payload Schemas

Add the following complete schemas to `src/lib/api/api.schemas.ts`.

```ts
// Additions to src/lib/api/api.schemas.ts
import { z } from 'zod';

export const loanProductSummarySchema = z.object({
  name: z.string(),
  product_name: z.string(),
  slug: z.string().nullable().optional(),
  status: z.enum(['Draft', 'Active', 'Archived']),
  min_interest_rate: z.number(),
  max_interest_rate: z.number().nullable().optional(),
  min_amount: z.number().nullable().optional(),
  max_amount: z.number(),
  tenure_months: z.number(),
  creation: z.string().nullable().optional(),
});
export type LoanProductSummary = z.infer<typeof loanProductSummarySchema>;

export const loanProductDetailSchema = loanProductSummarySchema.extend({
  description: z.string().nullable().optional(),
  bank: z.string().nullable().optional(),
  modified: z.string().nullable().optional(),
  product_meta: z.array(z.object({ meta_key: z.string(), meta_value: z.string() })).default([]),
  categories: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  attributes: z.record(z.string(), z.array(z.string())).default({}),
});
export type LoanProductDetail = z.infer<typeof loanProductDetailSchema>;

export const sellerDashboardStatsSchema = z.object({
  total_products: z.number(),
  active_products: z.number(),
  total_applications: z.number(),
  pending_applications: z.number(),
  approved_applications: z.number(),
  total_approved_amount: z.number(),
});
export type SellerDashboardStats = z.infer<typeof sellerDashboardStatsSchema>;

export const taxonomyCategorySchema = z.object({
  term_id: z.string(),
  parent_category: z.string().nullable(),
  term_name: z.string(),
});
export type TaxonomyCategory = z.infer<typeof taxonomyCategorySchema>;

export const taxonomyTagSchema = z.object({
  term_id: z.string(),
  term_name: z.string(),
});
export type TaxonomyTag = z.infer<typeof taxonomyTagSchema>;

export const taxonomyAttributeSchema = z.object({
  term_id: z.string(),
  term_name: z.string(),
  slug: z.string().nullable().optional(),
});
export type TaxonomyAttribute = z.infer<typeof taxonomyAttributeSchema>;

export const teamUserSchema = z.object({
  name: z.string(),
  email: z.string(),
  first_name: z.string().nullable().optional(),
  enabled: z.union([z.literal(0), z.literal(1)]),
});
export type TeamUser = z.infer<typeof teamUserSchema>;

export const bankStatusSchema = z.object({
  status: z.enum(['Onboarding', 'Active', 'Suspended']),
});
export type BankStatus = z.infer<typeof bankStatusSchema>;
```

---

## 4. PDF KYC Validation Module

Create `src/features/seller/utils/pdf-validation.ts` to perform fail-fast validation before encoding and uploading Base64 documents to `upload_kyc_document`.

```ts
// src/features/seller/utils/pdf-validation.ts

export class PdfValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PdfValidationError';
  }
}

const PDF_MAGIC_HEADER = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-
const MAX_BASE64_CHARS = 15_000_000;
const MAX_RAW_BYTES = Math.floor((MAX_BASE64_CHARS * 3) / 4) - 2048; // ~11 MB safety budget

export async function validateAndEncodePdf(file: File): Promise<{ filename: string; filedata: string }> {
  if (!/\.pdf$/i.test(file.name)) {
    throw new PdfValidationError('Only PDF documents are accepted (file extension must be .pdf).');
  }
  if (file.name.length < 4 || file.name.length > 30) {
    throw new PdfValidationError('Filename must be between 4 and 30 characters long.');
  }
  if (file.type && file.type !== 'application/pdf') {
    throw new PdfValidationError('Invalid MIME type. Selected file must be a PDF document.');
  }
  if (file.size > MAX_RAW_BYTES) {
    throw new PdfValidationError('File size exceeds maximum permitted limit (~11 MB).');
  }

  const arrayBuffer = await file.arrayBuffer();
  const headerBytes = new Uint8Array(arrayBuffer.slice(0, 5));
  const isPdfHeaderValid = PDF_MAGIC_HEADER.every((byte, index) => headerBytes[index] === byte);

  if (!isPdfHeaderValid) {
    throw new PdfValidationError('Invalid PDF content: magic header bytes (%PDF-) check failed.');
  }

  const base64String = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Payload = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64Payload);
    };
    reader.onerror = () => reject(new PdfValidationError('Failed to read binary file content.'));
    reader.readAsDataURL(file);
  });

  if (base64String.length < 10 || base64String.length > MAX_BASE64_CHARS) {
    throw new PdfValidationError('Encoded payload size is outside acceptable bounds.');
  }

  return { filename: file.name, filedata: base64String };
}
```

---

## 5. Phase-by-Phase Task List

### Phase 0 — Base Infrastructure & Setup

1. Create `src/features/seller/` subdirectories (`api/`, `store/`, `types/`, `components/`, `utils/`).
2. Add Zod schemas to `src/lib/api/api.schemas.ts`.
3. Register `sellerProducts`, `sellerTeam`, and `sellerOnboarding` reducers in `src/store/index.ts`.
4. Implement `pdf-validation.ts` unit utility.

### Phase A — Guest Seller Registration (`/create-account`)

1. Create `onboardingService.registerSeller` method in `src/features/seller/api/onboarding.service.ts`.
2. Rewire `CreateAccountForm` (`src/app/(auth)/create-account/page.tsx`):
   - Replace dummy timers with `dispatch(registerSeller(payload))`.
   - Implement client validation matching backend constraints (Password: min 8, max 64, ≥1 letter, ≥1 number, ≥1 special char; Phone: min 8).
   - Map backend `VALIDATION_ERROR` field details directly onto inputs.
   - On success, redirect to `/login` with success banner.

### Phase B — Bank Admin KYC Compliance & Onboarding

1. Implement `onboardingService` methods (`saveOrgContacts`, `uploadKycDocument`, `getBankStatus`, `updateBankStatus`).
2. Create `onboardingSlice.ts` to manage status, contact forms, and uploaded document state.
3. Update `KycComplianceContent` component:
   - Wire `OrganizationContactsCard` to submit `saveOrgContacts`.
   - Wire `OrganisationDocumentsCard` to invoke `validateAndEncodePdf` then `uploadKycDocument`.
   - Implement automatic transition: when both contacts are saved AND at least one KYC PDF is uploaded, dispatch `updateBankStatus(bankCode, 'Active')`.

### Phase C — Bank Admin Team Management

1. Create new Bank Admin team page at `src/app/(bank-admin)/team/page.tsx`.
2. Implement `team.service.ts` and `teamSlice.ts` (`listUsers`, `inviteTeamMember`, `deactivateUser`, `updateUserProfile`).
3. Build responsive UI components: `TeamListTable`, `InviteUserModal`, `EditUserModal`, `DeactivateUserModal`.
4. Restrict role select dropdown options strictly to `A2C Bank Admin` and `A2C Bank Agent`.

### Phase D — Unified Seller Dashboard Stats

1. Wire `loanProductsService.getDashboardStats` and `fetchDashboardStats` thunk.
2. Update dashboard components in `(bank-admin)/dashboard` and `(bank-agent)/dashboard` to consume `selectSellerStats`.
3. Render `MetricCards` directly from verified API numerical data with formatting helpers (no hardcoded/fake stats).

### Phase E — Shared Loan Products & Taxonomy Management

1. Implement `loanProductsService` and `taxonomyService`.
2. Rewire `LoanProductsList`: render distinct UI states for `loading`, `failed` (with retry button), `empty`, and `succeeded`.
3. Retype `LoanProductCard` to accept `LoanProductSummary`; format interest rates, amounts, and tenure inside the component.
4. **Add Loan Product Modal**:
   - Fetch taxonomy categories, tags, and attributes via `fetchTaxonomy`.
   - Submit compound thunk: `create_product` → `set_product_categories` → `set_product_tags` → `set_product_attributes`.
5. **Edit Loan Product Modal**:
   - On open, dispatch `fetchProductDetail(productId)`.
   - Pre-populate form with detailed attributes, categories, and metadata.
   - On save, dispatch `updateProductCompound`.
6. **Archive Action**: Wire card delete/archive affordance to `archiveProduct(productId)`.

---

## 6. Comprehensive Testing Strategy

Every seller component, thunk, and service must be rigorously verified without live network calls.

### 6.1 Unit Tests (Vitest)

- **Services**: Mock `fetchApi` to verify correct query formatting, JSON payload construction, and Zod response validation.
- **PDF Validator**: Unit test `validateAndEncodePdf` against invalid extensions, oversize files, corrupt magic headers, and valid PDF buffers.
- **Slices**: Test thunk lifecycle transitions (`pending`, `fulfilled`, `rejected`) and state mutations.

### 6.2 Component & Integration Tests (React Testing Library + MSW)

- Intercept all 31 seller API endpoints using MSW handlers in `src/mocks/handlers.ts`.
- Test modal error banners, input validation state, loading skeletons, and success toast notifications.
- Run automated accessibility assertions (`axe-core`) on all newly integrated modals and tables.

---

## 7. Open Items & Architecture Clarifications

1. **Attribute Taxonomy Mapping Convention**: `taxonomy.get_attributes` returns a flat array of attribute terms `[{ term_id, term_name, slug }]`, whereas `taxonomy.set_product_attributes` accepts a dictionary grouped by taxonomy name (`{ "Crop Type": ["maize"], "Region": ["oromia"] }`). When submitting attributes, frontend groups selected term IDs under the taxonomy key derived from their classification context.
2. **Bank Scoping Assumption**: The KYC onboarding workflow assumes the caller is already authenticated and possesses an `A2C Bank Admin` role with an assigned bank context (`User Permission`).
3. **Password Recovery**: Endpoint pair `auth.forgot_password` and `auth.reset_password` is deferred to the standalone Auth feature update.
