'use client';

import type { TaxonomyAttribute } from '@/lib/api/api.schemas';
import { NumericInput } from '@/components/ui/NumericInput';
import { CheckCircle2, Image as ImageIcon, X } from 'lucide-react';
import type { RefObject } from 'react';

// Small shared pieces used by both AddLoanProductModal and EditLoanProductModal.
// The two modals differ in visual density (Add is compact, Edit is roomier) and
// in field grouping/order, so each modal still composes these itself rather than
// one component trying to reproduce two different layouts — this only collapses
// the repeated label+input+error boilerplate and the two copies of the image
// dropzone / attributes grid that were duplicated near-verbatim.
export type ProductFieldMode = 'add' | 'edit' | 'view';

// View is Edit rendered read-only, so it shares Edit's visual styling — the two
// style buckets below stay keyed 'add' | 'edit', and `styleFor` collapses mode → bucket.
type ProductFieldStyle = 'add' | 'edit';
const styleFor = (mode: ProductFieldMode): ProductFieldStyle => (mode === 'add' ? 'add' : 'edit');

const TEXT_FIELD_STYLES: Record<ProductFieldStyle, { label: string; input: string; inputError: string; error: string }> = {
  add: {
    label: 'block text-xs font-bold text-gray-900 mb-1.5',
    input: 'w-full rounded-lg border border-[#D1D5DB] bg-white px-3.5 py-3 text-sm text-gray-900 transition-all focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A]',
    inputError: 'w-full rounded-lg border border-red-400 bg-white px-3.5 py-3 text-sm text-gray-900 transition-all focus:outline-none focus:ring-2 focus:ring-red-400/20 focus:border-red-400',
    error: 'mt-1 text-[11px] text-red-600',
  },
  edit: {
    label: 'text-[14px] font-bold text-[#1F2937]',
    input: 'w-full rounded-lg border px-4 py-2.5 text-[14px] focus:outline-none focus:ring-2 border-[#D1D5DB] focus:border-[#00C48C] focus:ring-[#00C48C]',
    inputError: 'w-full rounded-lg border px-4 py-2.5 text-[14px] focus:outline-none focus:ring-2 border-red-400 focus:border-red-400 focus:ring-red-200',
    error: 'mt-1 text-[12px] text-red-600',
  },
};

const FIELD_WRAPPER: Record<ProductFieldStyle, string> = {
  add: '',
  edit: 'space-y-1.5',
};

interface ProductTextFieldProps {
  mode: ProductFieldMode;
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  error?: string | undefined;
  type?: 'text' | 'number';
  placeholder?: string;
  min?: string;
  max?: string;
  step?: string;
  /** Caps the integer portion to N digits (e.g. 2 → max 99). Renders NumericInput when set. */
  maxIntegerDigits?: number;
  /** Caps the decimal portion to N digits (e.g. 2 → .XX). Renders NumericInput when set. */
  maxDecimalDigits?: number;
  /** Caps total digits (integer-only, strips decimals). Renders NumericInput when set. */
  maxDigits?: number;
  disabled?: boolean;
}

