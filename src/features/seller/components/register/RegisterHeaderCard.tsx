import { FormCard } from './FormCard';

export function RegisterHeaderCard() {
  return (
    <FormCard>
      <p className="text-[12px] font-bold text-[#6B7280] mb-1">Organisation Onboarding.</p>
      <h1 className="text-[24px] font-bold text-[#1F2937] mb-2">Register your organisation</h1>
      <p className="text-[#6B7280] text-[14px]">
        A few details to confirm your organisation on the OAN Access to Credit network. KYC documents are collected after registration.
      </p>
    </FormCard>
  );
}
