import React from 'react';

// `| undefined` is explicit on the optional props rather than relying on `?`
// alone. Under `exactOptionalPropertyTypes` those mean different things: `?` on
// its own permits the prop being *absent*, but not being passed an explicit
// `undefined`. Every call site reads its value out of an errors/hints record,
// and `noUncheckedIndexedAccess` types that lookup as `string | undefined` — so
// without this, the ordinary way to use this component does not type-check.
interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  required?: boolean | undefined;
  hint?: string | undefined;
  error?: string | undefined;
  className?: string | undefined;
}

export function InputField({ 
  label, 
  required = false, 
  hint, 
  error,
  className = "",
  ...props 
}: InputFieldProps) {
  return (
    <div className={`space-y-1.5 flex flex-col ${className}`}>
      <label className="text-[14px] font-semibold text-[#374151]">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        autoComplete="off"
        {...props}
        className={`w-full px-3 py-2.5 bg-white border ${error ? 'border-red-500' : 'border-[#D1D5DB]'} rounded-lg text-[14px] text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A] transition-all placeholder:text-[#9CA3AF]`}
      />
      {error ? (
        <span className="text-[12px] text-red-500">{error}</span>
      ) : (
        hint && <span className="text-[12px] text-[#6B7280]">{hint}</span>
      )}
    </div>
  );
}
