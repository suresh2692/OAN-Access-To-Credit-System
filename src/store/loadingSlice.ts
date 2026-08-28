import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '.';

/**
 * App-wide loading state, deliberately kept at the root of the store rather than
 * inside a feature: it is fed by a middleware that watches *every* async thunk,
 * so it belongs to no single feature.
 *
 * Two channels, because "loading" is not one thing:
 *
 *  - `pending` drives the thin progress bar at the top of the viewport. It is
 *    non-blocking and advisory — the person can keep working while it runs.
 *  - `blockingMessage` drives the full-screen overlay, and is reserved for the
 *    handful of operations where continuing to interact makes no sense (signing
 *    out, restoring a session on first paint).
 */
export interface LoadingState {
  /**
   * How many tracked async thunks are in flight.
   *
   * A counter rather than a boolean so overlapping requests behave: with a
   * boolean, the first request to settle switches the indicator off while the
   * second is still running.
   */
  pending: number;
  /** Copy shown on the blocking overlay, or `null` when nothing is blocking. */
  blockingMessage: string | null;
}

const initialState: LoadingState = {
  pending: 0,
  blockingMessage: null,
};

const loadingSlice = createSlice({
  name: 'loading',
  initialState,
  reducers: {
    taskStarted(state) {
      state.pending += 1;
    },
    taskSettled(state) {
      // Clamped: a `logout` reset can zero the counter while requests are still
      // in flight, and their settle actions would otherwise drive it negative —
      // which reads as "loading" forever once it comes back up.
      state.pending = Math.max(0, state.pending - 1);
    },
    startBlocking(state, action: PayloadAction<string>) {
      state.blockingMessage = action.payload;
    },
    stopBlocking(state) {
      state.blockingMessage = null;
    },
  },
});

export const { taskStarted, taskSettled, startBlocking, stopBlocking } = loadingSlice.actions;

export const selectPendingCount = (state: RootState) => state.loading.pending;
export const selectIsLoading = (state: RootState) => state.loading.pending > 0;
export const selectBlockingMessage = (state: RootState) => state.loading.blockingMessage;

export const loadingReducer = loadingSlice.reducer;
