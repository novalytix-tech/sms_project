import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog Component', () => {
  it('renders confirmation message and title', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Delete Record"
        message="Are you sure you want to delete this student?"
      />
    );

    expect(screen.getByText('Delete Record')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete this student?')).toBeInTheDocument();
  });

  it('triggers onConfirm and onClose when confirm button is clicked', () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    render(
      <ConfirmDialog
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
        title="Confirm Action"
        message="Proceed?"
        confirmLabel="Yes, Proceed"
      />
    );

    const confirmBtn = screen.getByText('Yes, Proceed');
    fireEvent.click(confirmBtn);

    expect(onConfirm).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('applies btn-danger styling when isDestructive is true', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Danger Action"
        message="Destructive step"
        isDestructive={true}
      />
    );

    const confirmBtn = screen.getByRole('button', { name: 'Confirm' });
    expect(confirmBtn).toHaveClass('btn-danger');
  });
});

