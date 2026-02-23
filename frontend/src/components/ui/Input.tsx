import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-[14px] text-slate-900 ring-offset-white placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50',
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

export default Input;
