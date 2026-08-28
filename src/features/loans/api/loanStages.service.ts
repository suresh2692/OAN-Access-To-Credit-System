import { loanStagesDataSchema, validateResponse, type LoanStagesData } from '@/lib/api/api.schemas';
import { fetchApi } from '@/lib/api/fetchApi';
import type { ApiResponse } from '@/types/api';

export const loanStagesService = {
  async getStages(options?: RequestInit): Promise<ApiResponse<LoanStagesData>> {
    const path = 'oan_a2c.api.v1.seller.loan_stages.get_stages';
    const raw = (await fetchApi(path, options)) as ApiResponse<Record<string, unknown>>;
    return {
      ...raw,
      data: validateResponse(loanStagesDataSchema, raw.data, 'seller.get_stages'),
    };
  },
};
