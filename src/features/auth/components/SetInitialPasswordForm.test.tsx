import { setInitialPassword } from '@/features/auth/api/authApi';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SetInitialPasswordForm } from './SetInitialPasswordForm';

vi.mock('@/features/auth/api/authApi', () => ({
  setInitialPassword: vi.fn(),
}));

const TEMP_PASSWORD = 'TempIssued1!';

function renderForm(overrides: Partial<Parameters<typeof SetInitialPasswordForm>[0]> = {}) {
  const onDone = vi.fn();
  const onCancel = vi.fn();
  render(
    <SetInitialPasswordForm
      usr="agent@bank.com"
      temporaryPassword={TEMP_PASSWORD}
      onDone={onDone}
      onCancel={onCancel}
      {...overrides}
    />
  );
  return { onDone, onCancel };
}

function fillPasswords(value: string, confirmValue = value) {
  fireEvent.change(screen.getByLabelText('New Password'), { target: { value } });
  fireEvent.change(screen.getByLabelText('Confirm New Password'), { target: { value: confirmValue } });
}

function submit() {
  fireEvent.click(screen.getByRole('button', { name: /set password and continue/i }));
}

describe('SetInitialPasswordForm', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('explains why the screen changed before showing the fields', () => {
    // Without this the sign-in form is simply replaced by two password boxes and
    // the user has no idea a temporary password is why.
    renderForm();

    expect(screen.getByText(/one more step before you can sign in/i)).toBeInTheDocument();
    expect(screen.getByText(/temporary password created by your bank admin/i)).toBeInTheDocument();
  });

  it('sends the temporary and new password, then hands the confirmation back', async () => {
    vi.mocked(setInitialPassword).mockResolvedValue('Password set successfully.');
    const { onDone } = renderForm();

    fillPasswords('AgentChosen9#');
    submit();

    await waitFor(() =>
      expect(setInitialPassword).toHaveBeenCalledWith({
        usr: 'agent@bank.com',
        currentPassword: TEMP_PASSWORD,
        newPassword: 'AgentChosen9#',
      })
    );
    // Passed up rather than toasted, so the sign-in screen can keep it on view
    // while the user types the password they just chose.
    await waitFor(() => expect(onDone).toHaveBeenCalledWith('Password set successfully.'));
  });

  it('shows the server message and stays put when the call fails', async () => {
    vi.mocked(setInitialPassword).mockRejectedValue(new Error('Incorrect email or password.'));
    const { onDone } = renderForm();

    fillPasswords('AgentChosen9#');
    submit();

    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password.');
    expect(onDone).not.toHaveBeenCalled();
  });

  it('rejects a password that fails the complexity rule without calling the API', async () => {
    renderForm();

    fillPasswords('alllowercase');
    submit();

    expect(await screen.findByRole('alert')).toHaveTextContent(/at least 1 number/i);
    expect(setInitialPassword).not.toHaveBeenCalled();
  });

  it('rejects mismatched confirmation without calling the API', async () => {
    renderForm();

    fillPasswords('AgentChosen9#', 'AgentChosen9$');
    submit();

    expect(await screen.findByRole('alert')).toHaveTextContent('Both passwords must match.');
    expect(setInitialPassword).not.toHaveBeenCalled();
  });

  it('refuses to reuse the temporary password', async () => {
    renderForm();

    fillPasswords(TEMP_PASSWORD);
    submit();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Choose a password different from the temporary one.'
    );
    expect(setInitialPassword).not.toHaveBeenCalled();
  });
});
