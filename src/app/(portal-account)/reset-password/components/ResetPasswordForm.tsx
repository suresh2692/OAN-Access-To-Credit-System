'use client';

import { resetPassword } from '@/features/auth/api/authApi';
import { toast } from '@/lib/toast';
import { strongPasswordSchema } from '@/lib/api/api.schemas';
import { Loader, Spinner } from '@/components/ui/Loader';
import { PasswordRequirements } from '@/components/ui/PasswordRequirements';
import { Eye, EyeOff, KeyRound, Mail, Lock } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, useEffect } from 'react';

function ResetPasswordFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Seeds form fields from the URL's query params, which can only be read
    // client-side via useSearchParams — can't be computed during render.
    const emailParam = searchParams.get('email');
    const keyParam = searchParams.get('key');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (emailParam) setEmail(emailParam);
    if (keyParam) setOtp(keyParam);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !otp || !newPassword || !confirmPassword) return;

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    const parsed = strongPasswordSchema.safeParse(newPassword);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'That password is not strong enough.');
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword(email, otp, newPassword);
      toast.success('Password reset successfully');
      router.push('/login');
    } catch (error) {
      toast.error((error instanceof Error && error.message) || 'Failed to reset password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center max-w-md w-full mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-10 text-center md:text-left">
        <h1 className="text-[32px] md:text-[40px] font-extrabold text-[#111827] mb-3 tracking-tight">
          Reset Password
        </h1>
        <p className="text-[16px] text-[#4B5563] font-medium leading-relaxed">
          Enter your email, the OTP sent to you, and your new password to restore access to your account.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-[14px] font-bold text-[#374151]">Email Address</label>
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-[#16A34A] transition-colors" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full pl-12 pr-4 py-3.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A] focus:bg-white text-[15px] font-medium transition-all"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[14px] font-bold text-[#374151]">Reset OTP</label>
          <div className="relative group">
            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-[#16A34A] transition-colors" />
            <input
              type="text"
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter 6-digit OTP"
              className="w-full pl-12 pr-4 py-3.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A] focus:bg-white text-[15px] font-medium transition-all uppercase"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[14px] font-bold text-[#374151]">New Password</label>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-[#16A34A] transition-colors" />
            <input
              type={showNewPassword ? 'text' : 'password'}
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="w-full pl-12 pr-12 py-3.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A] focus:bg-white text-[15px] font-medium transition-all"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
            >
              {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
            <label className="text-[14px] font-semibold text-[#374151]">Confirm New Password</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <Lock className="w-5 h-5" />
              </span>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-11 pr-12 py-3 bg-white border border-[#D1D5DB] rounded-xl text-[14px] text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
        </div>

        <PasswordRequirements password={newPassword} />

        <button
          type="submit"
          disabled={isSubmitting || !email || !otp || !newPassword || !confirmPassword}
          className="w-full bg-[#16A34A] hover:bg-[#15803d] text-white py-4 rounded-2xl font-extrabold text-[15px] transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 flex justify-center items-center mt-4 shadow-sm"
        >
          {isSubmitting ? <Spinner size="sm" /> : 'Reset Password'}
        </button>
      </form>
    </div>
  );
}

export function ResetPasswordForm() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center">
        <Loader label={null} />
      </div>
    }>
      <ResetPasswordFormContent />
    </Suspense>
  );
}
