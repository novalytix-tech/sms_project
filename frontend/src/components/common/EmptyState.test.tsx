import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { EmptyState } from './EmptyState';

describe('EmptyState Component', () => {
  it('renders default title and description', () => {
    render(<EmptyState />);
    expect(screen.getByText('No records found')).toBeInTheDocument();
    expect(
      screen.getByText('There are no items matching your criteria. Try adjusting your search or filters.')
    ).toBeInTheDocument();
  });

  it('renders custom title and description', () => {
    render(
      <EmptyState
        title="No Students Enrolled"
        description="Please add a student to begin class registration."
      />
    );
    expect(screen.getByText('No Students Enrolled')).toBeInTheDocument();
    expect(screen.getByText('Please add a student to begin class registration.')).toBeInTheDocument();
  });

  it('renders action button when provided', () => {
    render(
      <EmptyState
        action={<button data-testid="add-btn">Add Record</button>}
      />
    );
    expect(screen.getByTestId('add-btn')).toBeInTheDocument();
  });
});

