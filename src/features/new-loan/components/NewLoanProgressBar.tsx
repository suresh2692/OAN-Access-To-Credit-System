import { Check } from 'lucide-react';

export const STEPS = [
  { number: 1, label: 'Consent & Supporting Documents' },
  { number: 2, label: 'Farmer Details' },
  { number: 3, label: 'Review Application' },
];

export function NewLoanProgressBar({ currentStep }: { currentStep: number }) {
  // Calculate the width of the active (green) line based on current step
  const activeLineWidth = currentStep === 1 ? '0%' : currentStep === 2 ? '33.33%' : currentStep === 3 ? '66.66%' : '100%';

  return (
    <div className="bg-white border border-[#F1F3F4] rounded-xl shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
      <div className="px-1 sm:px-8 py-6 sm:py-8 w-full">
        <div className="relative flex items-center justify-between mx-auto w-full z-0">
          {/* Background Gray Line */}
          <div className="absolute left-[16.66%] right-[16.66%] top-[21px] -z-10 h-[2px] bg-gray-200"></div>
          {/* Active Green Line */}
          <div
            className="absolute left-[16.66%] top-[21px] -z-10 h-[2px] bg-[#16A34A] transition-all duration-500"
            style={{ width: activeLineWidth, maxWidth: '66.66%' }}
          ></div>

          {STEPS.map(step => {
            const isDone = step.number < currentStep || currentStep === 4;
            const isActive = step.number === currentStep;
            return (
              <div key={step.number} className="flex flex-col items-center flex-1 cursor-default text-center px-1 sm:px-2">
                <div className={`relative flex h-[36px] w-[36px] sm:h-[42px] sm:w-[42px] shrink-0 items-center justify-center rounded-full text-sm sm:text-base font-bold mb-2 sm:mb-3 transition-colors
                  ${isDone ? 'bg-[#509f6e] text-white' : isActive ? 'bg-[#16A34A] text-white' : 'bg-[#e2e8f0] text-[#1e293b]'}`}>
                  {isDone ? <Check strokeWidth={3} className="h-4 w-4 sm:h-5 sm:w-5" /> : step.number}
                </div>
                <p className="text-[12px] sm:text-[15px] font-bold text-[#16335A] mb-0.5">Step {step.number}</p>
                <p className={`text-[11px] sm:text-[13px] leading-tight sm:leading-normal ${isActive || isDone ? 'text-[#475569] font-bold' : 'text-[#64748b] font-medium'}`}>{step.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
