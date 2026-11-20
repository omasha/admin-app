import { describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { renderAt } from "./render";
import { API, server, staffMe } from "./server";

const SCOPE = "bp-api:profile.read";
const row = (over: Record<string, unknown> = {}) => ({
  id: 1, client_id: "0oaSALESFORCE", name: "Salesforce", scopes: [SCOPE], active: true,
  created_at: "2026-11-20T10:00:00", ...over,
});

describe("Systems with access", () => {
  it("lists the systems and offers to register one", async () => {
    server.use(http.get(`${API}/v1/admin/service-clients`, () => HttpResponse.json(
      { items: [row(), row({ id: 2, client_id: "0oaOLD", name: "Old thing", active: false })], total: 2 })));
    renderAt("/service-clients");
    expect(await screen.findByRole("heading", { name: "Systems with access" })).toBeInTheDocument();
    expect(await screen.findByText("Salesforce")).toBeInTheDocument();
    expect(screen.getByText("0oaOLD")).toBeInTheDocument();
    expect(screen.getAllByText("Look people up")).toHaveLength(2);
    expect(within(screen.getByRole("row", { name: /Salesforce/ })).getByText("On")).toBeInTheDocument();
    expect(within(screen.getByRole("row", { name: /Old thing/ })).getByText("Off")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Register a system" })).toBeInTheDocument();
  });

  it("registers a system with the client ID, name and scope", async () => {
    let sent: unknown = null;
    server.use(http.post(`${API}/v1/admin/service-clients`, async ({ request }) => {
      sent = await request.json();
      return HttpResponse.json(row({ id: 5, client_id: "0oaNEW", name: "New system" }), { status: 201 });
    }), http.get(`${API}/v1/admin/service-clients/5`, () => HttpResponse.json(row({ id: 5, client_id: "0oaNEW", name: "New system" }))));
    renderAt("/service-clients/create");
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/Okta client ID/), "0oaNEW");
    await user.type(screen.getByLabelText(/^Name/), "New system");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(sent).toEqual({ client_id: "0oaNEW", name: "New system", scopes: [SCOPE], active: true }));
  });

  it("shows the API's reason when the client ID is already registered", async () => {
    server.use(http.post(`${API}/v1/admin/service-clients`, () => HttpResponse.json(
      { type: "about:blank", title: "Conflict", status: 409, code: "client_id_taken",
        detail: "That client ID is already registered.", errors: [{ field: "client_id", message: "Already registered" }] },
      { status: 409, headers: { "Content-Type": "application/problem+json" } })));
    renderAt("/service-clients/create");
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/Okta client ID/), "0oaSALESFORCE");
    await user.type(screen.getByLabelText(/^Name/), "Again");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText(/already registered/i)).toBeInTheDocument();
  });

  it("an edit can't change the client ID and sends only what can change", async () => {
    let sent: Record<string, unknown> | null = null;
    server.use(
      http.get(`${API}/v1/admin/service-clients/1`, () => HttpResponse.json(row())),
      http.put(`${API}/v1/admin/service-clients/1`, async ({ request }) => {
        sent = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(row({ active: false }));
      }),
    );
    renderAt("/service-clients/edit/1");
    const id = await screen.findByLabelText(/Okta client ID/);
    await waitFor(() => expect(id).toHaveValue("0oaSALESFORCE"));
    expect(id).toBeDisabled();
    const user = userEvent.setup();
    await user.click(screen.getByRole("switch", { name: /^On/ }));
    expect(await screen.findByText(/Cut off: every request/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(sent).toEqual({ name: "Salesforce", scopes: [SCOPE], active: false }));
  });

  it("is for staff admins only", async () => {
    server.use(http.get(`${API}/v1/me`, () => HttpResponse.json({ ...staffMe, permissions: ["fuser"] })));
    renderAt("/service-clients");
    expect(await screen.findByRole("heading", { name: "No access" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Systems with access" })).not.toBeInTheDocument();
  });
});


describe("Try a lookup", () => {
  const person = {
    bpguid: "AAAAAAAA-0000-0000-0000-000000000001", username: "dusty", email: "dusty@example.org", first_name: "Dusty",
    last_name: "Rhodes", status: "active", created_at: "2016-03-17T10:00:00",
    profile: {
      playa_name: "Dusty", url: null, addr1: "1 Playa Way", addr2: "Unit 5", city: "Gerlach", state: "NV", zip: "89412",
      country: "US", phone: "555-0100", descr: null, work: null, org: null, title: null, years: [2023, 2019],
      affiliations: ["Theme Camp"], completed: true, updated_at: "2026-11-20T10:00:00",
    },
  };
  const asked: URL[] = [];
  const answer = (over: Record<string, unknown> = {}) =>
    server.use(
      http.get(`${API}/v1/admin/service-clients/1`, () => HttpResponse.json(row())),
      http.get(`${API}/v1/admin/service-clients/1/lookup`, ({ request }) => {
        asked.push(new URL(request.url));
        return HttpResponse.json({ access: "allowed", result: person, ...over });
      }),
    );

  it("shows the address fields for an email, and sends it as an email", async () => {
    asked.length = 0;
    answer();
    renderAt("/service-clients/edit/1");
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText("Email or bpguid"), "dusty@example.org");
    await user.click(screen.getByRole("button", { name: "Look up" }));
    expect(await screen.findByRole("heading", { name: "Address" })).toBeInTheDocument();
    for (const text of ["1 Playa Way", "Unit 5", "Gerlach", "NV", "89412", "US"]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
    expect(screen.getByText("AAAAAAAA-0000-0000-0000-000000000001")).toBeInTheDocument();
    expect(asked[0].searchParams.get("email")).toBe("dusty@example.org");
    expect(asked[0].searchParams.has("bpguid")).toBe(false);
  });

  it("sends something without an @ as a bpguid", async () => {
    asked.length = 0;
    answer();
    renderAt("/service-clients/edit/1");
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText("Email or bpguid"), "AAAAAAAA-0000-0000-0000-000000000001");
    await user.click(screen.getByRole("button", { name: "Look up" }));
    await screen.findByRole("heading", { name: "Address" });
    expect(asked[0].searchParams.get("bpguid")).toBe("AAAAAAAA-0000-0000-0000-000000000001");
    expect(asked[0].searchParams.has("email")).toBe(false);
  });

  it("says so when the person has no profile, and shows the raw answer on request", async () => {
    answer({ result: { ...person, profile: null } });
    renderAt("/service-clients/edit/1");
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText("Email or bpguid"), "dusty@example.org");
    await user.click(screen.getByRole("button", { name: "Look up" }));
    expect(await screen.findByText(/hasn't filled in a profile/)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Address" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /the answer exactly as the system gets it/ }));
    expect(await screen.findByText(/"profile": null/)).toBeInTheDocument();
  });

  it("warns when the system would be refused", async () => {
    answer({ access: "switched_off" });
    renderAt("/service-clients/edit/1");
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText("Email or bpguid"), "dusty@example.org");
    await user.click(screen.getByRole("button", { name: "Look up" }));
    expect(await screen.findByText(/switched off, so a real request/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Address" })).toBeInTheDocument();
  });

  it("shows the API's reason when no one matches", async () => {
    server.use(
      http.get(`${API}/v1/admin/service-clients/1`, () => HttpResponse.json(row())),
      http.get(`${API}/v1/admin/service-clients/1/lookup`, () => HttpResponse.json(
        { type: "about:blank", title: "Not Found", status: 404, code: "not_found", detail: "No one matches." },
        { status: 404, headers: { "Content-Type": "application/problem+json" } })),
    );
    renderAt("/service-clients/edit/1");
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText("Email or bpguid"), "nobody@example.org");
    await user.click(screen.getByRole("button", { name: "Look up" }));
    expect(await screen.findByText("No one matches.")).toBeInTheDocument();
  });

  it("isn't on the register page (nothing to try yet)", async () => {
    renderAt("/service-clients/create");
    await screen.findByRole("heading", { name: "Register a system" });
    expect(screen.queryByLabelText("Email or bpguid")).not.toBeInTheDocument();
  });
});
