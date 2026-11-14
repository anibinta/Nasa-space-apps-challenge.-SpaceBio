import React from 'react';
import { cn } from '../ui/cn';

/**
 * Renders crisp SVG country flag via the `flag-icons` CSS/SVG package (never Unicode emoji).
 */
export const FlagIcon: React.FC<{
  code: string;
  className?: string;
  title?: string;
}> = ({ code, className, title }) => {
  const safeCode = code.toLowerCase().replace(/[^a-z]/g, '');
  return (
    <span
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      title={title}
      className={cn(
        'fi',
        `fi-${safeCode}`,
        'inline-block h-3.5 w-5 shrink-0 rounded-[2px] border border-slate-300/40 bg-cover bg-center dark:border-slate-700/60',
        className
      )}
    />
  );
};
