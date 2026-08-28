'use client';

import { InputHTMLAttributes, forwardRef, KeyboardEvent, ChangeEvent } from 'react';
import { preventInvalidNumberChars, sanitizeNumberInput } from '@/lib/utils';

export interface NumericInputProps extends InputHTMLAttributes<HTMLInputElement> {
  maxIntegerDigits?: number;
  maxDecimalDigits?: number;
  maxDigits?: number;
}

export interface SanitizeNumericOptions {
  maxIntegerDigits?: number | undefined;
  maxDecimalDigits?: number | undefined;
  maxDigits?: number | undefined;
}

export function sanitizeNumericValue(raw: string, options: SanitizeNumericOptions = {}): string {
  let sanitized = sanitizeNumberInput(raw);

  if (options.maxDigits !== undefined && sanitized) {
    const digitsOnly = sanitized.replace(/\D/g, '');
    sanitized = digitsOnly.slice(0, options.maxDigits);
  }

  if ((options.maxIntegerDigits !== undefined || options.maxDecimalDigits !== undefined) && sanitized) {
    const parts = sanitized.split('.');
    let intPart = parts[0] ?? '';
    if (options.maxIntegerDigits !== undefined && intPart.length > options.maxIntegerDigits) {
      intPart = intPart.slice(0, options.maxIntegerDigits);
    }

    if (parts.length > 1) {
      let decPart = parts.slice(1).join('');
      if (options.maxDecimalDigits !== undefined && decPart.length > options.maxDecimalDigits) {
        decPart = decPart.slice(0, options.maxDecimalDigits);
      }
      sanitized = `${intPart}.${decPart}`;
    } else {
      sanitized = intPart;
    }
  }

  return sanitized;
}

/**
 * A standard numeric input that automatically prevents 'e', 'E', '+', and '-' 
 * characters from being typed or pasted, and optionally caps integer/decimal digits.
 * 
 * Works exactly like a native <input type="number"> and accepts all the same props, 
 * including standard refs and classNames.
 */
export const NumericInput = forwardRef<HTMLInputElement, NumericInputProps>(
  (
    {
      onKeyDown,
      onChange,
      type = 'number',
      maxIntegerDigits,
      maxDecimalDigits,
      maxDigits,
      ...props
    },
    ref
  ) => {
    
    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      preventInvalidNumberChars(e);
      onKeyDown?.(e);
    };

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      const sanitized = sanitizeNumericValue(e.target.value, {
        maxIntegerDigits,
        maxDecimalDigits,
        maxDigits,
      });

      if (e.target.value !== sanitized) {
        e.target.value = sanitized;
      }
      onChange?.(e);
    };

    return (
      <input
        ref={ref}
        type={type}
        onKeyDown={handleKeyDown}
        onChange={handleChange}
        {...props}
      />
    );
  }
);
NumericInput.displayName = 'NumericInput';
