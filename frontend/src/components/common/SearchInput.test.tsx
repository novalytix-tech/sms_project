import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SearchInput } from './SearchInput';

describe('SearchInput Component', () => {
  it('renders input with default placeholder', () => {
    render(<SearchInput value="" onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('calls onChange when user types', () => {
    const onChange = vi.fn();
    render(<SearchInput value="" onChange={onChange} />);

    const input = screen.getByPlaceholderText('Search...');
    fireEvent.change(input, { target: { value: 'Aarav' } });

    expect(onChange).toHaveBeenCalledWith('Aarav', expect.anything());
  });

  it('renders clear button when value is present and clears on click', () => {
    const onChange = vi.fn();
    const onClear = vi.fn();

    render(<SearchInput value="Sharma" onChange={onChange} onClear={onClear} />);

    const clearBtn = screen.getByRole('button', { name: 'Clear search text' });
    expect(clearBtn).toBeInTheDocument();

    fireEvent.click(clearBtn);
    expect(onChange).toHaveBeenCalledWith('', undefined);
    expect(onClear).toHaveBeenCalled();
  });

  it('respects disabled prop', () => {
    render(<SearchInput value="" onChange={vi.fn()} disabled={true} />);
    const input = screen.getByPlaceholderText('Search...');
    expect(input).toBeDisabled();
  });
});