export function ProductTextField({
  mode, label, required, value, onChange, error, type = 'text', placeholder, min, max, step,
  maxIntegerDigits, maxDecimalDigits, maxDigits, disabled,
}: ProductTextFieldProps) {
  const style = styleFor(mode);
  const styles = TEXT_FIELD_STYLES[style];
  const hasDigitRestrictions = maxIntegerDigits !== undefined || maxDecimalDigits !== undefined || maxDigits !== undefined;

  return (
    <div className={FIELD_WRAPPER[style]}>
      <label className={styles.label}>
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {hasDigitRestrictions ? (
        <NumericInput
          type={type}
          min={min}
          max={max}
          step={step}
          {...(maxIntegerDigits !== undefined && { maxIntegerDigits })}
          {...(maxDecimalDigits !== undefined && { maxDecimalDigits })}
          {...(maxDigits !== undefined && { maxDigits })}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`${error ? styles.inputError : styles.input} ${disabled ? 'bg-gray-50 opacity-70 cursor-not-allowed' : ''}`}
        />
      ) : (
        <input
          type={type}
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${error ? styles.inputError : styles.input} ${disabled ? 'bg-gray-50 opacity-70 cursor-not-allowed' : ''}`}
        />
      )}
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}

const DROPZONE_STYLES: Record<ProductFieldStyle, { wrapper: string; label: string }> = {
  add: { wrapper: '', label: 'block text-xs font-bold text-gray-900 mb-1.5' },
  edit: { wrapper: 'space-y-1.5', label: 'text-[14px] font-bold text-[#1F2937]' },
};

interface ProductImageDropzoneProps {
  mode: ProductFieldMode;
  required?: boolean;
  imagePreview: string | null;
  onPick: () => void;
  onRemove: () => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  altText: string;
  placeholderText: string;
  disabled?: boolean;
}

export function ProductImageDropzone({
  mode, required, imagePreview, onPick, onRemove, fileInputRef, onFileSelect, altText, placeholderText, disabled,
}: ProductImageDropzoneProps) {
  const styles = DROPZONE_STYLES[styleFor(mode)];
  return (
    <div className={styles.wrapper}>
      <label className={styles.label}>
        Product Image {required && <span className="text-red-500">*</span>}
      </label>
      <input type="file" ref={fileInputRef} accept="image/png,image/jpeg,image/jpg" className="hidden" onChange={onFileSelect} disabled={disabled} />
      <div
        role={disabled ? undefined : "button"}
        tabIndex={disabled ? -1 : 0}
        onClick={disabled ? undefined : onPick}
        onKeyDown={disabled ? undefined : (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onPick();
          }
        }}
        className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-6 text-center transition-colors ${disabled ? 'opacity-70 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16A34A] focus-visible:ring-offset-2'}`}
      >
        {imagePreview ? (
          <div className="relative w-full h-32 rounded-xl overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element -- imagePreview can be a data: URL (fresh selection, needs `unoptimized` on next/image, unverified without a browser here) or an already-hosted URL */}
            <img src={imagePreview} alt={altText} className="w-full h-full object-cover" />
            {!disabled && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                className="absolute top-2 right-2 p-1 bg-black/60 text-white rounded-full hover:bg-black/80"
              >
                <X size={14} />
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm border border-gray-100 text-gray-400">
              <ImageIcon className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-gray-700">{placeholderText}</p>
            <p className="text-[11px] text-gray-400 mt-1">PNG, JPG up to 5MB</p>
          </>
        )}
      </div>
    </div>
  );
}

const ATTRIBUTE_STYLES: Record<ProductFieldStyle, {
  heading: string;
  grid: string;
  empty: string;
  card: (selected: boolean, themeCard: string) => string;
  name: (selected: boolean, themeName: string) => string;
  // Reproduces the original "subtext-[#...]" class exactly (not a real Tailwind
  // utility, so selecting an attribute never actually recolors the slug text) —
  // deliberately not "fixed" here since that would change today's rendered output.
  slug: (selected: boolean, themeSlug: string) => string;
}> = {
  add: {
    heading: 'text-xs font-bold text-gray-900 mb-3',
    grid: 'grid grid-cols-1 md:grid-cols-3 gap-3',
    empty: 'text-xs text-gray-500 italic',
    card: (selected, themeCard) => `cursor-pointer rounded-xl border-2 p-3.5 transition-all duration-200 ${selected ? themeCard : 'bg-white border-gray-200 opacity-70 hover:opacity-100'}`,
    name: (selected, themeName) => `text-xs font-bold ${selected ? themeName : 'text-gray-700'}`,
    slug: (selected, themeSlug) => `text-xs font-mono mt-1 ${selected ? themeSlug : 'text-gray-400'}`,
  },
  edit: {
    heading: 'text-[15px] font-bold text-[#1F2937]',
    grid: 'grid grid-cols-1 gap-3 md:grid-cols-3',
    empty: 'text-[13px] text-gray-500 italic',
    card: (selected) => `cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 ${selected ? 'scale-[1.02] border-[#00C48C] bg-[#E6F9F3] shadow-sm' : 'border-gray-200 bg-white opacity-70 hover:border-gray-300 hover:opacity-100'}`,
    name: (selected) => `text-[14px] font-bold ${selected ? 'text-[#00C48C]' : 'text-gray-700'}`,
    slug: () => 'mt-1 font-mono text-[12px] text-gray-500 opacity-80',
  },
};

// Add-only rotating theme (yellow/green/purple) for selected attribute cards; Edit uses one fixed accent color.
// Reproduced verbatim from the original theme string (including the non-functional "subtext-" class).
const ADD_THEMES = [
  { card: 'bg-[#FEFCE8] border-[#FEF08A]', name: 'text-[#854D0E]', slug: 'subtext-[#A16207]' },
  { card: 'bg-[#F0FDF4] border-[#BBF7D0]', name: 'text-[#166534]', slug: 'subtext-[#15803D]' },
  { card: 'bg-[#FAF5FF] border-[#E9D5FF]', name: 'text-[#6B21A8]', slug: 'subtext-[#7E22CE]' },
];

interface ProductAttributesGridProps {
  mode: ProductFieldMode;
  heading: string;
  attributes: TaxonomyAttribute[] | undefined;
  selectedAttributeTermIds: string[];
  onToggle: (termId: string) => void;
  emptyMessage: string;
  disabled?: boolean;
}

export function ProductAttributesGrid({ mode, heading, attributes, selectedAttributeTermIds, onToggle, emptyMessage, disabled }: ProductAttributesGridProps) {
  const styles = ATTRIBUTE_STYLES[styleFor(mode)];
  return (
    <div className={mode === 'add' ? 'pt-2' : 'space-y-3 pt-2'}>
      <h3 className={styles.heading}>{heading}</h3>
      {attributes && attributes.length > 0 ? (
        <div className={styles.grid}>
          {attributes.map((attr, idx) => {
            const isSelected = selectedAttributeTermIds.includes(attr.term_id);
            const addTheme = ADD_THEMES[idx % 3]!;
            return (
              <div
                key={attr.term_id}
                role={disabled ? undefined : "button"}
                tabIndex={disabled ? -1 : 0}
                aria-pressed={isSelected}
                onClick={disabled ? undefined : () => onToggle(attr.term_id)}
                onKeyDown={disabled ? undefined : (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onToggle(attr.term_id);
                  }
                }}
                className={`${styles.card(isSelected, addTheme.card)} ${disabled ? 'opacity-70 cursor-not-allowed' : 'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16A34A] focus-visible:ring-offset-2'}`}
              >
                {mode === 'add' ? (
                  <div className="flex items-center justify-between">
                    <p className={styles.name(isSelected, addTheme.name)}>{attr.term_name}</p>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />}
                  </div>
                ) : (
                  <p className={styles.name(isSelected, addTheme.name)}>{attr.term_name}</p>
                )}
                {attr.slug && <p className={styles.slug(isSelected, addTheme.slug)}>{attr.slug}</p>}
              </div>
            );
          })}
        </div>
      ) : (
        <p className={styles.empty}>{emptyMessage}</p>
      )}
    </div>
  );
}
