import { leadService } from '@/features/leads/api/lead.service';
import type { GetLeadsParams, Lead, LeadStatus, LeadSummaryResponse } from '@/features/leads/types/leads.types';
import {
    fetchLeadDetailsThunk,
    scheduleVisitThunk, updateLeadStatusThunk,
    updateVisitScheduleStatusThunk
} from '@/features/new-lead';
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../../../store';

import { withCurrentSort } from '@/lib/filterSort';
import { normalizeLeadId } from '@/lib/utils';

function findLeadById(leads: Lead[], id: string): Lead | undefined {
  const cleanId = normalizeLeadId(id);
  return leads.find(l => normalizeLeadId(l.id) === cleanId);
}


export const fetchLeads = createAsyncThunk(
  'leads/fetchLeads',
  async (params: GetLeadsParams | undefined, { signal, rejectWithValue }) => {
    try {
      const response = await leadService.getLeads(params, signal);
      return response;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch leads');
    }
  }
);

export const fetchLeadSummary = createAsyncThunk(
  'leads/fetchLeadSummary',
  async (_, { rejectWithValue }) => {
    try {
      const response = await leadService.getLeadSummary();
      return response;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch lead summary');
    }
  }
);

export interface AdvFilters {
  statuses: string[];
  quickDate: string;
  dateFrom: string;
  dateTo: string;
  /** Region only — see `region` on GetLeadsParams for why one field, not three. */
  region: string;
  minAmount: number | null;
  maxAmount: number | null;
  loanType: string[];
  leadSources: string[];
  sortBy?: 'loan_amount' | 'creation' | undefined;
  sortOrder?: 'asc' | 'desc' | undefined;
}

/** The filter half of `AdvFilters`, with the sort deliberately excluded. */
export type AdvFilterValues = Omit<AdvFilters, 'sortBy' | 'sortOrder'>;

/**
 * The filter half of the current state, ready to hand back to `setAdvFilters`
 * with one field changed.
 *
 * Fields are listed out rather than rest-destructured so adding one to `AdvFilters`
 * is a type error here instead of a value that silently stops being sent.
 */
export function advFilterValues(filters: AdvFilters): AdvFilterValues {
  return {
    statuses: filters.statuses,
    quickDate: filters.quickDate,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    // Trimmed: matched from the start of the region name, so a whitespace-only
    // value is truthy but can never match — an empty table with nothing to clear.
    region: filters.region.trim(),
    minAmount: filters.minAmount,
    maxAmount: filters.maxAmount,
    loanType: filters.loanType,
    leadSources: filters.leadSources,
  };
}

interface LeadState {
  selectedLeadIds: string[];
  leads: Lead[];
  totalCount: number;
  isLeadsLoading: boolean;
  leadsError: string | null;
  leadSummary: LeadSummaryResponse | null;
  isSummaryLoading: boolean;
  summaryError: string | null;
  // Filters
  search: string;
  activeTab: string;
  dateFilter: string;
  advFilters: AdvFilters;
}

const initialFilters: AdvFilters = {
  statuses: [],
  quickDate: '',
  dateFrom: '',
  dateTo: '',
  region: '',
  minAmount: null,
  maxAmount: null,
  loanType: [],
  leadSources: [],
};

const initialState: LeadState = {
  selectedLeadIds: [],
  leads: [],
  totalCount: 0,
  isLeadsLoading: false,
  leadsError: null,
  leadSummary: null,
  isSummaryLoading: false,
  summaryError: null,
  search: '',
  activeTab: 'all',
  dateFilter: 'All Time',
  advFilters: initialFilters,
};

