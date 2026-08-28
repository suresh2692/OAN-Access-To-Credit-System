import { teamUserSchema, validateResponse, type TeamUser } from '@/lib/api/api.schemas';
import { fetchApi } from '@/lib/api/fetchApi';
import type { ApiResponse } from '@/types/api';
import { z } from 'zod';
import type {
  InviteTeamMemberPayload,
  ResetMemberPasswordPayload,
  UpdateUserPayload,
} from '../types/team.types';

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

  async resetMemberPassword(
    payload: ResetMemberPasswordPayload,
    signal?: AbortSignal
  ): Promise<ApiResponse<null>> {
    return fetchApi('oan_a2c.api.v1.seller.onboarding.reset_member_password', {
      method: 'POST',
      body: JSON.stringify(payload),
      ...(signal ? { signal } : {}),
    }) as Promise<ApiResponse<null>>;
  },

  // Consolidated update endpoint: change full_name, role and/or enabled in one
  // call. Send only the fields that should change.
  async updateUser(payload: UpdateUserPayload): Promise<ApiResponse<null>> {
    return fetchApi('oan_a2c.api.v1.seller.onboarding.update_user', {
      method: 'POST',
      body: JSON.stringify(payload),
    }) as Promise<ApiResponse<null>>;
  },
};
