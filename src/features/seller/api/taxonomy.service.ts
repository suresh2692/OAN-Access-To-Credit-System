import {
    taxonomyAttributeSchema, taxonomyCategorySchema,
    taxonomyTagSchema, validateResponse, type TaxonomyAttribute, type TaxonomyCategory,
    type TaxonomyTag
} from '@/lib/api/api.schemas';
import { fetchApi } from '@/lib/api/fetchApi';
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
