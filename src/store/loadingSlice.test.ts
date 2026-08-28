import { beforeEach, describe, expect, it } from 'vitest';
import { store } from '.';
import { loadingReducer, startBlocking, stopBlocking, taskSettled, taskStarted } from './loadingSlice';
import { logout } from '../features/auth/store/authSlice';

/**
 * An async-thunk-shaped action under a namespace no slice owns.
 *
 * The middleware matches on the `/pending` and `/fulfilled` suffixes plus a
 * requestId, not on the feature name — and borrowing a real thunk's type here
 * would run that feature's reducer against a payload it isn't shaped for.
 */
const thunkAction = (type: string, requestId: string) => ({ type, meta: { requestId } });

describe('loadingReducer', () => {
  it('counts overlapping work rather than flipping a boolean', () => {
    // Two requests in flight, one finishes: the indicator has to stay up. With a
    // boolean the first to settle would switch it off under the second.
    let state = loadingReducer(undefined, taskStarted());
    state = loadingReducer(state, taskStarted());
    state = loadingReducer(state, taskSettled());

    expect(state.pending).toBe(1);
  });

  it('never drops below zero', () => {
    // Reachable: a `logout` reset zeroes the counter while requests are still in
    // flight, and their settle actions arrive afterwards. Going negative would
    // read as "loading" forever once the count came back up.
    const state = loadingReducer(undefined, taskSettled());

    expect(state.pending).toBe(0);
  });

  it('carries the blocking message and clears it', () => {
    const blocked = loadingReducer(undefined, startBlocking('Signing you out…'));
    expect(blocked.blockingMessage).toBe('Signing you out…');

    expect(loadingReducer(blocked, stopBlocking()).blockingMessage).toBeNull();
  });
});

describe('global loading tracker middleware', () => {
  beforeEach(() => {
    // Drain any counter left by a previous test, so each starts from rest.
    while (store.getState().loading.pending > 0) store.dispatch(taskSettled());
    store.dispatch(stopBlocking());
  });

  it('counts an async thunk from pending through to settled', () => {
    store.dispatch(thunkAction('probe/fetchThing/pending', 'req-1'));
    expect(store.getState().loading.pending).toBe(1);

    store.dispatch(thunkAction('probe/fetchThing/fulfilled', 'req-1'));
    expect(store.getState().loading.pending).toBe(0);
  });

  it('counts a rejected thunk as settled', () => {
    store.dispatch(thunkAction('probe/fetchThing/pending', 'req-2'));
    store.dispatch(thunkAction('probe/fetchThing/rejected', 'req-2'));

    expect(store.getState().loading.pending).toBe(0);
  });

  it('ignores a duplicate settle for the same request', () => {
    // Without matching on requestId the counter would drift down and stick at a
    // permanent "loading" once it came back up.
    store.dispatch(thunkAction('probe/fetchThing/pending', 'req-3'));
    store.dispatch(thunkAction('probe/fetchThing/fulfilled', 'req-3'));
    store.dispatch(thunkAction('probe/fetchThing/fulfilled', 'req-3'));

    expect(store.getState().loading.pending).toBe(0);
  });

  it('leaves the session bootstrap and notification polling out of the count', () => {
    // getMe has its own full-page treatment, and notification fetches are
    // background chrome nobody asked for — a bar for either is noise.
    store.dispatch(thunkAction('auth/getMe/pending', 'req-4'));
    store.dispatch(thunkAction('notifications/fetchNotifications/pending', 'req-5'));

    expect(store.getState().loading.pending).toBe(0);
  });

  it('ignores plain actions that carry no requestId', () => {
    store.dispatch({ type: 'probe/setFilter' });

    expect(store.getState().loading.pending).toBe(0);
  });
});

describe('logout state reset', () => {
  it('keeps the blocking overlay up while the sign-out redirect happens', () => {
    // Sign-out raises the overlay and *then* resets the store. If the reset wiped
    // this slice the overlay would drop and the dashboard would flash back for
    // the length of the redirect.
    store.dispatch(startBlocking('Signing you out…'));
    store.dispatch(logout());

    expect(store.getState().loading.blockingMessage).toBe('Signing you out…');
  });

  it('still resets session state', () => {
    store.dispatch(logout());

    expect(store.getState().auth.user).toBeNull();
  });
});
