'use client';

import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { setInitialPassword } from '@/features/auth/api/authApi';
import { strongPasswordSchema } from '@/lib/api/api.schemas';
import { logger } from '@/lib/logger';
import { Eye, EyeOff, KeyRound, Lock, ShieldCheck } from 'lucide-react';
import { useState } from 'react';

interface SetInitialPasswordFormProps {
  /** Login id exactly as typed — email or phone; the backend resolves either. */
  usr: string;
  /** The temporary password just used to sign in. Re-verified server-side. */
  temporaryPassword: string;
  /**
   * Called once the password is set, with the confirmation to show on the
   * sign-in screen. The message is handed back rather than toasted from here so
   * it can persist next to the form the user has to fill in again — a toast
   * disappears before they've finished reading it.
   */
  onDone: (successMessage: string) => void;
  onCancel: () => void;
}

import { PasswordRequirements } from '@/components/ui/PasswordRequirements';

const INPUT_CLASSES =
  'w-full pl-10 py-3 bg-white border border-gray-300 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all placeholder:text-gray-400 font-medium shadow-sm';

/**
 * Shown in place of the login form when the password the user just signed in
 * with was issued by their bank admin. Until it is replaced there is no session
 * — so this is not a settings screen, it is the last step of signing in.
 */
export function SetInitialPasswordForm({
  usr,
  temporaryPassword,
  onDone,
  onCancel,
}: SetInitialPasswordFormProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const parsed = strongPasswordSchema.safeParse(newPassword);
    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? 'That password is not strong enough.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Both passwords must match.');
      return;
    }

    // The backend rejects this too; checking here saves a round trip and gives
    // the specific reason rather than a generic validation error.
    if (newPassword === temporaryPassword) {
      setErrorMessage('Choose a password different from the temporary one.');
      return;
    }

    setIsLoading(true);
    try {
      const message = await setInitialPassword({
        usr,
        currentPassword: temporaryPassword,
        newPassword,
      });
      setNewPassword('');
      setConfirmPassword('');
      onDone(message);
    } catch (error) {
      logger.error('setInitialPassword failed', { usr, error });
      setErrorMessage(
        error instanceof Error ? error.message : 'Could not set your password. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center h-full max-w-lg mx-auto w-full animate-fade-in-up">
      {/* The screen just changed under the user. Say plainly what happened and
          why, before they reach the fields — otherwise two password boxes simply
          appear where the sign-in form used to be. */}
      <div className="w-full mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <KeyRound className="mt-0.5 shrink-0 text-amber-600" size={18} strokeWidth={2.5} />
        <div>
          <p className="text-sm font-bold text-amber-900">One more step before you can sign in</p>
          <p className="mt-0.5 text-sm font-medium leading-relaxed text-amber-800">
            You signed in with a temporary password created by your bank admin. It can&apos;t be used
            to access the portal, so choose a password of your own now.
          </p>
        </div>
      </div>

      <div className="w-full flex flex-col items-center text-center mb-8">
        <h2 className="text-[28px] sm:text-[32px] font-bold text-gray-800 mb-2 tracking-tight">
          Set your password
        </h2>
        <p className="text-gray-500 text-[15px] font-medium">
          Finish setting up <span className="font-bold text-gray-700">{usr}</span>.
        </p>
      </div>

      {errorMessage && <ErrorAlert className="mb-6">{errorMessage}</ErrorAlert>}

      <form onSubmit={handleSubmit} className="w-full space-y-6">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="new-password" className="text-sm font-semibold text-gray-700">
              New Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Lock size={18} strokeWidth={2} />
              </div>
              <input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                required
                aria-invalid={errorMessage ? true : undefined}
                className={`${INPUT_CLASSES} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="confirm-password" className="text-sm font-semibold text-gray-700">
              Confirm New Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Lock size={18} strokeWidth={2} />
              </div>
              <input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                required
                className={`${INPUT_CLASSES} pr-4`}
              />
            </div>
          </div>

          <PasswordRequirements password={newPassword} />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-brand-green hover:bg-brand-green-hover text-white py-4 rounded-xl font-bold text-sm flex items-center justify-center transition-all active:scale-[0.98] shadow-sm disabled:opacity-70"
        >
          {isLoading ? 'Saving…' : 'Set password and continue'}
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="w-full text-sm font-bold text-gray-500 hover:text-gray-800 transition-colors bg-transparent border-none p-0 cursor-pointer"
        >
          Back to sign in
        </button>
      </form>

      <div className="mt-6 w-full bg-brand-green-surface border border-brand-green-border rounded-xl p-3 flex items-start space-x-3">
        <ShieldCheck className="text-brand-green mt-0.5 shrink-0" size={18} strokeWidth={2.5} />
        <p className="text-sm font-medium text-panel-soft leading-relaxed">
          Your bank admin knows the temporary password. Once you set your own, only you will know it.
        </p>
      </div>
    </div>
  );
}
