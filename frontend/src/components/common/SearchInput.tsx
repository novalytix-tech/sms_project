import React from 'react';
import { Search, X } from 'lucide-react';

export interface SearchInputProps {
  value: string;
  onChange: (value: string, event?: React.ChangeEvent<HTMLInputElement>) => void;
  onClear?: () => void;
  placeholder?: string;
  className?: string;
  wrapperClassName?: string;
  style?: React.CSSProperties;
  wrapperStyle?: React.CSSProperties;
  disabled?: boolean;
  autoFocus?: boolean;
  ariaLabel?: string;
  id?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  onClear,
  placeholder = 'Search...',
  className = '',
  wrapperClassName = '',
  style,
  wrapperStyle,
  disabled = false,
  autoFocus = false,
  ariaLabel = 'Search input',
  id,
}) => {
  const handleClear = () => {
    onChange('', undefined);
    if (onClear) onClear();
  };

  return (
    <div
      className={`filter-search ${wrapperClassName}`.trim()}
      style={wrapperStyle}
    >
      <Search className="filter-search-icon" size={15} aria-hidden="true" />
      <input
        id={id}
        type="text"
        className={`form-input search-input-field ${className}`.trim()}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value, e)}
        disabled={disabled}
        autoFocus={autoFocus}
        aria-label={ariaLabel}
        style={style}
      />
      {value && !disabled && (
        <button
          type="button"
          className="filter-search-clear search-clear-btn"
          onClick={handleClear}
          title="Clear search"
          aria-label="Clear search text"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
};
