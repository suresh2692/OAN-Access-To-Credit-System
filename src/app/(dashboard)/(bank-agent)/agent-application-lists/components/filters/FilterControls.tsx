'use client';

import { Check, Filter } from 'lucide-react';
import { forwardRef } from 'react';

/**
 * The two pieces every column-header filter is built from.
 *
 * `useColumnFilterDropdown` already shared the positioning and the click-outside
 * behaviour; this shares the markup, which is where the accessibility was
 * missing. All three filters drew their trigger and their rows as `<div
 * onClick>` — no focus, no Enter or Space, no role — so the Applications List
 * could not be filtered at all without a mouse. They are buttons here, which
 * gets all of that from the platform rather than from a keydown handler.
 */

interface FilterTriggerProps {
  /** The column heading, which doubles as the control's accessible name. */
  label: string;
  isOpen: boolean;
  /** Tints the funnel when a filter is actually applied, not merely open. */
  isActive: boolean;
  onClick: () => void;
  /** The STATUS column is centred; the others are not. */
  center?: boolean;
}

export const FilterTrigger = forwardRef<HTMLButtonElement, FilterTriggerProps>(
  ({ label, isOpen, isActive, onClick, center = false }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      onClick={onClick}
      className={`flex items-center gap-1.5 cursor-pointer select-none text-gray-500 hover:text-gray-700 transition-colors ${center ? 'justify-center' : ''}`}
    >
      {label}
      <Filter
        className={`w-3.5 h-3.5 transition-colors ${isOpen || isActive ? 'text-[#16A34A]' : ''}`}
        aria-hidden="true"
      />
    </button>
  )
);
FilterTrigger.displayName = 'FilterTrigger';

interface FilterCheckboxRowProps {
  checked: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  /** Row padding: the 340px amount menu is roomier than the 300px ones. */
  padding?: string;
}

export function FilterCheckboxRow({
  checked,
  onToggle,
  children,
  padding = 'px-5 py-2.5',
}: FilterCheckboxRowProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      className={`w-full text-left flex items-center gap-4 hover:bg-gray-50 cursor-pointer text-[14px] font-medium text-gray-800 select-none group transition-colors normal-case ${padding}`}
    >
      <span
        className={`w-5 h-5 shrink-0 rounded-[4px] border flex items-center justify-center transition-all duration-200 ${checked ? 'bg-[#16A34A] border-[#16A34A]' : 'border-gray-300 group-hover:border-[#16A34A]/50'}`}
      >
        <Check
          className={`w-3.5 h-3.5 text-white transition-all duration-200 ${checked ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}
          strokeWidth={3}
          aria-hidden="true"
        />
      </span>
      {children}
    </button>
  );
}
