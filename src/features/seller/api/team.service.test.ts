import { fetchApi } from '@/lib/api/fetchApi';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { teamService } from './team.service';

vi.mock('@/lib/api/fetchApi', () => ({
  fetchApi: vi.fn(),
}));

describe('teamService.inviteTeamMember', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('posts the invite to the renamed endpoint', async () => {
    vi.mocked(fetchApi).mockResolvedValue({
      status: 'success',
      data: { message: 'Team member invited successfully.' },
    });

    const payload = {
      email: 'agent@bank.com',
      full_name: 'New Agent',
      role: 'A2C Bank Agent',
      password: 'TempIssued1',
    } as const;

    await teamService.inviteTeamMember(payload);

    expect(fetchApi).toHaveBeenCalledWith('oan_a2c.api.v1.seller.onboarding.invite_team_member', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  });

  it('propagates the failure to the caller', async () => {
    vi.mocked(fetchApi).mockRejectedValue(new Error('Invalid role.'));

    await expect(
      teamService.inviteTeamMember({
        email: 'agent@bank.com',
        full_name: 'New Agent',
        role: 'A2C Bank Agent',
        password: 'TempIssued1',
      })
    ).rejects.toThrow('Invalid role.');
  });
});

describe('teamService.resetMemberPassword', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('posts the new temporary password for the target member', async () => {
    vi.mocked(fetchApi).mockResolvedValue({ status: 'success', data: null });

    const payload = { email: 'agent@bank.com', password: 'ReIssued99' };
    await teamService.resetMemberPassword(payload);

    expect(fetchApi).toHaveBeenCalledWith(
      'oan_a2c.api.v1.seller.onboarding.reset_member_password',
      { method: 'POST', body: JSON.stringify(payload) }
    );
  });

  it('propagates a permission failure to the caller', async () => {
    vi.mocked(fetchApi).mockRejectedValue(
      new Error('Not permitted to manage a user from another bank.')
    );

    await expect(
      teamService.resetMemberPassword({ email: 'other@bank.com', password: 'ReIssued99' })
    ).rejects.toThrow('Not permitted to manage a user from another bank.');
  });

  it('forwards the abort signal so the thunk can cancel on unmount', async () => {
    vi.mocked(fetchApi).mockResolvedValue({ status: 'success', data: null });

    const controller = new AbortController();
    const payload = { email: 'agent@bank.com', password: 'ReIssued99' };
    await teamService.resetMemberPassword(payload, controller.signal);

    expect(fetchApi).toHaveBeenCalledWith(
      'oan_a2c.api.v1.seller.onboarding.reset_member_password',
      { method: 'POST', body: JSON.stringify(payload), signal: controller.signal }
    );
  });
});
