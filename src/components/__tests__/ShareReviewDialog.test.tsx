import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ShareReviewDialog from '../starr/ShareReviewDialog';
import { getDefaultState, setStorageUserAlias, getPendingReviewKey } from '../../store/storage';

vi.mock('../../utils/reviewApi', () => ({
  createReviewSession: vi.fn(),
  revokeReviewSession: vi.fn(),
}));
import { createReviewSession, revokeReviewSession } from '../../utils/reviewApi';
const createMock = createReviewSession as unknown as ReturnType<typeof vi.fn>;
const revokeMock = revokeReviewSession as unknown as ReturnType<typeof vi.fn>;

function makeState() {
  const s = getDefaultState();
  s.profile.name = 'Alice';
  s.profile.manager = 'Bob@amazon.com';
  s.profile.targetLevel = 'L5';
  s.star = [{ id: 'e1', title: 'T', situation: 's', task: 't', action: 'a', results: 'r', principles: [], date: '2026-01-01', quarter: 'Q1', impactLevel: 'High', evidenceLinks: [] }];
  return s;
}

describe('ShareReviewDialog', () => {
  beforeEach(() => {
    localStorage.clear();
    setStorageUserAlias('alice');
    createMock.mockReset();
    revokeMock.mockReset();
  });

  test('pre-fills the manager alias and creates a restricted link', async () => {
    const user = userEvent.setup();
    createMock.mockResolvedValue({ sessionId: 'sid-1', reviewUrl: 'http://app/review/sid-1' });
    const onChanged = vi.fn();
    render(<ShareReviewDialog open onClose={() => {}} state={makeState()} onNotify={() => {}} onChanged={onChanged} />);

    expect(screen.getByText('bob@')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Create link' }));

    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
    expect(createMock.mock.calls[0][0].reviewerAliases).toEqual(['bob']);
    expect(await screen.findByText(/Review link created/)).toBeInTheDocument();
    expect(localStorage.getItem(getPendingReviewKey())).toBe('sid-1');
    expect(onChanged).toHaveBeenCalled();
  });

  test('refuses to create a restricted link with no reviewers', async () => {
    const user = userEvent.setup();
    const state = makeState();
    state.profile.manager = '';
    render(<ShareReviewDialog open onClose={() => {}} state={state} onNotify={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Create link' }));
    expect(await screen.findByText(/Add at least one reviewer alias/)).toBeInTheDocument();
    expect(createMock).not.toHaveBeenCalled();
  });

  test('unrestricted mode warns and sends an empty allowlist', async () => {
    const user = userEvent.setup();
    createMock.mockResolvedValue({ sessionId: 'sid-2', reviewUrl: 'http://app/review/sid-2' });
    render(<ShareReviewDialog open onClose={() => {}} state={makeState()} onNotify={() => {}} />);
    await user.click(screen.getByRole('switch'));
    expect(screen.getByText(/Anyone at Amazon/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Create link' }));
    await waitFor(() => expect(createMock).toHaveBeenCalled());
    expect(createMock.mock.calls[0][0].reviewerAliases).toEqual([]);
  });

  test('opens on the result step when a link exists and can revoke it', async () => {
    const user = userEvent.setup();
    localStorage.setItem(getPendingReviewKey(), 'existing-sid');
    revokeMock.mockResolvedValue(true);
    const onClose = vi.fn();
    const onNotify = vi.fn();
    render(<ShareReviewDialog open onClose={onClose} state={makeState()} onNotify={onNotify} />);

    expect(screen.getByText(/A review link is active/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Revoke link' }));
    await waitFor(() => expect(revokeMock).toHaveBeenCalledWith('existing-sid'));
    expect(localStorage.getItem(getPendingReviewKey())).toBeNull();
    expect(onNotify).toHaveBeenCalledWith(expect.stringMatching(/revoked/i));
    expect(onClose).toHaveBeenCalled();
  });
});
