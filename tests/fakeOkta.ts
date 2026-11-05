// The fake Okta every test uses (see setup.ts): logged in by default. Tests can inspect the calls.
import { vi } from "vitest";

export const fakeOkta = {
  isAuthenticated: vi.fn(async () => true),
  signInWithRedirect: vi.fn(async (_options?: { originalUri?: string }) => undefined),
  signOut: vi.fn(async () => undefined),
  handleLoginRedirect: vi.fn(async () => undefined),
};

export function resetFakeOkta(): void {
  vi.clearAllMocks();
  fakeOkta.isAuthenticated.mockImplementation(async () => true);
}
