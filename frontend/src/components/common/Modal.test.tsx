import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Modal } from './Modal';

describe('Modal Component', () => {
  it('does not render when isOpen is false', () => {
    const { container } = render(
      <Modal isOpen={false} onClose={vi.fn()} title="Test Modal">
        <p>Modal Body Content</p>
      </Modal>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders title, content and footer when isOpen is true', () => {
    render(
      <Modal
        isOpen={true}
        onClose={vi.fn()}
        title="Student Details"
        footer={<button data-testid="save-btn">Save</button>}
      >
        <p>Modal Body Content</p>
      </Modal>
    );

    expect(screen.getByText('Student Details')).toBeInTheDocument();
    expect(screen.getByText('Modal Body Content')).toBeInTheDocument();
    expect(screen.getByTestId('save-btn')).toBeInTheDocument();
  });

  it('triggers onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="Test Modal">
        <p>Content</p>
      </Modal>
    );

    const closeBtn = screen.getByRole('button', { name: 'Close' });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it('triggers onClose when Escape key is pressed', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="Test Modal">
        <p>Content</p>
      </Modal>
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
