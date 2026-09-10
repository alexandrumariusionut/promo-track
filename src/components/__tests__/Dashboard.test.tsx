import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ThemeModeProvider } from '../../store/ThemeContext';
import { AppProvider } from '../../store/AppContext';
import { getDefaultState, setStorageUserAlias } from '../../store/storage';
import DashboardPage from '../../pages/DashboardPage';
import { AppState } from '../../types';

vi.mock('../../utils/userDataApi', () => ({
  saveUserData: vi.fn(),
  loadUserData: vi.fn(),
  ConflictError: class ConflictError extends Error { constructor() { super('conflict'); this.name = 'ConflictError'; } },
}));
import { saveUserData } from '../../utils/userDataApi';
const saveMock = saveUserData as unknown as ReturnType<typeof vi.fn>;

function renderDashboard(state: AppState, userId: string | null = null) {
  return render(
    <ThemeModeProvider>
      <AppProvider initialState={state} initialVersion={1} userId={userId}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/star" element={<div>STAR PAGE</div>} />
            <Route path="/profile" element={<div>PROFILE PAGE</div>} />
            <Route path="/guidelines" element={<div>GUIDELINES PAGE</div>} />
          </Routes>
        </MemoryRouter>
      </AppProvider>
    </ThemeModeProvider>,
  );
}

describe('DashboardPage', () => {
  beforeEach(() => { localStorage.clear(); setStorageUserAlias('alice'); saveMock.mockReset(); });

  test('first run shows a single clear call to action', async () => {
    const user = userEvent.setup();
    renderDashboard(getDefaultState());
    expect(screen.getByText(/Build your promotion case in three steps/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Read the guidelines/ }));
    expect(screen.getByText('GUIDELINES PAGE')).toBeInTheDocument();
  });

  test('shows readiness score and routes the next step', async () => {
    const user = userEvent.setup();
    const state = getDefaultState();
    state.profile.name = 'Alice Example';
    state.profile.role = 'Support Engineer';
    renderDashboard(state);

    expect(screen.getByLabelText(/Readiness score \d+ out of 100/)).toBeInTheDocument();
    expect(screen.getByText(/Next step:/)).toBeInTheDocument();
    // First incomplete item is "Profile completed" (manager missing) → /profile
    await user.click(screen.getByRole('button', { name: 'Go' }));
    expect(screen.getByText('PROFILE PAGE')).toBeInTheDocument();
  });

  test('checklist items navigate to the page that completes them', async () => {
    const user = userEvent.setup();
    const state = getDefaultState();
    state.profile.role = 'SE';
    renderDashboard(state);
    await user.click(screen.getByRole('button', { name: /STAR entries added/ }));
    expect(screen.getByText('STAR PAGE')).toBeInTheDocument();
  });
});

describe('AppProvider cloud sync', () => {
  beforeEach(() => { localStorage.clear(); setStorageUserAlias('alice'); saveMock.mockReset(); });

  test('debounces saves and sends the current version as expectedVersion', async () => {
    saveMock.mockResolvedValue(2);
    const state = getDefaultState();
    state.profile.role = 'SE';
    render(
      <ThemeModeProvider>
        <AppProvider initialState={state} initialVersion={1} userId="alice">
          <div>child</div>
        </AppProvider>
      </ThemeModeProvider>,
    );
    expect(saveMock).not.toHaveBeenCalled(); // debounced, not immediate
    await waitFor(() => expect(saveMock).toHaveBeenCalledTimes(1), { timeout: 4000 });
    expect(saveMock.mock.calls[0][0]).toBe('alice');
    expect(saveMock.mock.calls[0][2]).toBe(1);
  });
});
