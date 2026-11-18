import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ToastContainer } from './ToastContainer';
import { ERPProvider, useERP } from '../../context/ERPContext';

const ToastTrigger: React.FC = () => {
  const { addToast } = useERP();
  return (
    <button
      onClick={() => addToast('success', 'Student Enrolled', 'Student was enrolled successfully.')}
      data-testid="trigger-toast"
    >
      Show Toast
    </button>
  );
};

describe('ToastContainer Component', () => {
  it('renders nothing when there are no active toasts', () => {
    const { container } = render(
      <ERPProvider>
        <ToastContainer />
      </ERPProvider>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders toast with title and message when triggered', () => {
    render(
      <ERPProvider>
        <ToastTrigger />
        <ToastContainer />
      </ERPProvider>
    );

    const btn = screen.getByTestId('trigger-toast');
    act(() => {
      fireEvent.click(btn);
    });

    expect(screen.getByText('Student Enrolled')).toBeInTheDocument();
    expect(screen.getByText('Student was enrolled successfully.')).toBeInTheDocument();
  });

  it('allows user to dismiss toast manually', () => {
    render(
      <ERPProvider>
        <ToastTrigger />
        <ToastContainer />
      </ERPProvider>
    );

    const btn = screen.getByTestId('trigger-toast');
    act(() => {
      fireEvent.click(btn);
    });

    const closeBtn = screen.getByRole('button', { name: 'Close notification' });
    act(() => {
      fireEvent.click(closeBtn);
    });

    expect(screen.queryByText('Student Enrolled')).not.toBeInTheDocument();
  });
});
