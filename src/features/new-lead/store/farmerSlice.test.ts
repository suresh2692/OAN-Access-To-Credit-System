import { configureStore, ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RootState } from '@/store';
import { newLeadService } from '../api/newLead.service';
import { farmerReducer, fetchLeadDetailsThunk } from './farmerSlice';

vi.mock('../api/newLead.service', () => ({
  newLeadService: {
    getLeadDetails: vi.fn(),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const baseDetails = {
  firstName: '',
  lastName: '',
  location: '',
  phoneNumber: '',
  email: '',
  gender: '',
};

function createTestStore() {
  const store = configureStore({
    reducer: { farmer: farmerReducer },
  });
  // `fetchLeadDetailsThunk` is typed against the app's full RootState, but this
  // test store only mounts the `farmer` slice — cast dispatch's state param to
  // RootState so tsc accepts it (the thunk under test never touches the other slices).
  const dispatch = store.dispatch as unknown as ThunkDispatch<RootState, unknown, UnknownAction>;
  return { ...store, dispatch };
}

const getLeadDetailsMock = vi.mocked(newLeadService.getLeadDetails);

describe('fetchLeadDetailsThunk', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves immediately without polling when shouldPoll is not requested', async () => {
    getLeadDetailsMock.mockResolvedValue({ ...baseDetails, farmer_profile_created: false });
    const store = createTestStore();

    const result = await store.dispatch(fetchLeadDetailsThunk('LEAD-1'));

    expect(result.type).toBe('farmer/fetchLeadDetails/fulfilled');
    expect(getLeadDetailsMock).toHaveBeenCalledTimes(1);
  });

  it('polls until farmer_profile_created becomes true', async () => {
    getLeadDetailsMock
      .mockResolvedValueOnce({ ...baseDetails, farmer_profile_created: false })
      .mockResolvedValueOnce({ ...baseDetails, farmer_profile_created: false })
      .mockResolvedValueOnce({ ...baseDetails, farmer_profile_created: true });
    const store = createTestStore();

    const requestPromise = store.dispatch(fetchLeadDetailsThunk({ leadId: 'LEAD-2', shouldPoll: true }));

    await vi.advanceTimersByTimeAsync(5000);
    await vi.advanceTimersByTimeAsync(5000);

    const result = await requestPromise;

    expect(result.type).toBe('farmer/fetchLeadDetails/fulfilled');
    expect(getLeadDetailsMock).toHaveBeenCalledTimes(3);
  });

  it('rejects with a sync-failure message when consent_request_status is Failed', async () => {
    getLeadDetailsMock.mockResolvedValue({
      ...baseDetails,
      farmer_profile_created: false,
      consent_request_status: 'Failed',
    });
    const store = createTestStore();

    const result = await store.dispatch(fetchLeadDetailsThunk({ leadId: 'LEAD-3', shouldPoll: true }));

    expect(result.type).toBe('farmer/fetchLeadDetails/rejected');
    expect(result.payload).toBe('Demographic sync failed. Please request a new OTP and re-submit the consent.');
  });

  it('stops issuing further requests once the dispatch is aborted', async () => {
    getLeadDetailsMock.mockResolvedValue({ ...baseDetails, farmer_profile_created: false });
    const store = createTestStore();

    const request = store.dispatch(fetchLeadDetailsThunk({ leadId: 'LEAD-4', shouldPoll: true }));
    request.abort();

    const result = await request;
    expect(result.type).toBe('farmer/fetchLeadDetails/rejected');
    expect((result as { meta: { aborted: boolean } }).meta.aborted).toBe(true);

    const callsRightAfterAbort = getLeadDetailsMock.mock.calls.length;
    // Advance well past several retry intervals — no additional polling requests
    // should fire once the signal has been aborted.
    await vi.advanceTimersByTimeAsync(30000);
    expect(getLeadDetailsMock.mock.calls.length).toBe(callsRightAfterAbort);
  });

  it('forwards the abort signal into the underlying service call', async () => {
    getLeadDetailsMock.mockResolvedValue({ ...baseDetails, farmer_profile_created: true });
    const store = createTestStore();

    await store.dispatch(fetchLeadDetailsThunk({ leadId: 'LEAD-5', shouldPoll: true }));

    expect(getLeadDetailsMock).toHaveBeenCalledWith('LEAD-5', expect.any(AbortSignal));
  });
});
