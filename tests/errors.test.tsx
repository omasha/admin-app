import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";
import { ErrorBoundary } from "../src/components/ErrorBoundary";
import { theme } from "../src/theme";
import { renderAt } from "./render";

let shouldCrash = true;
function Crashy() {
  if (shouldCrash) throw new Error("kaboom");
  return <p>All fine</p>;
}

function renderBoundary(resetKey?: unknown) {
  return (
    <MantineProvider theme={theme}>
      <ErrorBoundary resetKey={resetKey}><Crashy /></ErrorBoundary>
    </MantineProvider>
  );
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    shouldCrash = true;
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("shows the error screen instead of a blank page, with a way home", () => {
    render(renderBoundary());
    expect(screen.getByRole("heading", { name: "Something went wrong" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "home" })).toHaveAttribute("href", "/");
  });

  it("Try again re-renders the page", async () => {
    render(renderBoundary());
    shouldCrash = false;
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.getByText("All fine")).toBeInTheDocument();
  });

  it("clears when the page changes", () => {
    const { rerender } = render(renderBoundary("/a"));
    shouldCrash = false;
    rerender(renderBoundary("/b"));
    expect(screen.getByText("All fine")).toBeInTheDocument();
  });
});

describe("unknown pages", () => {
  it("says 'Page not found' (not 'No access') inside the layout", async () => {
    renderAt("/no/such/page");
    expect(await screen.findByRole("heading", { name: "Page not found" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "No access" })).not.toBeInTheDocument();
  });
});
