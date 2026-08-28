'use client';

import { useClickOutside } from '@/hooks/useClickOutside';
import { useEscapeToClose } from '@/hooks/useEscapeToClose';
import { Clock } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import styles from './TimePickerField.module.css';

interface TimePickerFieldProps {
  id?: string;
  label?: string;
  value: string; // Format: "HH:mm A" e.g. "02:35 PM"
  onChange: (val: string) => void;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
}

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const PERIODS = ['AM', 'PM'];

/**
 * Grace period before the pointer leaving dismisses the panel.
 *
 * Closing on the bare `mouseleave` makes the three columns almost unusable —
 * clipping a corner on the way from Hour to AM/PM would shut the picker
 * mid-selection. Long enough to cross the gap, short enough that the panel
 * doesn't linger once the pointer has genuinely moved on.
 */
const POINTER_LEAVE_CLOSE_MS = 260;

// Roving-tabindex listbox: one Tab stop per column, Up/Down/Home/End move
// between options — instead of every option being its own Tab stop.
function TimeListbox({ label, options, value, onChange, selectedExtraClassName }: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  selectedExtraClassName?: string;
}) {
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const activeIndex = Math.max(0, options.indexOf(value));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        itemRefs.current[Math.min(options.length - 1, index + 1)]?.focus();
        break;
      case 'ArrowUp':
        e.preventDefault();
        itemRefs.current[Math.max(0, index - 1)]?.focus();
        break;
      case 'Home':
        e.preventDefault();
        itemRefs.current[0]?.focus();
        break;
      case 'End':
        e.preventDefault();
        itemRefs.current[options.length - 1]?.focus();
        break;
      default:
        break;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" role="listbox" aria-label={label}>
      {options.map((opt, index) => (
        <button
          key={opt}
          ref={(el) => { itemRefs.current[index] = el; }}
          onClick={() => onChange(opt)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          role="option"
          aria-selected={value === opt}
          tabIndex={index === activeIndex ? 0 : -1}
          className={`w-full py-2 mb-1 text-center text-sm font-medium transition-colors rounded-lg ${value === opt
            ? `bg-[#16A34A] hover:bg-[#10883c] text-white focus:outline-none ${selectedExtraClassName ?? ''}`
            : 'text-gray-900 hover:bg-gray-100'
            }`}
        >
          <span className='font-semibold'>{opt}</span>
        </button>
      ))}
    </div>
  );
}

export function TimePickerField({ id, label, value, onChange, required, error, disabled, placeholder = '--:-- --' }: TimePickerFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogTitleId = useId();

  const [hour, setHour] = useState('');
  const [minute, setMinute] = useState('');
  const [period, setPeriod] = useState('');

  // Resync whenever the value prop changes — not just on mount — so this field
  // reflects a new value when the parent reuses the same mounted instance for
  // a different record (e.g. switching between two schedule entries).
  useEffect(() => {
    const match = value?.match(/^(\d{2}):(\d{2})\s(AM|PM)$/);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHour(match?.[1] ?? '');
    setMinute(match?.[2] ?? '');
    setPeriod(match?.[3] ?? '');
  }, [value]);

  useEscapeToClose(isOpen, () => {
    setIsOpen(false);
    triggerRef.current?.focus();
  }, ref);

  useClickOutside(ref, () => setIsOpen(false), isOpen);

  // Dismiss the panel when the pointer or focus leaves it, not only when
  // something else is clicked. Left open, an absolutely-positioned 240x256px
  // panel sits over the fields under it — on the schedule-visit form that is the
  // whole Agenda box — so moving away from the picker had no way to put it away
  // short of clicking somewhere harmless.
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelPendingClose = () => {
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  useEffect(() => () => {
    if (closeTimerRef.current !== null) clearTimeout(closeTimerRef.current);
  }, []);

  const handlePointerLeave = () => {
    if (!isOpen) return;
    cancelPendingClose();
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      // Deliberately not skipped when focus is still inside the panel: picking an
      // hour leaves focus on that option button, which is the most common way to
      // arrive here — bailing out on "something inside is focused" would keep the
      // panel open in exactly the case this is meant to close.
      const hadFocusInside = ref.current?.contains(document.activeElement);
      setIsOpen(false);
      // Closing unmounts whatever was focused, dropping focus to <body> and
      // losing the tab position, so hand it back to the field's own trigger.
      if (hadFocusInside) triggerRef.current?.focus();
    }, POINTER_LEAVE_CLOSE_MS);
  };

  const handleFocusOut = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!isOpen) return;
    const next = e.relatedTarget as Node | null;
    // No relatedTarget means focus went nowhere focusable — a click on plain page
    // chrome, or the window itself losing focus. Click-outside already covers
    // that case, and treating it as "left the field" here would close the panel
    // on a click that merely landed on its own padding.
    if (!next || ref.current?.contains(next)) return;
    setIsOpen(false);
  };

  useEffect(() => {
    // When any part changes, emit if all parts are selected
    if (hour && minute && period) {
      onChange(`${hour}:${minute} ${period}`);
    }
  }, [hour, minute, period, onChange]);

  const displayValue = (hour && minute && period) ? `${hour}:${minute} ${period}` : '';

  return (
    <div
      className="relative flex flex-col gap-1.5 w-full"
      ref={ref}
      onMouseEnter={cancelPendingClose}
      onMouseLeave={handlePointerLeave}
      onBlur={handleFocusOut}
    >
      <input type="text" className="absolute opacity-0 w-0 h-0 p-0 m-0 border-0" value={value} onChange={() => { }} required={required} tabIndex={-1} aria-hidden="true" />
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-[#374151]">
          {label} {required && <span className="text-[#EF4444]">*</span>}
        </label>
      )}
      <button ref={triggerRef} id={id} type="button" onClick={() => { if (disabled) return; setIsOpen(o => !o); }}
        aria-haspopup="dialog" aria-expanded={isOpen}
        className={`flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm shadow-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1677FF] focus-visible:ring-offset-1
          ${disabled ? 'border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed'
            : error ? 'border-red-400 bg-red-50/40'
              : isOpen ? 'border-[#16A34A] bg-white ring-1 ring-[#16A34A]'
                : 'border-gray-200 bg-white hover:border-[#16A34A]/50'}`}>
        <span className={`flex items-center gap-2 ${disabled ? 'text-gray-500' : displayValue ? 'text-[#111827]' : 'text-gray-400'}`}>
          <Clock size={16} className="shrink-0 text-gray-400" />
          {displayValue || placeholder}
        </span>
      </button>

      {isOpen && (
        <div role="dialog" aria-modal="false" aria-labelledby={dialogTitleId}
          className={`absolute top-full left-0 z-50 mt-1.5 w-[240px] rounded-lg border border-gray-200 bg-white shadow-xl overflow-hidden transform-origin-top transition-all duration-200 ${styles.dropdown}`}>
          <span id={dialogTitleId} className="sr-only">Choose time</span>
          <div className="flex flex-row h-64 p-2 gap-1 bg-white">
            <TimeListbox label="Hour" options={HOURS} value={hour} onChange={setHour} selectedExtraClassName="border-2 border-black" />
            <TimeListbox label="Minute" options={MINUTES} value={minute} onChange={setMinute} />
            <TimeListbox label="AM or PM" options={PERIODS} value={period} onChange={setPeriod} />
          </div>
        </div>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
