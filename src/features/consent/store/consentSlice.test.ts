import { configureStore, ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RootState } from '@/store';
import { consentService } from '../api/consent.service';
import { newLeadService } from '@/features/new-lead/api/newLead.service';
import { initializeLead } from '@/features/new-lead/store/actions';
import { consentReducer, submitConsentThunk } from './consentSlice';
import { farmerReducer } from '@/features/new-lead/store/farmerSlice';

vi.mock('../api/consent.service', () => ({
  consentService: {
    submitConsent: vi.fn(),
  },
}));

vi.mock('@/features/new-lead/api/newLead.service', () => ({
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

const submitPayload = {
  leadId: 'LEAD-1',
  consent_type: 'Type A',
  consent_reason_id: 1,
  validity_months: 6,
  allowed_data_field_ids: [1, 2],
  consentFormFilename: 'consent.pdf',
  consentFormBase64: 'base64==',
};

function createTestStore() {
  const store = configureStore({
    reducer: { consent: consentReducer, farmer: farmerReducer },
  });
  // Seed an active consent request, as required by submitConsentThunk.
  store.dispatch(initializeLead({ consentRequestId: 'CR-123' }));
  // `submitConsentThunk`/`fetchLeadDetailsThunk` are typed against the app's full
  // RootState, but this test store only mounts the `consent`/`farmer` slices —
  // cast dispatch's state param to RootState so tsc accepts it (the thunks under
  // test never touch the other slices).
  const dispatch = store.dispatch as unknown as ThunkDispatch<RootState, unknown, UnknownAction>;
  return { ...store, dispatch };
}

const getLeadDetailsMock = vi.mocked(newLeadService.getLeadDetails);
const submitConsentMock = vi.mocked(consentService.submitConsent);

describe('submitConsentThunk', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves successfully when the demographic-sync poll reports the profile is created', async () => {
    submitConsentMock.mockResolvedValue({ message: 'ok' } as never);
    getLeadDetailsMock.mockResolvedValue({ ...baseDetails, farmer_profile_created: true });
    const store = createTestStore();

    const result = await store.dispatch(submitConsentThunk(submitPayload));

    expect(result.type).toBe('consent/submitConsent/fulfilled');
    expect(store.getState().consent.consentError).toBeNull();
  });

  it('propagates the demographic-sync failure instead of silently succeeding', async () => {
    submitConsentMock.mockResolvedValue({ message: 'ok' } as never);
    getLeadDetailsMock.mockResolvedValue({
      ...baseDetails,
      farmer_profile_created: false,
      consent_request_status: 'Failed',
    });
    const store = createTestStore();

    const result = await store.dispatch(submitConsentThunk(submitPayload));

    expect(result.type).toBe('consent/submitConsent/rejected');
    expect(result.payload).toBe('Demographic sync failed. Please request a new OTP and re-submit the consent.');
    expect(store.getState().consent.consentError).toBe(
      'Demographic sync failed. Please request a new OTP and re-submit the consent.'
    );
  });

  it('aborts the inner polling dispatch when the outer submit is aborted', async () => {
    submitConsentMock.mockResolvedValue({ message: 'ok' } as never);
    getLeadDetailsMock.mockResolvedValue({ ...baseDetails, farmer_profile_created: false });
    const store = createTestStore();

    const request = store.dispatch(submitConsentThunk(submitPayload));

    // Let submitConsent() resolve and the inner poll dispatch fire its first request.
    await vi.advanceTimersByTimeAsync(0);
    request.abort();

    const result = await request;
    expect(result.type).toBe('consent/submitConsent/rejected');

    const callsRightAfterAbort = getLeadDetailsMock.mock.calls.length;
    await vi.advanceTimersByTimeAsync(30000);
    // The inner polling loop must not keep issuing requests after the outer abort.
    expect(getLeadDetailsMock.mock.calls.length).toBe(callsRightAfterAbort);
  });
});
