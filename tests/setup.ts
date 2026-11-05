import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { server } from "./server";

import { resetFakeOkta } from "./fakeOkta";

// Okta is faked (tests/fakeOkta.ts): always logged in, with a fixed token.
vi.mock("../src/auth/okta", async () => {
  const { fakeOkta } = await import("./fakeOkta");
  return { getOktaAuth: () => fakeOkta, getAccessToken: () => "test-token" };
});

// Mantine needs these browser features, which jsdom doesn't have.
window.matchMedia ??= ((query: string) => ({
  matches: false, media: query, onchange: null, addListener: () => {}, removeListener: () => {},
  addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia;
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
Element.prototype.scrollIntoView ??= () => {};

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => { server.resetHandlers(); cleanup(); resetFakeOkta(); });
afterAll(() => server.close());
