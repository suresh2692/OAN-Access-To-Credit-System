'use client';
import { Portal } from '@/components/Portal';
import { CheckCircle2, Mail, X } from 'lucide-react';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { forgotPassword } from '@/features/auth/api/authApi';
import { toast } from '@/lib/toast';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await forgotPassword(email);
      setIsSuccess(true);
    } catch (error) {
      toast.error((error instanceof Error && error.message) || 'Failed to send reset link');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[420px] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between p-5 border-b border-[#E5E7EB]">
            <h2 className="text-[18px] font-bold text-[#1F2937]">Forgot Password</h2>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="hover:text-red-500 hover:rotate-90 hover:scale-110 transition-transform duration-200" size={20} />
            </button>
          </div>

          <div className="p-6">
            {isSuccess ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-in scale-in duration-300">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-[18px] font-bold text-gray-900 mb-2">Check your email</h3>
                <p className="text-[14px] text-gray-500 mb-6">
                  We&apos;ve sent password reset instructions to <span className="font-semibold text-gray-700">{email}</span>
                </p>
                <button
                  onClick={() => {
                    onClose();
                    router.push(`/reset-password?email=${encodeURIComponent(email)}`);
                  }}
                  className="w-full bg-[#16A34A] hover:bg-[#15803d] text-white py-3 rounded-xl font-bold text-[14px] transition-colors"
                >
                  Enter OTP to Reset Password
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <p className="text-[14px] text-gray-500 mb-4">
                  Enter the email address associated with your account and we&apos;ll send you a link to reset your password.
                </p>
                <div className="space-y-1.5">
                  <label className="text-[14px] font-bold text-[#1F2937]">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full pl-11 pr-4 py-3 border border-[#D1D5DB] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A] text-[14px] transition-all"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting || !email}
                  className="w-full bg-[#16A34A] hover:bg-[#15803d] text-white py-3 rounded-xl font-bold text-[14px] transition-colors disabled:opacity-70 flex justify-center items-center"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <span className='font-semibold'>Send Reset Link</span>

                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}
