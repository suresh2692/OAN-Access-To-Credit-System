'use client';

import { SelectField } from '@/components/ui/SelectField';
import { TextField } from '@/components/ui/TextField';
// eslint-disable-next-line boundaries/dependencies -- TODO (2026-08-23): needs to be fixed later; hiding for now as this existed before our changes
import { loanService } from '@/features/loans/api/loan.service';
import {
  DEFAULT_FARMER_DETAILS, FORM_SECTIONS, mapApiToFarmerDetails,
  type FarmerDetails
  // eslint-disable-next-line boundaries/dependencies -- TODO (2026-08-23): needs to be fixed later; hiding for now as this existed before our changes
} from '@/features/loans/constants/form-sections';
import { nextStepAPI, prevStepAPI, setFormData as setFormDataAction } from '@/features/new-loan/store/newLoanFormSlice';
import { logger } from '@/lib/logger';
import { maskSensitiveId } from '@/lib/utils';
import type { AppDispatch, RootState } from '@/store';
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';


export function Step2FarmerDetails() {
  const dispatch = useDispatch<AppDispatch>();
  const savedFormData = useSelector((state: RootState) => state.loanForm.formData);
  const applicationId = useSelector((state: RootState) => state.loanForm.applicationId);

  // Initialize with saved Redux state or defaults
  const [formData, setFormData] = useState<FarmerDetails>(() => ({
    ...DEFAULT_FARMER_DETAILS,
    ...(savedFormData || {}),
  }));

  const handleChange = (field: keyof FarmerDetails) => (value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value.toString() }));
  };

  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  // Tracks which sensitive fields (by key) the user has chosen to reveal.
  const [revealedFields, setRevealedFields] = useState<Record<string, boolean>>({});

  const toggleReveal = (key: string) =>
    setRevealedFields((prev) => ({ ...prev, [key]: !prev[key] }));

  useEffect(() => {
    async function loadProfile() {
      if (!applicationId) return;
      try {
        setIsLoadingProfile(true);
        const response = await loanService.getFullProfile(applicationId);
        const data = response?.data || {};

        setFormData(mapApiToFarmerDetails(data));
      } catch (err) {
        logger.error("Failed to load full profile:", err);
      } finally {
        setIsLoadingProfile(false);
      }
    }

    loadProfile();
  }, [applicationId]);

  useEffect(() => {
    const timer = setInterval(() => {
      dispatch(setFormDataAction(formData));
    }, 60000); // Auto save every 60 seconds
    return () => clearInterval(timer);
  }, [formData, dispatch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(setFormDataAction(formData));
    dispatch(nextStepAPI());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <form onSubmit={handleSubmit} className="animate-in fade-in slide-in-from-right-8 duration-500 space-y-6">
      {FORM_SECTIONS.map((section, sectionIdx) => (
        <div key={section.title} className="rounded-xl bg-white p-4 sm:p-6 shadow-sm relative border border-[#F1F3F4] rounded-xl shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 ">
          {sectionIdx === 0 && isLoadingProfile && (
            <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10 rounded-xl">
              <Loader2 className="h-6 w-6 animate-spin text-[#16335A]" />
            </div>
          )}
          <h2 className="mb-6 text-sm font-bold text-gray-900 border-b border-gray-200 pb-4">{section.title}</h2>
          <div className={`grid grid-cols-1 gap-6 sm:grid-cols-2 ${section.gridCols || 'lg:grid-cols-3'}`}>
            {section.fields.map((field) => {
              if (field.type === 'select') {
                return (
                  <SelectField
                    key={field.key}
                    label={field.label}
                    value={formData[field.key] ?? ''}
                    options={field.options || []}
                    onChange={handleChange(field.key)}
                    disabled
                  />
                );
              }
              const rawValue = formData[field.key] ?? '';

              if (field.isList) {
                const listItems = rawValue ? rawValue.split(',').map(s => s.trim()).filter(Boolean) : [];
                return (
                  <div key={field.key} className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-semibold text-[#16335A] uppercase tracking-wide">{field.label}</label>
                    {listItems.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {listItems.map((item, idx) => (
                          <div key={idx} className="bg-gray-50 border border-gray-300 rounded-md px-3 py-2 text-[15px] font-medium text-gray-900">
                            {item}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <TextField label="" value="" readOnly />
                    )}
                  </div>
                );
              }

              if (field.sensitive) {
                const isRevealed = !!revealedFields[field.key];
                const displayValue = isRevealed || !rawValue ? rawValue : maskSensitiveId(rawValue);
                return (
                  <div key={field.key} className="relative">
                    <TextField
                      label={field.label}
                      value={displayValue}
                      readOnly
                    />
                    {rawValue && (
                      <button
                        type="button"
                        onClick={() => toggleReveal(field.key)}
                        className="absolute right-3 top-[38px] text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label={isRevealed ? `Hide ${field.label}` : `Reveal ${field.label}`}
                      >
                        {isRevealed ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    )}
                  </div>
                );
              }
              return (
                <TextField
                  key={field.key}
                  label={field.label}
                  value={rawValue}
                  onChange={handleChange(field.key)}
                  readOnly
                />
              );
            })}
          </div>
        </div>
      ))}

      {/* Bottom Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between bg-white px-4 sm:px-6 py-6 shadow-sm mt-8 relative z-0 gap-6 sm:gap-0 border border-[#F1F3F4] rounded-xl shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 ">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6">
          <div className="flex items-center justify-center sm:justify-start gap-2 text-[15px] font-normal text-[#16335A]">
            <Check className="h-5 w-5 text-[#16335A]" /> Your progress is saved automatically
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 font-semibold">
          <button type="button" onClick={() => dispatch(prevStepAPI())} className="flex flex-1 sm:flex-none justify-center items-center gap-2 rounded-md border border-gray-300 bg-white px-6 py-2.5 text-sm font-bold text-[#16335A] shadow-sm hover:bg-gray-50 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Previous Step
          </button>
          <button type="submit" className="flex flex-1 sm:flex-none justify-center items-center gap-2 rounded-md bg-[#16A34A] px-6 py-2.5 text-[15px] font-semibold text-white shadow-sm hover:bg-[#15803d] transition-colors">
            Next Step <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </form>
  );
}
