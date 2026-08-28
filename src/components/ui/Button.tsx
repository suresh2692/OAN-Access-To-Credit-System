import React, { ButtonHTMLAttributes, forwardRef } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  /** `none` sets no padding, height or text size — for a caller that supplies
   *  its own via `className` and only wants the variant, the focus ring and the
   *  `isLoading` spinner. Without it such a caller has to fight the size scale
   *  with conflicting utilities, which is why they hand-rolled `<button>`. */
  size?: 'sm' | 'md' | 'lg' | 'icon' | 'wide' | 'default' | 'none';
  isLoading?: boolean;
  as?: React.ElementType | string;
  href?: string;
}

const Button = forwardRef<HTMLElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', isLoading, children, disabled, as, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-bold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none rounded-[12px]';
    
    const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
      primary: 'bg-[#16A34A] text-white hover:bg-green-700 focus:ring-green-500 shadow-sm',
      secondary: 'bg-green-50 text-green-700 hover:bg-green-100 focus:ring-green-500',
      outline: 'border border-gray-200 bg-white text-[#16A34A] hover:bg-green-50 focus:ring-green-500',
      ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
      danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500',
      success: 'bg-[#16A34A] text-white hover:bg-[#15803D] focus:ring-green-500',
    };

    const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
      sm: 'h-9 px-3 text-xs',
      md: 'h-11 px-4 text-sm',
      lg: 'h-12 px-6 text-base',
      icon: 'h-10 w-10',
      wide: 'w-full md:w-auto min-w-[170px] px-4 py-2.5 text-sm',
      default: 'flex-1 md:flex-none px-4 py-2.5 text-sm',
      none: '',
    };

    const variantStyles = variants[variant];
    const sizeStyles = sizes[size];
    const Component = as || 'button';

    return (
      <Component
        ref={ref}
        className={`${baseStyles} ${variantStyles} ${sizeStyles} ${className} ${disabled || isLoading ? 'opacity-50 pointer-events-none' : ''}`}
        {...(Component === 'button' || Component === 'input' ? { disabled: disabled || isLoading } : {})}
        {...props}
      >
        {isLoading ? (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : null}
        {children}
      </Component>
    );
  }
);

Button.displayName = 'Button';

export { Button };
export default Button;
