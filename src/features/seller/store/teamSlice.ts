import type { TeamUser } from '@/lib/api/api.schemas';
import { logger } from '@/lib/logger';
import type { RootState } from '@/store';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { teamService } from '../api/team.service';
import type {
  InviteTeamMemberPayload,
  ResetMemberPasswordPayload,
  UpdateUserPayload,
} from '../types/team.types';

type AsyncStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

interface TeamState {
  users: TeamUser[];
  listStatus: AsyncStatus;
  mutationStatus: AsyncStatus;
  listError: string | null;
  mutationError: string | null;
}

const initialState: TeamState = {
  users: [],
  listStatus: 'idle',
  mutationStatus: 'idle',
  listError: null,
  mutationError: null,
};

export const fetchTeamUsers = createAsyncThunk(
  'sellerTeam/fetchTeamUsers',
  async (_, { rejectWithValue }) => {
    try {
      const response = await teamService.listUsers();
      return response.data;
    } catch (error) {
      logger.error('fetchTeamUsers thunk failed', { error });
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to load bank team members');
    }
  }
);

export const inviteTeamMember = createAsyncThunk(
  'sellerTeam/inviteTeamMember',
  async (payload: InviteTeamMemberPayload, { dispatch, rejectWithValue }) => {
    try {
      const response = await teamService.inviteTeamMember(payload);
      await dispatch(fetchTeamUsers());
      return response.data;
    } catch (error) {
      logger.error('inviteTeamMember thunk failed', { email: payload.email, error });
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to invite team member');
    }
  }
);

export const resetMemberPassword = createAsyncThunk(
  'sellerTeam/resetMemberPassword',
  async (payload: ResetMemberPasswordPayload, { dispatch, signal, rejectWithValue }) => {
    try {
      const response = await teamService.resetMemberPassword(payload, signal);
      // Refetch so the member's "pending password setup" flag reappears in the list.
      await dispatch(fetchTeamUsers());
      return response.data;
    } catch (error) {
      // An abort is the component unmounting, not a failure. Re-thrown so RTK
      // records it as `aborted` — routing it through `rejectWithValue` would
      // leave "Failed to reset the team member password" on screen after the
      // modal that asked for it has already gone.
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }
      logger.error('resetMemberPassword thunk failed', { email: payload.email, error });
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to reset the team member password'
      );
    }
  }
);

export const deactivateUser = createAsyncThunk(
  'sellerTeam/deactivateUser',
  async (email: string, { dispatch, rejectWithValue }) => {
    try {
      const response = await teamService.updateUser({ email, enabled: false });
      await dispatch(fetchTeamUsers());
      return response.data;
    } catch (error) {
      logger.error('deactivateUser thunk failed', { email, error });
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to deactivate team member');
    }
  }
);

export const updateUser = createAsyncThunk(
  'sellerTeam/updateUser',
  async (payload: UpdateUserPayload, { dispatch, rejectWithValue }) => {
    try {
      const response = await teamService.updateUser(payload);
      await dispatch(fetchTeamUsers());
      return response.data;
    } catch (error) {
      logger.error('updateUser thunk failed', { email: payload.email, error });
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update team member');
    }
  }
);

const teamSlice = createSlice({
  name: 'sellerTeam',
  initialState,
  reducers: {
    clearTeamMutationError(state) {
      state.mutationError = null;
      state.mutationStatus = 'idle';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTeamUsers.pending, (s) => { s.listStatus = 'loading'; s.listError = null; })
      .addCase(fetchTeamUsers.fulfilled, (s, action) => { s.listStatus = 'succeeded'; s.users = action.payload; })
      .addCase(fetchTeamUsers.rejected, (s, action) => { s.listStatus = 'failed'; s.listError = action.payload as string; })
      .addCase(inviteTeamMember.pending, (s) => { s.mutationStatus = 'loading'; s.mutationError = null; })
      .addCase(inviteTeamMember.fulfilled, (s) => { s.mutationStatus = 'succeeded'; })
      .addCase(inviteTeamMember.rejected, (s, action) => { s.mutationStatus = 'failed'; s.mutationError = action.payload as string; })
      .addCase(resetMemberPassword.pending, (s) => { s.mutationStatus = 'loading'; s.mutationError = null; })
      .addCase(resetMemberPassword.fulfilled, (s) => { s.mutationStatus = 'succeeded'; })
      .addCase(resetMemberPassword.rejected, (s, action) => { s.mutationStatus = 'failed'; s.mutationError = action.payload as string; })
      .addCase(deactivateUser.pending, (s) => { s.mutationStatus = 'loading'; s.mutationError = null; })
      .addCase(deactivateUser.fulfilled, (s) => { s.mutationStatus = 'succeeded'; })
      .addCase(deactivateUser.rejected, (s, action) => { s.mutationStatus = 'failed'; s.mutationError = action.payload as string; })
      .addCase(updateUser.pending, (s) => { s.mutationStatus = 'loading'; s.mutationError = null; })
      .addCase(updateUser.fulfilled, (s) => { s.mutationStatus = 'succeeded'; })
      .addCase(updateUser.rejected, (s, action) => { s.mutationStatus = 'failed'; s.mutationError = action.payload as string; });
  },
});

export const { clearTeamMutationError } = teamSlice.actions;
export const sellerTeamReducer = teamSlice.reducer;
export default teamSlice.reducer;

export const selectTeamUsers = (state: RootState) => state.sellerTeam.users;
export const selectTeamListStatus = (state: RootState) => state.sellerTeam.listStatus;
export const selectTeamListError = (state: RootState) => state.sellerTeam.listError;
export const selectTeamMutationStatus = (state: RootState) => state.sellerTeam.mutationStatus;
export const selectTeamMutationError = (state: RootState) => state.sellerTeam.mutationError;
