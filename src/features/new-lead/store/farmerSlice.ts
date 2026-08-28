import { logger } from '@/lib/logger';
import type { RootState } from '@/store';
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { FarmerDetails, newLeadService } from '../api/newLead.service';
import { clearForm, initializeLead } from './actions';
export type { FarmerDetails };

interface FarmerState {
  farmerId: string;
  farmerDetails: FarmerDetails;
  isSearchingFarmer: boolean;
  searchedFarmer: FarmerDetails | null;
  searchError: string | null;
  // Error from fetching a specific lead's details (e.g. 'FORBIDDEN' on a 403).
  detailsError: string | null;
  isPollingLong: boolean;
  // requestId of the fetchLeadDetailsThunk invocation currently "owning" the
  // isPollingLong indicator, so a concurrent quick (non-polling) call can't
  // clear it out from under a still-running long poll — see setIsPollingLong.
  pollingRequestId: string | null;
}
// dont know if image url is needed since
export const createDefaultFarmerDetails = (partial?: Partial<FarmerDetails>): FarmerDetails => ({
  firstName: partial?.firstName ?? '',
  lastName: partial?.lastName ?? '',
  location: partial?.location ?? '',
  phoneNumber: partial?.phoneNumber ?? '',
  email: partial?.email ?? '',
  gender: partial?.gender ?? '',
  profileImageUrl: partial?.profileImageUrl ?? '',
});

// Permission/session errors won't resolve by retrying, so both the retry loop
// and the final attempt bail out on them the same way — a 403 surfaces as
// not-found and a 401 triggers the global logout middleware.
function authErrorPayload(error: unknown): 'FORBIDDEN' | 'UNAUTHORIZED' | null {
  const message = error instanceof Error ? error.message : '';
  return message === 'FORBIDDEN' || message === 'UNAUTHORIZED' ? message : null;
}

const initialState: FarmerState = {
  farmerId: '',
  farmerDetails: createDefaultFarmerDetails(),
  isSearchingFarmer: false,
  searchedFarmer: null,
  searchError: null,
  detailsError: null,
  isPollingLong: false,
  pollingRequestId: null,
};


export const searchFarmerThunk = createAsyncThunk<FarmerDetails, string>(
  'farmer/searchFarmer',
  async (faydaId: string, { rejectWithValue }) => {
    try {
      return await newLeadService.searchFarmer(faydaId);
    } catch (error) {
      const err = error as Error & { responseData?: { exc_type?: string } };
      if (err.responseData?.exc_type === 'DoesNotExistError') {
        return rejectWithValue(`Farmer with Fayda ID '${faydaId}' not found.`);
      }
      return rejectWithValue(err.message ?? 'Unknown Cause: Farmer search failed.');
    }
  }
);

export const fetchLeadDetailsThunk = createAsyncThunk<
  FarmerDetails,
  string | { leadId?: string | undefined; shouldPoll?: boolean | undefined } | void | undefined,
  { state: RootState }
>(
  'farmer/fetchLeadDetails',
  async (arg, { dispatch, rejectWithValue, signal, requestId }) => {
    const leadId = typeof arg === 'string' ? arg : arg?.leadId;
    const shouldPoll = typeof arg === 'string' ? false : (arg?.shouldPoll ?? false);

    // Resolves early on abort instead of always waiting out the full delay, so a
    // cancellation mid-retry-wait is noticed immediately rather than up to 5s late.
    const delay = (ms: number) => new Promise<void>((resolve) => {
      if (signal.aborted) { resolve(); return; }
      const timer = setTimeout(() => { cleanup(); resolve(); }, ms);
      const onAbort = () => { cleanup(); resolve(); };
      function cleanup() {
        clearTimeout(timer);
        signal.removeEventListener('abort', onAbort);
      }
      signal.addEventListener('abort', onAbort);
    });
    const maxRetries = shouldPoll ? 24 : 1;
    let retries = 0;

    let timeoutId: NodeJS.Timeout | undefined;
    if (shouldPoll) {
      timeoutId = setTimeout(() => {
        dispatch(setIsPollingLong({ value: true, requestId }));
      }, 2000);
    }

    try {
      while (retries < maxRetries) {
        // Stop polling immediately if the caller aborted (e.g. component unmounted).
        if (signal.aborted) {
          throw new DOMException('Aborted', 'AbortError');
        }

        try {
          const response = await newLeadService.getLeadDetails(leadId, signal);

          // Data has arrived if farmer_profile_created is true
          const dataArrived = response && response.farmer_profile_created === true;

          if (dataArrived || !shouldPoll) {
            return response;
          }

          if (response.consent_request_status === 'Failed') {
            return rejectWithValue("Demographic sync failed. Please request a new OTP and re-submit the consent.");
          }

          logger.log(`Lead details not yet ready for leadId: ${leadId}. Retrying in 5 seconds... (Attempt ${retries + 1}/${maxRetries})`);
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            throw error;
          }
          const authError = authErrorPayload(error);
          if (authError) {
            return rejectWithValue(authError);
          }
          if (!shouldPoll) {
            return rejectWithValue(error instanceof Error ? error.message : 'Unknown Cause: Failed to fetch lead details');
          }
          logger.warn(`Failed to fetch lead details for leadId: ${leadId}. Error: ${error instanceof Error ? error.message : String(error)}. Retrying in 5 seconds... (Attempt ${retries + 1}/${maxRetries})`);
        }

        retries++;
        if (retries < maxRetries) {
          await delay(5000);
          if (signal.aborted) {
            throw new DOMException('Aborted', 'AbortError');
          }
        }
      }

      // Final attempt before rejecting
      try {
        const finalResponse = await newLeadService.getLeadDetails(leadId, signal);
        if (shouldPoll && finalResponse.farmer_profile_created === false) {
          return rejectWithValue("Demographic sync failed. Please request a new OTP and re-submit the consent.");
        }
        return finalResponse;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          throw error;
        }
        const authError = authErrorPayload(error);
        if (authError) {
          return rejectWithValue(authError);
        }
        return rejectWithValue(error instanceof Error ? error.message : 'Unknown Cause: Failed to fetch lead details after retries');
      }
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      dispatch(setIsPollingLong({ value: false, requestId }));
    }
  }
);

