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
import { http, HttpResponse } from "msw";
import { API, server } from "./server";

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

  it("logging out asks Okta to come back to the registered address", async () => {
    renderAt("/content-blocks");
    await userEvent.setup().click(await screen.findByRole("button", { name: "Log out" }));
    await waitFor(() => expect(fakeOkta.signOut).toHaveBeenCalledWith(
      { postLogoutRedirectUri: window.location.origin, clearTokensBeforeRedirect: true }));
  });

  it("logs out even when Okta's token cancel request can't be sent", async () => {
    fakeOkta.signOut.mockRejectedValueOnce(Object.assign(new Error("Failed to fetch"), { name: "AuthApiError" }));
    renderAt("/content-blocks");
    await userEvent.setup().click(await screen.findByRole("button", { name: "Log out" }));
    await waitFor(() => expect(fakeOkta.signOut).toHaveBeenCalledTimes(2));
    expect(fakeOkta.signOut).toHaveBeenLastCalledWith({ postLogoutRedirectUri: window.location.origin,
      clearTokensBeforeRedirect: true, revokeAccessToken: false, revokeRefreshToken: false });
    expect(screen.queryByText("Failed to fetch")).not.toBeInTheDocument();
  });

  it("a saved login the API refuses is forgotten, and the login page shown", async () => {
    server.use(http.get(`${API}/v1/me`, () => HttpResponse.json(
      { type: "about:blank", title: "Unauthorized", status: 401, code: "invalid_token", detail: "Please log in again." },
      { status: 401, headers: { "Content-Type": "application/problem+json" } })));
    fakeOkta.tokenManager.clear.mockImplementation(() => {
      fakeOkta.isAuthenticated.mockImplementation(async () => false);
    });
    renderAt("/content-blocks");
    expect(await screen.findByRole("button", { name: "Log in with Okta" })).toBeInTheDocument();
    expect(fakeOkta.tokenManager.clear).toHaveBeenCalled();
    expect(screen.queryByRole("heading", { name: "No access" })).not.toBeInTheDocument();
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
