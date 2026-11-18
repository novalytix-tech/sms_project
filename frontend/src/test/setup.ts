import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

// Automatically cleanup DOM after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
(globalThis as any).ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock scrollTo
window.scrollTo = vi.fn();

// ---------------------------------------------------------------------------
// Clerk + backend profile test doubles.
// Tests call signInAs('teacher') / signOutTest() to control the auth state.
// ---------------------------------------------------------------------------
type TestRole = 'super_admin' | 'school_admin' | 'teacher' | 'parent' | 'student' | 'supplier';
const authState: { signedIn: boolean; roles: TestRole[] } = { signedIn: false, roles: [] };

export function signInAs(role: TestRole) {
  authState.signedIn = true;
  authState.roles = [role];
}
export function signOutTest() {
  authState.signedIn = false;
  authState.roles = [];
}

vi.mock('@clerk/react', () => ({
  useAuth: () => ({
    isLoaded: true,
    isSignedIn: authState.signedIn,
    getToken: async () => (authState.signedIn ? 'test-token' : null),
  }),
  useClerk: () => ({ signOut: vi.fn(async () => signOutTest()) }),
  SignIn: () => null,
  ClerkProvider: ({ children }: { children: unknown }) => children,
}));

globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
  const url = String(input);
  if (url.endsWith('/auth/me') && authState.signedIn) {
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: 'u-test',
          email: 'test@example.test',
          full_name: 'Test User',
          roles: authState.roles,
          institution_id: 'inst-test',
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }
  return new Response(JSON.stringify({ success: false, data: null }), { status: 401 });
}) as typeof fetch;

beforeEach(() => signInAs('school_admin'));
