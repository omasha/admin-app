import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";
import { MemoryRouter } from "react-router";
import { safeReturnPath } from "../src/auth/providers";
import { LoginCallback } from "../src/pages/auth";
import { theme } from "../src/theme";
import { renderAt } from "./render";
import { fakeOkta } from "./fakeOkta";

describe("logging in", () => {
  it("never returns to the login pages or another site", () => {
    expect(safeReturnPath("/content-blocks?page=2")).toBe("/content-blocks?page=2");
    for (const bad of [null, undefined, "", "/login", "/login/callback", "//evil.example", "https://evil.example"]) {
      expect(safeReturnPath(bad)).toBe("/");
    }
  });

  it("asks Okta to come back to the page in ?to=, not to /login", async () => {
    fakeOkta.isAuthenticated.mockImplementation(async () => false);
    renderAt("/login?to=%2Fwidgets");
    await userEvent.setup().click(await screen.findByRole("button", { name: "Log in with Okta" }));
    await waitFor(() => expect(fakeOkta.signInWithRedirect).toHaveBeenCalledWith({ originalUri: "/widgets" }));
  });

  it("sends someone already logged in straight on from /login", async () => {
    renderAt("/login?to=%2Fcontent-blocks");
    expect(await screen.findByRole("heading", { name: "Content blocks" })).toBeInTheDocument();
  });

  it("uses Okta's one-time code once, even when React runs the page twice", async () => {
    render(
      <React.StrictMode>
        <MantineProvider theme={theme}><MemoryRouter><LoginCallback /></MemoryRouter></MantineProvider>
      </React.StrictMode>,
    );
    await waitFor(() => expect(fakeOkta.handleLoginRedirect).toHaveBeenCalledTimes(1));
  });

  it("keeps a real login error on screen", async () => {
    fakeOkta.handleLoginRedirect.mockRejectedValueOnce(new Error("The redirect URI isn't allowed"));
    render(<MantineProvider theme={theme}><MemoryRouter><LoginCallback /></MemoryRouter></MantineProvider>);
    expect(await screen.findByText("The redirect URI isn't allowed")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Try again" })).toBeInTheDocument();
  });
});
