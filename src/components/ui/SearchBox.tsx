import { Search, X } from "lucide-react";
import type { KeyboardEvent, RefObject } from "react";

interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
  inputClassName?: string;
  trailingLabel?: string;
  ariaLabel?: string;
  clearable?: boolean;
  compact?: boolean;
  autoFocus?: boolean;
  readOnly?: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
  onFocus?: () => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
}

export function SearchBox({
  value,
  onChange,
  placeholder,
  className = "",
  inputClassName = "",
  trailingLabel,
  ariaLabel,
  clearable = true,
  compact = false,
  autoFocus = false,
  readOnly = false,
  inputRef,
  onFocus,
  onKeyDown,
}: SearchBoxProps) {
  const showClear = clearable && value.length > 0;

  return (
    <label
      className={`grid min-w-0 grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-sm shadow-[var(--shadow-sm)] transition-[border-color,box-shadow] duration-150 focus-within:border-[var(--brand-primary)] focus-within:shadow-[var(--shadow-focus)] ${
        compact ? "min-h-9" : "min-h-10"
      } ${className}`}
    >
      <Search size={compact ? 14 : 16} className="shrink-0 text-[var(--text-soft)]" />
      <input
        aria-label={ariaLabel ?? placeholder}
        className={`min-w-0 appearance-none border-0 bg-transparent p-0 font-semibold text-[var(--text)] outline-none ring-0 placeholder:text-[var(--input-placeholder)] focus:border-0 focus:outline-none focus:ring-0 ${
          compact ? "text-sm" : "text-sm"
        } ${inputClassName}`}
        placeholder={placeholder}
        value={value}
        ref={inputRef}
        autoFocus={autoFocus}
        readOnly={readOnly}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        onChange={(event) => onChange(event.target.value)}
      />
      {showClear ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="grid h-7 w-7 place-items-center rounded-[var(--radius-sm)] text-[var(--text-soft)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      ) : trailingLabel ? (
        <span className="text-[10px] font-black uppercase tracking-[0.08em] text-[var(--text-soft)]">{trailingLabel}</span>
      ) : (
        <span aria-hidden="true" />
      )}
    </label>
  );
}
