'use client';

import { useClickOutside } from '@/hooks/useClickOutside';
import { useEscapeToClose } from '@/hooks/useEscapeToClose';
import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

export type SelectOption = { label: string; value: string };

interface SelectFieldProps {
  id?: string;
  label?: string;
  placeholder?: string;
  options: (string | SelectOption)[];
  value: string;
  onChange: (val: string) => void;
  required?: boolean;
  error?: string | undefined;
  disabled?: boolean;
}

export function SelectField({ id, label, placeholder, options, value, onChange, required, error, disabled }: SelectFieldProps) {
  const getOptValue = (opt: string | SelectOption) => typeof opt === 'string' ? opt : opt.value;
  const getOptLabel = (opt: string | SelectOption) => typeof opt === 'string' ? opt : opt.label;

  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  useClickOutside(ref, () => setIsOpen(false), isOpen);

  useEscapeToClose(isOpen, () => setIsOpen(false), ref);

  // Otherwise a stale index survives across open/close cycles — if `options`
  // shrinks while closed, reopening could compute aria-activedescendant
  // pointing at an option id that's no longer rendered.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!isOpen) setActiveIndex(-1);
  }, [isOpen]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    const currentIndex = activeIndex >= 0 ? activeIndex : options.findIndex(o => getOptValue(o) === value);
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) { setIsOpen(true); setActiveIndex(currentIndex >= 0 ? currentIndex : 0); }
        else setActiveIndex(Math.min(options.length - 1, currentIndex + 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!isOpen) { setIsOpen(true); setActiveIndex(currentIndex >= 0 ? currentIndex : options.length - 1); }
        else setActiveIndex(Math.max(0, currentIndex - 1));
        break;
      case 'Home':
        if (isOpen) { e.preventDefault(); setActiveIndex(0); }
        break;
      case 'End':
        if (isOpen) { e.preventDefault(); setActiveIndex(options.length - 1); }
        break;
      case 'Enter':
      case ' ': {
        e.preventDefault();
        const activeOption = isOpen && activeIndex >= 0 ? options[activeIndex] : undefined;
        if (activeOption !== undefined) { onChange(getOptValue(activeOption)); setIsOpen(false); }
        else setIsOpen(o => !o);
        break;
      }
      default:
        break;
    }
  }

  const selectedOption = options.find(o => getOptValue(o) === value);
  const displayValue = selectedOption ? getOptLabel(selectedOption) : '';

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && <label htmlFor={id} className="text-sm font-medium text-gray-700">{label} {required && <span className="text-red-500">*</span>}</label>}
      <div ref={ref} className="relative">
        <input type="text" className="absolute opacity-0 w-0 h-0 p-0 m-0 border-0" value={value || ''} onChange={() => { }} required={required} tabIndex={-1} aria-hidden="true" />
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={listboxId}
          aria-activedescendant={isOpen && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
          onClick={() => { if (disabled) return; setIsOpen(o => !o); }}
          onKeyDown={handleKeyDown}
          className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm shadow-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16A34A] focus-visible:ring-offset-1 ${disabled ? 'border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed' : error ? 'border-red-400 bg-red-50/40' : isOpen ? 'border-[#16A34A] bg-white ring-2 ring-[#16A34A]/15' : 'border-gray-300 bg-white hover:border-[#16A34A]/50'}`}>
          <span className={disabled ? 'text-gray-500' : value ? 'text-gray-900' : 'text-gray-400'}>{displayValue || placeholder}</span>
          <ChevronDown size={15} className={`shrink-0 transition-transform ${isOpen ? 'rotate-180 text-[#16A34A]' : 'text-gray-400'}`} />
        </button>
        <ul
          id={listboxId}
          role="listbox"
          aria-label={label || placeholder}
          className={`absolute z-50 mt-1 w-full rounded-xl border border-gray-200 bg-white py-1 shadow-xl transition-all ${isOpen ? 'pointer-events-auto scale-y-100 opacity-100' : 'pointer-events-none scale-y-95 opacity-0'}`}
          style={{ maxHeight: '200px', overflowY: 'auto', transformOrigin: 'top' }}>
          {options.map((opt, idx) => {
            const optValue = getOptValue(opt);
            const optLabel = getOptLabel(opt);
            const sel = value === optValue;
            const active = idx === activeIndex;
            return <li key={`${optValue}-${idx}`} id={`${listboxId}-option-${idx}`} role="option" aria-selected={sel}
              onMouseDown={() => { onChange(optValue); setIsOpen(false); }}
              onMouseEnter={() => setActiveIndex(idx)}
              className={`flex cursor-pointer items-center justify-between px-3 py-2 text-sm ${sel ? 'bg-[#16A34A]/8 font-medium text-[#16A34A]' : active ? 'bg-gray-50 text-gray-800' : 'text-gray-800 hover:bg-gray-50'}`}>
              {optLabel}{sel && <Check size={13} strokeWidth={2.5} className="text-[#16A34A]" />}
            </li>;
          })}
        </ul>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
