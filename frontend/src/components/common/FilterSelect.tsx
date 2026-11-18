import React from 'react';

export interface FilterOption {
  label: string;
  value: string | number;
}

export interface FilterSelectProps {
  label?: string;
  value: string | number;
  onChange: (value: string, event?: React.ChangeEvent<HTMLSelectElement>) => void;
  options?: FilterOption[];
  children?: React.ReactNode;
  className?: string;
  wrapperClassName?: string;
  style?: React.CSSProperties;
  wrapperStyle?: React.CSSProperties;
  disabled?: boolean;
  ariaLabel?: string;
  id?: string;
  widthClass?: 'filter-select-xs' | 'filter-select-sm' | 'filter-select-md' | 'filter-select-lg' | 'filter-select-xl';
}

export const FilterSelect: React.FC<FilterSelectProps> = ({
  label,
  value,
  onChange,
  options,
  children,
  className = '',
  wrapperClassName = '',
  style,
  wrapperStyle,
  disabled = false,
  ariaLabel,
  id,
  widthClass,
}) => {
  const selectElement = (
    <select
      id={id}
      className={`form-select filter-select ${widthClass || ''} ${className}`.trim()}
      value={value}
      onChange={e => onChange(e.target.value, e)}
      disabled={disabled}
      aria-label={ariaLabel || label}
      style={style}
    >
      {options
        ? options.map(opt => (
            <option key={String(opt.value)} value={opt.value}>
              {opt.label}
            </option>
          ))
        : children}
    </select>
  );

  if (label) {
    return (
      <div
        className={`filter-item ${wrapperClassName}`.trim()}
        style={wrapperStyle}
      >
        <label htmlFor={id} className="filter-label">
          {label}
        </label>
        {selectElement}
      </div>
    );
  }

  return selectElement;
};