const farmerSlice = createSlice({
  name: 'farmer',
  initialState,
  reducers: {
    setFarmerId(state, action: PayloadAction<string>) {
      state.farmerId = action.payload;
      state.searchedFarmer = null;
      state.searchError = null;
    },
    updateFarmerDetails(state, action: PayloadAction<Partial<FarmerDetails>>) {
      state.farmerDetails = { ...state.farmerDetails, ...action.payload };
    },
    setIsPollingLong(state, action: PayloadAction<{ value: boolean; requestId: string }>) {
      const { value, requestId } = action.payload;
      if (value) {
        state.isPollingLong = true;
        state.pollingRequestId = requestId;
      } else if (state.pollingRequestId === requestId) {
        // Only the invocation that claimed ownership may clear it — an
        // unrelated concurrent call finishing must not hide the indicator
        // for a still-running long poll.
        state.isPollingLong = false;
        state.pollingRequestId = null;
      }
    },
    clearFarmerState() {
      return initialState;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(searchFarmerThunk.pending, (state) => {
        state.isSearchingFarmer = true;
        state.searchedFarmer = null;
        state.searchError = null;
      })
      .addCase(searchFarmerThunk.fulfilled, (state, action) => {
        state.isSearchingFarmer = false;
        state.searchedFarmer = action.payload;
        state.searchError = null;
      })
      .addCase(searchFarmerThunk.rejected, (state, action) => {
        state.isSearchingFarmer = false;
        state.searchedFarmer = null;
        state.searchError = (action.payload as string) ?? action.error.message ?? ' Unkown Reason: Farmer search failed.';
      })
      .addCase(fetchLeadDetailsThunk.pending, (state) => {
        state.detailsError = null;
      })
      // dont know the usecase ( be cautious of data leakage, this can be a cause)
      .addCase(fetchLeadDetailsThunk.fulfilled, (state, action) => {
        state.farmerDetails = {
          ...state.farmerDetails,
          firstName: action.payload.firstName || state.farmerDetails.firstName,
          lastName: action.payload.lastName || state.farmerDetails.lastName,
          phoneNumber: action.payload.phoneNumber || state.farmerDetails.phoneNumber,
          email: action.payload.email || state.farmerDetails.email,
          location: action.payload.location || state.farmerDetails.location,
          gender: action.payload.gender || state.farmerDetails.gender,
          websub_delivered_at: action.payload.websub_delivered_at,
          consent_type: action.payload.consent_type,
          purpose: action.payload.purpose,
          validity_from: action.payload.validity_from,
          validity_to: action.payload.validity_to,
          requested_data_fields: action.payload.requested_data_fields,
          farmer_profile_created: action.payload.farmer_profile_created,
          consent_request_status: action.payload.consent_request_status,
          consent_request_otp_verified: action.payload.consent_request_otp_verified,
          consent_request_name: action.payload.consent_request_name,
        };
        state.detailsError = null;
      })
      .addCase(fetchLeadDetailsThunk.rejected, (state, action) => {
        // Ignore aborted requests (e.g. superseded by a newer poll, or the
        // component unmounted) — there's no newer result to reflect, so leave
        // whatever error/loading state already exists alone.
        if (action.meta.aborted) return;
        state.detailsError = (action.payload as string) ?? action.error.message ?? null;
      })

      .addCase(initializeLead, (state, action) => {
        const payload = action.payload ?? {};
        state.farmerId = payload.farmerId ?? '';
        state.farmerDetails = createDefaultFarmerDetails(); // Don't load details from initial lead
        state.searchedFarmer = null;
        state.isSearchingFarmer = false;
        state.searchError = null;
      })
      .addCase(clearForm, () => {
        return initialState;
      });
  }
});

export const { setFarmerId, updateFarmerDetails, clearFarmerState, setIsPollingLong } = farmerSlice.actions;

export const selectFarmerState = (state: RootState) => state.farmer;
export const selectSearchError = (state: RootState) => state.farmer.searchError;
export const selectDetailsError = (state: RootState) => state.farmer.detailsError;
export const selectIsPollingLong = (state: RootState) => state.farmer.isPollingLong;

export const farmerReducer = farmerSlice.reducer;
