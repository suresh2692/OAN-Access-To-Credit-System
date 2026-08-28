import { AUTH_MESSAGES } from '@/lib/authMessages';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loginUser, logoutUser, setInitialPassword } from './authApi';

const okJson = (body: unknown, ok = true, status = 200) =>
  ({ ok, status, json: async () => body }) as Response;

describe('loginUser', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the authenticated outcome with the user on success', async () => {
    const user = {
      email: 'agent@bank.com',
      full_name: 'Test Agent',
      roles: ['A2C Bank Agent'],
      user_type: 'bank_agent',
    };
    vi.spyOn(global, 'fetch').mockResolvedValue(okJson({ success: true, user }));

    const result = await loginUser({ usr: 'agent@bank.com', pwd: 'correct-horse' });

    expect(result).toEqual({ outcome: 'authenticated', user });
  });

  it('returns the password-change outcome instead of throwing on a 403', async () => {
    // The credentials were right; the backend just refused to open a session.
    // Treating this as a thrown error would surface it as "login failed".
    vi.spyOn(global, 'fetch').mockResolvedValue(
      okJson(
        {
          code: 'PASSWORD_CHANGE_REQUIRED',
          usr: 'agent@bank.com',
          message: 'You must set your own password before signing in.',
        },
        false,
        403
      )
    );

    const result = await loginUser({ usr: 'agent@bank.com', pwd: 'TempIssued1' });

    expect(result).toEqual({ outcome: 'password_change_required', usr: 'agent@bank.com' });
  });

  it('falls back to the typed login id when the response omits usr', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      okJson({ code: 'PASSWORD_CHANGE_REQUIRED' }, false, 403)
    );

    const result = await loginUser({ usr: '+251911000000', pwd: 'TempIssued1' });

    expect(result).toEqual({ outcome: 'password_change_required', usr: '+251911000000' });
  });

  it('throws with the server message on a genuine auth failure', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      okJson({ message: 'Incorrect email or password.' }, false, 401)
    );

    await expect(loginUser({ usr: 'agent@bank.com', pwd: 'wrong' })).rejects.toThrow(
      'Incorrect email or password.'
    );
  });

  it('throws generic copy — not the shape violation — when a 200 arrives without a user block', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(okJson({ success: true }));

    // A malformed payload is an integration bug. The specific field that went
    // missing goes to the logger for whoever is debugging it; the person trying
    // to sign in gets something they can act on and nothing about our internals.
    await expect(loginUser({ usr: 'agent@bank.com', pwd: 'correct-horse' })).rejects.toThrow(
      AUTH_MESSAGES.signInUnavailable
    );
  });

  it('sends the remember-me choice to the login route', async () => {
    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValue(okJson({ success: true, user: { email: 'agent@bank.com' } }));

    await loginUser({ usr: 'agent@bank.com', pwd: 'correct-horse', rememberMe: true });

    const body = JSON.parse(String((fetchSpy.mock.calls[0]?.[1] as RequestInit).body));
    expect(body.rememberMe).toBe(true);
  });

  it('defaults remember-me to false when it is not supplied', async () => {
    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValue(okJson({ success: true, user: { email: 'agent@bank.com' } }));

    await loginUser({ usr: 'agent@bank.com', pwd: 'correct-horse' });

    const body = JSON.parse(String((fetchSpy.mock.calls[0]?.[1] as RequestInit).body));
    expect(body.rememberMe).toBe(false);
  });
});

describe('setInitialPassword', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('posts to the rate-limited auth route and returns the success message', async () => {
    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        okJson({ message: { status: 'success', message: 'Password set successfully.' } })
      );

    const message = await setInitialPassword({
      usr: 'agent@bank.com',
      currentPassword: 'TempIssued1',
      newPassword: 'AgentChosen9#',
    });

    expect(message).toBe('Password set successfully.');
    // Not /api/proxy: that route has no rate limit, and this call verifies the
    // temporary password, so an unthrottled path is a brute-force oracle.
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/auth/set-initial-password',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          usr: 'agent@bank.com',
          current_password: 'TempIssued1',
          new_password: 'AgentChosen9#',
        }),
      })
    );
  });

  it('surfaces the rate-limit message from a route-level rejection', async () => {
    // The limiter replies with a bare string message rather than the backend
    // envelope, so the client has to read both shapes.
    vi.spyOn(global, 'fetch').mockResolvedValue(
      okJson({ message: 'Too many attempts. Please wait a moment and try again.' }, false, 429)
    );

    await expect(
      setInitialPassword({
        usr: 'agent@bank.com',
        currentPassword: 'TempIssued1',
        newPassword: 'AgentChosen9#',
      })
    ).rejects.toThrow('Too many attempts. Please wait a moment and try again.');
  });

  it('surfaces the server message rather than a sentinel on a 401', async () => {
    // The reason for bypassing fetchApi: it would collapse this into
    // ApiErrorCode.Auth and the user would never learn what was wrong.
    vi.spyOn(global, 'fetch').mockResolvedValue(
      okJson(
        { message: { status: 'error', message: 'Incorrect email or password.' } },
        false,
        401
      )
    );

    await expect(
      setInitialPassword({
        usr: 'agent@bank.com',
        currentPassword: 'wrong',
        newPassword: 'AgentChosen9#',
      })
    ).rejects.toThrow('Incorrect email or password.');
  });

  it('treats a 200 carrying an error envelope as a failure', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      okJson({ message: { status: 'error', message: 'Validation failed' } })
    );

    await expect(
      setInitialPassword({
        usr: 'agent@bank.com',
        currentPassword: 'TempIssued1',
        newPassword: 'weak',
      })
    ).rejects.toThrow('Validation failed');
  });
});

describe('logoutUser', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('reports success when the server confirms the cookies were cleared', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(okJson({ success: true }));

    await expect(logoutUser()).resolves.toBe(true);
  });

  it('reports failure on a rejected logout instead of resolving as success', async () => {
    // Regression: this resolved `void` for every outcome, so a CSRF-rejected
    // logout looked identical to a successful one. The cookies are httpOnly and
    // still set, so the middleware puts the person straight back in the app.
    vi.spyOn(global, 'fetch').mockResolvedValue(okJson({ message: 'Forbidden' }, false, 403));

    await expect(logoutUser()).resolves.toBe(false);
  });

  it('reports failure when the route is unreachable', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network down'));

    await expect(logoutUser()).resolves.toBe(false);
  });
});
