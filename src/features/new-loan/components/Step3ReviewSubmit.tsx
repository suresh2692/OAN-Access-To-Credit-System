'use client';

import { updateLeadStatusThunk } from '@/features/new-lead';
import { prevStep, selectLoanFormState, setStepAPI, submitApplicationAPI } from '@/features/new-loan/store/newLoanFormSlice';
import { logger } from '@/lib/logger';
import { Portal } from '@/components/Portal';
import type { AppDispatch } from '@/store';
import { AlertCircle, ArrowLeft, Check, ChevronDown, Folder, Loader2, Send, User } from 'lucide-react';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

export function Step3ReviewSubmit() {
  const dispatch = useDispatch<AppDispatch>();
  const { leadId, applicationId, loadingStates, errors } = useSelector(selectLoanFormState);

  const [acknowledged, setAcknowledged] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [showValidationPopup, setShowValidationPopup] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Note: there is no draft save here. This is the review step and has no fields
  // of its own — all loan data is entered in earlier steps and is already
  // persisted (to sessionStorage via the store middleware and to the backend via
  // the per-step thunks). A prior "auto-save" here was a label-only setTimeout
  // that persisted nothing, so it was removed.

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);
    if (!acknowledged) {
      setShowValidationPopup(true);
      return;
    }

    try {
      if (applicationId) {
        await dispatch(submitApplicationAPI(applicationId)).unwrap();
      }

      // Application submitted successfully — advance the lead to "Processed".
      if (leadId) {
        try {
          await dispatch(updateLeadStatusThunk({
            leadId,
            status: 'Processed',
            reason: 'Loan application submitted successfully.'
          })).unwrap();
        } catch (statusError) {
          logger.error('Failed to update lead status on backend:', statusError);
        }
      } else {
        logger.warn('No leadId in loan form state, skipping lead status update');
      }

      await dispatch(setStepAPI(4)).unwrap();
    } catch (error) {
      logger.error("Failed to submit application", error);
      setLocalError(error instanceof Error ? error.message : String(error) || "An unexpected error occurred during submission.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="animate-in fade-in slide-in-from-right-8 duration-500 space-y-6">

      <div className="rounded-xl bg-white p-6 shadow-sm border border-[#F1F3F4] rounded-xl shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 ">
        <h2 className="mb-6 text-sm font-bold text-gray-900 border-b border-gray-200 pb-4">Review Application</h2>

        <div className="space-y-4">
          {/* Consent & Supporting Documents Section */}
          <div className="flex flex-col rounded-lg border border-gray-200 bg-gray-50/50 transition-colors hover:bg-gray-50">
            <div className="flex items-center justify-between p-4 cursor-pointer gap-2 sm:gap-4" onClick={() => setExpandedSection(prev => prev === 'consent' ? null : 'consent')}>
              <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
                  <User size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[15px] sm:text-base font-bold text-gray-900 truncate">Consent & Supporting Documents</h3>
                  <p className="text-[13px] sm:text-sm text-gray-500 truncate">Obtain farmer&apos;s consent and upload required documents</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                <span className="flex items-center gap-1 rounded bg-green-100 px-2 py-1 text-[11px] sm:text-xs font-semibold text-green-700">
                  <Check size={12} className="sm:h-3.5 sm:w-3.5" /> Complete
                </span>
                <ChevronDown className={`h-5 w-5 shrink-0 text-gray-400 transition-transform duration-300 ${expandedSection === 'consent' ? 'rotate-180' : ''}`} />
              </div>
            </div>

            <div className={`grid transition-all duration-300 ease-in-out ${expandedSection === 'consent' ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
              <div className="overflow-hidden">
                <div className="p-4 pt-4 text-sm font-medium text-green-700 flex items-center gap-2 border-t border-gray-200 bg-green-50/30 justify-center">
                  <Check className={`shrink-0 transition-all duration-500 delay-150 ${expandedSection === 'consent' ? 'scale-125 opacity-100' : 'scale-50 opacity-0'}`} size={18} />
                  <span>All required consent and supporting documents have been successfully uploaded and verified.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Farmer Details Section */}
          <div className="flex flex-col rounded-lg border border-gray-200 bg-gray-50/50 transition-colors hover:bg-gray-50">
            <div className="flex items-center justify-between p-4 cursor-pointer gap-2 sm:gap-4" onClick={() => setExpandedSection(prev => prev === 'farmer' ? null : 'farmer')}>
              <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
                  <Folder size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[15px] sm:text-base font-bold text-gray-900 truncate">Farmer Details</h3>
                  <p className="text-[13px] sm:text-sm text-gray-500 truncate">Review the farmer profile information</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                <span className="flex items-center gap-1 rounded bg-green-100 px-2 py-1 text-[11px] sm:text-xs font-semibold text-green-700">
                  <Check size={12} className="sm:h-3.5 sm:w-3.5" /> Complete
                </span>
                <ChevronDown className={`h-5 w-5 shrink-0 text-gray-400 transition-transform duration-300 ${expandedSection === 'farmer' ? 'rotate-180' : ''}`} />
              </div>
            </div>

            <div className={`grid transition-all duration-300 ease-in-out ${expandedSection === 'farmer' ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
              <div className="overflow-hidden">
                <div className="p-4 pt-4 text-sm font-medium text-green-700 flex items-center gap-2 border-t border-gray-200 bg-green-50/30 justify-center">
                  <Check className={`shrink-0 transition-all duration-500 delay-150 ${expandedSection === 'farmer' ? 'scale-125 opacity-100' : 'scale-50 opacity-0'}`} size={18} />
                  <span>All farmer profile details and agronomic information have been successfully captured and verified.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-600 cursor-pointer shrink-0"
            />
            <span className="text-sm font-medium text-gray-700">
              I acknowledge that the information provided is true and correct to the best of my knowledge.
            </span>
          </label>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between bg-white px-4 sm:px-6 py-6 shadow-sm mt-8 relative z-0 gap-6 sm:gap-0 border border-[#F1F3F4] rounded-xl shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 ">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6">
          <div className="flex items-center justify-center sm:justify-start gap-2 text-[15px] font-normal text-[#16335A]">
            <Check className="h-5 w-5 text-[#16335A]" /> Your progress is saved automatically
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 font-semibold">
          {(errors.submitApp || localError) && (
            <div className="text-sm font-medium text-red-600 sm:mr-4 text-center sm:text-right">
              {errors.submitApp || localError}
            </div>
          )}
          <button type="button" onClick={() => dispatch(prevStep())} disabled={loadingStates.submitApp} className="flex flex-1 sm:flex-none justify-center items-center gap-2 rounded-md border border-gray-300 bg-white px-6 py-2.5 text-sm font-bold text-[#16335A] shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-50">
            <ArrowLeft className="h-4 w-4" /> Previous Step
          </button>
          <button type="submit" disabled={loadingStates.submitApp} className="flex flex-1 sm:flex-none justify-center items-center gap-2 rounded-md bg-[#16A34A] px-6 py-2.5 text-[15px] font-semibold text-white shadow-sm hover:bg-[#15803d] transition-colors disabled:opacity-50">
            {loadingStates.submitApp ? (
              <>Submitting... <Loader2 className="h-4 w-4 animate-spin" /></>
            ) : (
              <>Submit Application <Send className="h-4 w-4" /></>
            )}
          </button>
        </div>
      </div>
      {/* Validation Popup */}
      {showValidationPopup && (
        <Portal>
          <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden text-center p-8">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 mb-6">
                <AlertCircle className="h-8 w-8 text-red-600" strokeWidth={2} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Acknowledgment Required</h3>
              <p className="text-[15px] text-gray-600 mb-8">
                Please check the box to acknowledge that the information provided is correct before submitting the application.
              </p>
              <button
                type="button"
                onClick={() => setShowValidationPopup(false)}
                className="w-full rounded-xl bg-[#16A34A] py-3.5 text-[15px] font-bold text-white shadow-sm hover:bg-[#15803d] transition-colors"
              >
                <span className='font-semibold'>Got it</span>
              </button>
            </div>
          </div>
        </Portal>
      )}
    </form>
  );
}
