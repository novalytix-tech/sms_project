import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BulkInviteModal } from './BulkInviteModal';
import { accountService } from '../../services/accountService';

const CSV = [
  'first_name,last_name,email,role,phone,admission_number,child_admission_numbers,relationship',
  'Anita,Verma,anita@example.com,Teacher,,,,',
  'Rakesh,Gupta,rakesh@example.com,parent,+91 1,,"ADM-1;ADM-2",Father',
  '',
].join('\n');

describe('BulkInviteModal', () => {
  afterEach(() => vi.restoreAllMocks());

  it('parses the CSV, sends rows, and shows per-row results', async () => {
    const bulk = vi.spyOn(accountService, 'bulkInvite').mockResolvedValue({
      success: true,
      data: {
        created: 1,
        skipped: 1,
        invitations_failed: 0,
        results: [
          { row: 2, email: 'anita@example.com', name: 'Anita Verma', role: 'teacher', status: 'created', reason: null, invitation_status: 'invited' },
          { row: 3, email: 'rakesh@example.com', name: 'Rakesh Gupta', role: 'parent', status: 'skipped', reason: "No student with admission number 'ADM-2'" },
        ],
      },
    });
    const onDone = vi.fn();
    const { container } = render(<BulkInviteModal isOpen onClose={() => {}} onDone={onDone} />);

    const input = container.querySelector('input[type=file]') as HTMLInputElement;
    const file = new File([CSV], 'people.csv', { type: 'text/csv' });
    Object.defineProperty(file, 'text', { value: () => Promise.resolve(CSV) });
    fireEvent.change(input, { target: { files: [file] } });

    await screen.findByText(/people ready to invite/);
    fireEvent.click(screen.getByRole('button', { name: /Create 2 accounts/ }));

    await waitFor(() => expect(bulk).toHaveBeenCalledTimes(1));
    const rows = bulk.mock.calls[0][0];
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ first_name: 'Anita', email: 'anita@example.com', role: 'teacher' });
    expect(rows[1]).toMatchObject({ role: 'parent', child_admission_numbers: 'ADM-1;ADM-2', relationship: 'Father' });

    expect(await screen.findByText('Invited')).toBeInTheDocument();
    expect(screen.getByText(/No student with admission number/)).toBeInTheDocument();
    expect(onDone).toHaveBeenCalled();
  });

  it('refuses files with more than 500 people', async () => {
    const big = ['first_name,last_name,email,role', ...Array.from({ length: 501 }, (_, i) => `A,B,a${i}@x.test,teacher`)].join('\n');
    const { container } = render(<BulkInviteModal isOpen onClose={() => {}} onDone={() => {}} />);
    const file = new File([big], 'big.csv', { type: 'text/csv' });
    Object.defineProperty(file, 'text', { value: () => Promise.resolve(big) });
    fireEvent.change(container.querySelector('input[type=file]') as HTMLInputElement, { target: { files: [file] } });
    expect(await screen.findByText(/split it into files/)).toBeInTheDocument();
  });
});
