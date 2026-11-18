import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FilterSelect } from './FilterSelect';

describe('FilterSelect Component', () => {
  const options = [
    { label: 'All Classes', value: 'all' },
    { label: 'Class 10A', value: 'cls-10a' },
    { label: 'Class 9B', value: 'cls-9b' },
  ];

  it('renders select dropdown with options', () => {
    render(<FilterSelect label="Class Filter" value="all" options={options} onChange={vi.fn()} />);
    const select = screen.getByRole('combobox', { name: 'Class Filter' });
    expect(select).toBeInTheDocument();
    expect(screen.getByText('All Classes')).toBeInTheDocument();
    expect(screen.getByText('Class 10A')).toBeInTheDocument();
  });

  it('triggers onChange with selected option value', () => {
    const onChange = vi.fn();
    render(<FilterSelect label="Class Filter" value="all" options={options} onChange={onChange} />);

    const select = screen.getByRole('combobox', { name: 'Class Filter' });
    fireEvent.change(select, { target: { value: 'cls-10a' } });

    expect(onChange).toHaveBeenCalledWith('cls-10a', expect.anything());
  });

  it('handles disabled state properly', () => {
    render(<FilterSelect label="Disabled Select" value="all" options={options} onChange={vi.fn()} disabled={true} />);
    const select = screen.getByRole('combobox', { name: 'Disabled Select' });
    expect(select).toBeDisabled();
  });
});

