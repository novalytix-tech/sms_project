import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PersonaSwitcher } from './PersonaSwitcher';
import { ERPProvider } from '../../context/ERPContext';

describe('PersonaSwitcher Layout Component', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    sessionStorage.setItem('erp_authenticated', 'true');
  });

  it('renders active persona and opens popover on click', () => {
    render(
      <ERPProvider>
        <PersonaSwitcher />
      </ERPProvider>
    );

    // Initial role is school_admin -> 'School Admin'
    expect(screen.getByText('School Admin')).toBeInTheDocument();

    const trigger = screen.getByTitle('Switch Demo Role Persona');
    expect(trigger).toBeInTheDocument();

    // Click trigger to open menu
    fireEvent.click(trigger);

    expect(screen.getByText('DEMO ROLE PERSONAS')).toBeInTheDocument();
    expect(screen.getByText('Teacher')).toBeInTheDocument();
    expect(screen.getByText('Parent')).toBeInTheDocument();
    expect(screen.getByText('Student')).toBeInTheDocument();
  });

  it('switches persona when role option is selected', () => {
    render(
      <ERPProvider>
        <PersonaSwitcher />
      </ERPProvider>
    );

    const trigger = screen.getByTitle('Switch Demo Role Persona');
    fireEvent.click(trigger);

    // Find and click the 'Teacher' option button
    const teacherBtn = screen.getByRole('option', { name: /teacher/i });
    fireEvent.click(teacherBtn);

    // Menu should close and active role should now be Teacher
    expect(screen.queryByText('DEMO ROLE PERSONAS')).not.toBeInTheDocument();
    expect(screen.getByText('Teacher')).toBeInTheDocument();
  });

  it('renders collapsed mode icon button when collapsed=true', () => {
    render(
      <ERPProvider>
        <PersonaSwitcher collapsed={true} />
      </ERPProvider>
    );

    // In collapsed mode, text is not visible, button title contains Active Persona
    const collapsedBtn = screen.getByRole('button', { name: /active persona/i });
    expect(collapsedBtn).toBeInTheDocument();
  });
});
