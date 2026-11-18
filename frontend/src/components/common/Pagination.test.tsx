import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Pagination } from './Pagination';

describe('Pagination Component', () => {
  it('renders record counts accurately', () => {
    render(
      <Pagination
        currentPage={1}
        pageSize={10}
        totalRecords={45}
        onPageChange={vi.fn()}
      />
    );
    expect(screen.getByText(/Showing/i)).toHaveTextContent('Showing 1 to 10 of 45 records');
  });

  it('triggers onPageChange when a page number button is clicked', () => {
    const onPageChange = vi.fn();
    render(
      <Pagination
        currentPage={1}
        pageSize={10}
        totalRecords={50}
        onPageChange={onPageChange}
      />
    );

    const page2Btn = screen.getByRole('button', { name: '2' });
    fireEvent.click(page2Btn);
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('disables previous and first buttons when on the first page', () => {
    render(
      <Pagination
        currentPage={1}
        pageSize={10}
        totalRecords={50}
        onPageChange={vi.fn()}
      />
    );

    const prevBtn = screen.getByRole('button', { name: 'Previous page' });
    const firstBtn = screen.getByRole('button', { name: 'First page' });
    expect(prevBtn).toBeDisabled();
    expect(firstBtn).toBeDisabled();
  });

  it('disables next and last buttons when on the last page', () => {
    render(
      <Pagination
        currentPage={5}
        pageSize={10}
        totalRecords={50}
        onPageChange={vi.fn()}
      />
    );

    const nextBtn = screen.getByRole('button', { name: 'Next page' });
    const lastBtn = screen.getByRole('button', { name: 'Last page' });
    expect(nextBtn).toBeDisabled();
    expect(lastBtn).toBeDisabled();
  });

  it('supports changing page size dropdown', () => {
    const onPageSizeChange = vi.fn();
    const onPageChange = vi.fn();

    render(
      <Pagination
        currentPage={2}
        pageSize={10}
        totalRecords={100}
        pageSizeOptions={[10, 25, 50]}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    );

    const select = screen.getByRole('combobox', { name: 'Rows per page' });
    fireEvent.change(select, { target: { value: '25' } });

    expect(onPageSizeChange).toHaveBeenCalledWith(25);
    expect(onPageChange).toHaveBeenCalledWith(1); // Resets to page 1
  });
});