const leadSlice = createSlice({
  name: 'leads',
  initialState,
  reducers: {
    toggleLeadSelection(state, action: PayloadAction<string>) {
      const id = action.payload;
      const idx = state.selectedLeadIds.indexOf(id);
      if (idx >= 0) {
        state.selectedLeadIds.splice(idx, 1);
      } else {
        state.selectedLeadIds.push(id);
      }
    },
    clearLeadSelection(state) {
      state.selectedLeadIds = [];
    },
    setSearch(state, action: PayloadAction<string>) {
      state.search = action.payload;
    },
    setActiveTab(state, action: PayloadAction<string>) {
      state.activeTab = action.payload;
    },
    setDateFilter(state, action: PayloadAction<string>) {
      state.dateFilter = action.payload;
    },
    setColStatusFilter(state, action: PayloadAction<string[]>) {
      state.advFilters.statuses = action.payload;
    },
    setColCallTimeFilter(state, action: PayloadAction<string[]>) {
      state.advFilters.loanType = action.payload;
    },
    setAdvFilters(state, action: PayloadAction<AdvFilterValues>) {
      state.advFilters = withCurrentSort(action.payload, state.advFilters);
    },
    setSort(state, action: PayloadAction<{ sortBy?: 'loan_amount' | 'creation' | undefined; sortOrder?: 'asc' | 'desc' | undefined }>) {
      state.advFilters.sortBy = action.payload.sortBy;
      state.advFilters.sortOrder = action.payload.sortOrder;
    },
    resetFilters(state) {
      state.search = '';
      state.activeTab = 'all';
      state.dateFilter = 'All Time';
      // The sort survives a filter reset, the same way it does on the loans
      // dashboard: it is a view preference, not a filter, and the column header
      // keeps showing its arrow either way.
      state.advFilters = withCurrentSort(initialFilters, state.advFilters);
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchLeads
      .addCase(fetchLeads.pending, (state) => {
        state.isLeadsLoading = true;
        state.leadsError = null;
      })
      .addCase(fetchLeads.fulfilled, (state, action) => {
        state.isLeadsLoading = false;
        state.leads = action.payload.results;
        state.totalCount = action.payload.totalCount;
      })
      .addCase(fetchLeads.rejected, (state, action) => {
        // Ignore aborted requests (superseded by a newer query); the newer
        // request's pending/fulfilled owns the loading and error state.
        if (action.meta.aborted) return;
        state.isLeadsLoading = false;
        state.leadsError = action.payload as string;
      })
      // fetchLeadSummary
      .addCase(fetchLeadSummary.pending, (state) => {
        state.isSummaryLoading = true;
        state.summaryError = null;
      })
      .addCase(fetchLeadSummary.fulfilled, (state, action) => {
        state.isSummaryLoading = false;
        state.leadSummary = action.payload;
      })
      .addCase(fetchLeadSummary.rejected, (state, action) => {
        state.isSummaryLoading = false;
        state.summaryError = action.payload as string;
      })
      // Sync status with details view to avoid stale state / UI flashes
      .addMatcher(
        updateLeadStatusThunk.fulfilled.match,
        (state, action) => {
          const { leadId, status } = action.payload.payload;
          const lead = findLeadById(state.leads, leadId);
          if (lead) {
            lead.status = status as LeadStatus;
          }
        }
      )
      .addMatcher(
        updateVisitScheduleStatusThunk.fulfilled.match,
        (state, action) => {
          // Cache invalidation lives at the mutation site in visitSlice.ts.
          const { leadId, status } = action.payload.payload;
          const lead = findLeadById(state.leads, leadId);
          if (lead) {
            // This is the visit-schedule status, not the lead's own status.
            lead.scheduleStatus = status;
            if (status === 'Completed' || status === 'Missed') {
              lead.visitDate = undefined;
            }
          }
        }
      )
      .addMatcher(
        scheduleVisitThunk.fulfilled.match,
        (state, action) => {
          // Cache invalidation lives at the mutation site in visitSlice.ts.
          const { leadId, date } = action.payload.payload;
          const lead = findLeadById(state.leads, leadId);
          if (lead) {
            lead.scheduleStatus = 'Scheduled';
            lead.visitDate = date;
          }
        }
      )
      .addMatcher(
        fetchLeadDetailsThunk.fulfilled.match,
        (state, action) => {
          const arg = action.meta.arg;
          const leadId = typeof arg === 'string' ? arg : arg?.leadId;
          const leadData = action.payload;
          if (leadData && leadId) {
            const lead = findLeadById(state.leads, leadId);
            if (lead) {
              lead.name = `${leadData.firstName} ${leadData.lastName}`.trim();
              lead.farmerPhone = leadData.phoneNumber;
              lead.location = leadData.location;
            }
          }
        }
      );
  },
});

export const {
  toggleLeadSelection,
  clearLeadSelection,
  setSearch,
  setActiveTab,
  setDateFilter,
  setColStatusFilter,
  setColCallTimeFilter,
  setAdvFilters,
  setSort,
  resetFilters,
} = leadSlice.actions;

export const selectSelectedLeadIds = (state: RootState) => state.leads.selectedLeadIds;
export const selectLeads = (state: RootState) => state.leads.leads;
export const selectTotalCount = (state: RootState) => state.leads.totalCount;
export const selectIsLeadsLoading = (state: RootState) => state.leads.isLeadsLoading;
export const selectLeadsError = (state: RootState) => state.leads.leadsError;
export const selectLeadSummary = (state: RootState) => state.leads.leadSummary;
export const selectIsSummaryLoading = (state: RootState) => state.leads.isSummaryLoading;

export const selectSearch = (state: RootState) => state.leads.search;
export const selectActiveTab = (state: RootState) => state.leads.activeTab;
export const selectDateFilter = (state: RootState) => state.leads.dateFilter;
export const selectColStatusFilter = (state: RootState) => state.leads.advFilters.statuses;
export const selectColCallTimeFilter = (state: RootState) => state.leads.advFilters.loanType;
export const selectAdvFilters = (state: RootState) => state.leads.advFilters;
export const selectSortBy = (state: RootState) => state.leads.advFilters.sortBy;
export const selectSortOrder = (state: RootState) => state.leads.advFilters.sortOrder;

/**
 * Whether any filter is narrowing the list — every surface, not a subset.
 *
 * The toolbar used to check only search + the two column filters, so a date range,
 * an amount bucket, a lead source or a region left the "Clear Filters" affordance
 * hidden and the empty state claiming there were no leads at all.
 */
export const selectHasActiveLeadFilters = (state: RootState) => {
  const { search, advFilters } = state.leads;
  return Boolean(search.trim())
    || advFilters.statuses.length > 0
    || advFilters.loanType.length > 0
    || advFilters.leadSources.length > 0
    || Boolean(advFilters.region.trim())
    || Boolean(advFilters.dateFrom)
    || Boolean(advFilters.dateTo)
    || advFilters.minAmount !== null
    || advFilters.maxAmount !== null;
};

// ── Backend Filter Pass-Through ──

export const selectFilteredLeads = (state: RootState) => state.leads.leads;


export const leadReducer = leadSlice.reducer;
