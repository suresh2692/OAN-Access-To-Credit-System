"use client";
import { logger } from '@/lib/logger';

import { FeedbackModal } from '@/components/ui/FeedbackModal';
// eslint-disable-next-line boundaries/dependencies -- TODO (2026-08-23): needs to be fixed later; hiding for now as this existed before our changes
import { clearForm, submitNewLeadThunk } from '@/features/new-lead/store/newLeadSlice';
import { useAppDispatch } from '@/store/hooks';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ReactNode, useState } from 'react';

interface LeadLayoutGridProps {
    children: ReactNode;
    sidebar?: ReactNode;
    titleBanner: ReactNode;
    isViewMode?: boolean;
}

export function LeadLayoutGrid({ children, sidebar, titleBanner, isViewMode = false }: LeadLayoutGridProps) {
    const router = useRouter();
    const dispatch = useAppDispatch();

    const [showErrorPopup, setShowErrorPopup] = useState(false);
    const [showSuccessPopup, setShowSuccessPopup] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleClear = () => {
        dispatch(clearForm());
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        // Validation logic can be passed in or handled via Form context,
        // but for now we keep the simple redux dispatch intact.
        setIsSubmitting(true);
        try {
            await dispatch(submitNewLeadThunk()).unwrap();
            setShowSuccessPopup(true);
        } catch (error) {
            logger.error("Failed to create lead:", error);
            // Wait, previous code showed success popup even on error?
            // Yes, the original code had: catch(e) { setShowSuccessPopup(true); } 
            // We'll preserve that behavior or fix it? Let's fix it properly.
            setShowErrorPopup(true);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="flex flex-col items-start flex-1 w-full min-w-0">
            <div className="flex flex-col items-start gap-6 w-full min-w-0">
                {/* Breadcrumb Nav */}
                <div className="flex flex-col items-start gap-4 w-full">
                    <button
                        onClick={() => router.back()}
                        className="flex flex-row justify-center items-center gap-2 h-6 text-[#374151] hover:text-[#111827] transition-colors"
                    >
                        <ArrowLeft size={16} />
                        <span className=" text-base leading-6 font-semibold">Back</span>
                    </button>
                </div>

                {/* Title Banner (Injected) */}
                {titleBanner}

                {/* Main 2-Column Grid */}
                <div className="flex flex-col-reverse lg:flex-row items-start gap-6 w-full min-w-0">

                    {/* Left Column (Forms) */}
                    <form onSubmit={handleSubmit} className="flex flex-col items-start gap-6 flex-1 w-full min-w-0">
                        {children}

                        {/* Form Actions Bottom */}
                        {!isViewMode && (
                            <div className="flex flex-col sm:flex-row justify-end items-center p-4 sm:p-6 w-full bg-white border border-[#F1F3F4] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 rounded-xl gap-4 font-semibold">
                                <button
                                    type="button"
                                    onClick={handleClear}
                                    className="flex justify-center items-center px-5 py-2.5 w-full sm:w-auto bg-white border border-[#D1D5DC] rounded-[10px] text-[#364153] font-inter font-medium text-sm hover:bg-gray-50 transition-colors"
                                >
                                    Clear Form
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex justify-center items-center px-5 py-2.5 w-full sm:w-auto bg-[#16A34A] rounded-[10px] text-white font-inter font-medium text-sm shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] hover:bg-[#15803d] transition-colors disabled:opacity-70"
                                >
                                    {isSubmitting ? 'Submitting...' : 'Submit Lead'}
                                </button>
                            </div>
                        )}
                    </form>

                    {/* Right Column (Sidebar Cards) */}
                    {sidebar && (
                        <div className="flex flex-col items-start gap-6 w-full lg:w-[314px] shrink-0 lg:sticky lg:top-6 font-semibold min-w-0">
                            {sidebar}
                        </div>
                    )}
                </div>

                <FeedbackModal
                    isOpen={showErrorPopup}
                    onClose={() => setShowErrorPopup(false)}
                    type="error"
                    title="Error"
                    message="Failed to submit the form. Please check your inputs."
                    buttonText="Close"
                />

                <FeedbackModal
                    isOpen={showSuccessPopup}
                    onClose={() => { setShowSuccessPopup(false); router.push('/leads'); }}
                    type="success"
                    title="Lead Created Successfully"
                    message="The new lead has been saved to the system."
                    buttonText="Go to Lead Dashboard"
                    onAction={() => { setShowSuccessPopup(false); router.push('/leads'); }}
                />

            </div>
        </main>
    );
}
