import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Badge } from './Badge';

describe('Badge Component', () => {
  it('renders default text based on status', () => {
    render(<Badge status="active" />);
    expect(screen.getByText('active')).toBeInTheDocument();
  });

  it('renders custom label when provided', () => {
    render(<Badge status="active" label="Currently Enrolled" />);
    expect(screen.getByText('Currently Enrolled')).toBeInTheDocument();
  });

  it('applies badge-success class for positive statuses', () => {
    const { container } = render(<Badge status="present" />);
    const span = container.querySelector('span');
    expect(span).toHaveClass('badge', 'badge-success');
  });

  it('applies badge-warning class for intermediate statuses', () => {
    const { container } = render(<Badge status="pending" />);
    const span = container.querySelector('span');
    expect(span).toHaveClass('badge', 'badge-warning');
  });

  it('applies badge-danger class for negative statuses', () => {
    const { container } = render(<Badge status="overdue" />);
    const span = container.querySelector('span');
    expect(span).toHaveClass('badge', 'badge-danger');
  });

  it('applies badge-info class for neutral/informational statuses', () => {
    const { container } = render(<Badge status="unpaid" />);
    const span = container.querySelector('span');
    expect(span).toHaveClass('badge', 'badge-info');
  });

  it('replaces underscores with spaces in default label', () => {
    render(<Badge status="partially_delivered" />);
    expect(screen.getByText('partially delivered')).toBeInTheDocument();
  });
});

