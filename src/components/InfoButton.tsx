import React, { useState, useRef, useEffect } from 'react';
import { Info, X } from 'lucide-react';

interface InfoButtonProps {
  title?: string;
  content: React.ReactNode;
  align?: 'left' | 'right' | 'center';
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  ariaLabel?: string;
}

export const InfoButton: React.FC<InfoButtonProps> = ({
  title,
  content,
  align = 'left',
  size = 'sm',
  className = '',
  ariaLabel = 'More information',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const iconSizes = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
  };

  const buttonPaddings = {
    xs: 'p-0.5',
    sm: 'p-1',
    md: 'p-1.5',
  };

  // Alignment classes for the popover
  const alignmentClasses = {
    left: 'left-0 sm:left-0 origin-top-left',
    right: 'right-0 sm:right-0 origin-top-right',
    center: 'left-1/2 -translate-x-1/2 origin-top',
  };

  return (
    <div ref={containerRef} className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className={`rounded-full transition-all duration-150 inline-flex items-center justify-center cursor-pointer ${buttonPaddings[size]} ${
          isOpen
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 ring-2 ring-emerald-500/30'
            : 'bg-zinc-100/80 hover:bg-zinc-200/80 text-zinc-400 hover:text-zinc-700 dark:bg-zinc-800/60 dark:hover:bg-zinc-700/80 dark:text-zinc-400 dark:hover:text-zinc-200'
        }`}
        title={title || 'Click for information'}
      >
        <Info className={iconSizes[size]} />
      </button>

      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute top-full mt-1.5 z-50 w-72 sm:w-80 max-w-[90vw] p-3.5 rounded-xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md shadow-xl border border-zinc-200/90 dark:border-zinc-700/90 text-xs animate-in fade-in zoom-in-95 duration-150 ${alignmentClasses[align]}`}
        >
          <div className="flex items-start justify-between gap-2 mb-1.5">
            {title ? (
              <h5 className="font-bold text-zinc-900 dark:text-zinc-100 text-xs flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{title}</span>
              </h5>
            ) : (
              <span className="font-semibold text-zinc-800 dark:text-zinc-200 text-xs">Information</span>
            )}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              aria-label="Close information"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="text-zinc-600 dark:text-zinc-300 leading-relaxed text-[11.5px] space-y-1.5">
            {typeof content === 'string' ? <p>{content}</p> : content}
          </div>
        </div>
      )}
    </div>
  );
};
