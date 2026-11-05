import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { renderAt } from "./render";
import { API, person, requests, server, staffMe } from "./server";

// What /v1/me says for each kind of person (the API adds the included permissions).
const as = (...permissions: string[]) =>
  server.use(http.get(`${API}/v1/me`, () => HttpResponse.json({ ...staffMe, permissions })));

describe("People and permissions", () => {
  it("a fuser lands on People, a search form, and sees only People in the menu", async () => {
    as("fuser");
    renderAt("/");
    expect(await screen.findByRole("heading", { name: "People" })).toBeInTheDocument();
    expect(screen.getByLabelText("Last name")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "People" })).toBeInTheDocument();
    for (const hidden of ["Content blocks", "Widgets", "Embedded forms", "Permissions"]) {
      expect(screen.queryByRole("link", { name: hidden })).not.toBeInTheDocument();
    }
  });

  it("lists nobody until something is searched for", async () => {
    as("fuser");
    renderAt("/users");
    await screen.findByLabelText("Last name");
    await new Promise((r) => setTimeout(r, 50));
    expect(requests.some((u) => u.pathname === "/v1/admin/users")).toBe(false);
    expect(screen.queryByText("dusty@example.org")).not.toBeInTheDocument();
  });

  it("searches with only the fields filled in, and shows the results", async () => {
    as("fuser");
    renderAt("/users");
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText("First name"), " Dus ");
    await user.type(screen.getByLabelText("Last name"), "Tes");
    await user.click(screen.getByRole("button", { name: "Search" }));
    expect(await screen.findByText("dusty@example.org")).toBeInTheDocument();
    const sent = requests.filter((u) => u.pathname === "/v1/admin/users").at(-1)!;
    expect(Object.fromEntries(sent.searchParams)).toEqual({ first_name: "Dus", last_name: "Tes", limit: "25" });
  });

  it("won't search on one letter", async () => {
    as("fuser");
    renderAt("/users");
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText("Email"), "d");
    await user.click(screen.getByRole("button", { name: "Search" }));
    expect(await screen.findByText(/Fill in at least one field/)).toBeInTheDocument();
  });

  it("says when there are more than shown", async () => {
    as("fuser");
    server.use(http.get(`${API}/v1/admin/users`, () =>
      HttpResponse.json({ items: [person(7, "Dusty", "dusty@example.org")], more: true })));
    renderAt("/users?last_name=Te");
    expect(await screen.findByText(/More people match than shown/)).toBeInTheDocument();
  });

  it("a fuser sees the account summary but not the profile, permissions or the change button", async () => {
    as("fuser");
    renderAt("/users/show/7");
    expect(await screen.findByText("00000000-0000-0000-0000-000000000007")).toBeInTheDocument();
    expect(screen.getByText("107")).toBeInTheDocument(); // WordPress ID
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Profile" })).not.toBeInTheDocument());
    expect(screen.queryByRole("heading", { name: "Permissions in this app" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Change username or email" })).not.toBeInTheDocument();
  });

  it("fuser_details also sees the whole profile", async () => {
    as("fuser", "fuser_details");
    renderAt("/users/show/7");
    expect(await screen.findByRole("heading", { name: "Profile" })).toBeInTheDocument();
    expect(await screen.findByText("555-0100")).toBeInTheDocument();
    expect(screen.getByText("2023, 2019")).toBeInTheDocument();
    // …and may change username, email and password, but not the profile itself
    expect(await screen.findByRole("link", { name: "Change username or email" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Edit profile/ })).not.toBeInTheDocument();
  });

  it("a fuser can't open content pages", async () => {
    as("fuser");
    renderAt("/content-blocks");
    expect(await screen.findByRole("heading", { name: "No access" })).toBeInTheDocument();
  });

  it("staff see the person's permissions and can give one", async () => {
    let sent: unknown = null;
    server.use(
      http.post(`${API}/v1/admin/grants`, async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json({ id: 9, permission: "fuser_details", user: person(7, "Dusty", "dusty@example.org"),
                                   granted_by: null, created_at: "2026-11-05T10:00:00" }, { status: 201 });
      }),
    );
    renderAt("/users/show/7");
    expect(await screen.findByRole("heading", { name: "Permissions in this app" })).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "Change username or email" })).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("link", { name: "Give a permission" }));
    expect(await screen.findByRole("heading", { name: "Give a permission" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("textbox", { name: "Person" })).toHaveValue("Dusty Tester (dusty@example.org)"));
    await user.click(screen.getByRole("radio", { name: /Find people \+ see profiles/ }));
    await user.click(screen.getByRole("button", { name: "Give permission" }));
    await waitFor(() => expect(sent).toEqual({ user_id: 7, permission: "fuser_details" }));
  });

  it("shows why a permission wasn't given", async () => {
    server.use(http.post(`${API}/v1/admin/grants`, () => HttpResponse.json(
      { type: "about:blank", title: "Conflict", status: 409, code: "already_granted",
        detail: "This person already has that permission." },
      { status: 409, headers: { "Content-Type": "application/problem+json" } })));
    renderAt("/grants/create?user_id=7");
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByRole("textbox", { name: "Person" })).toHaveValue("Dusty Tester (dusty@example.org)"));
    await user.click(screen.getByRole("button", { name: "Give permission" }));
    expect(await screen.findByText("This person already has that permission.")).toBeInTheDocument();
  });
});

describe("username, email and password", () => {
  it("a plain fuser can't change them", async () => {
    as("fuser");
    renderAt("/users/show/7");
    expect(await screen.findByText("00000000-0000-0000-0000-000000000007")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Set a new password" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Change username or email" })).not.toBeInTheDocument();
  });

  it("fuser_details sets a password, which goes to the API once", async () => {
    as("fuser", "fuser_details");
    let sent: unknown = null;
    server.use(http.put(`${API}/v1/admin/users/7/password`, async ({ request }) => {
      sent = await request.json();
      return new HttpResponse(null, { status: 204 });
    }));
    renderAt("/users/show/7");
    const user = userEvent.setup();
    await user.click(await screen.findByRole("link", { name: "Set a new password" }));
    await user.type(await screen.findByLabelText("New password"), "Sw0rdfish!x");
    await user.type(screen.getByLabelText("New password again"), "Sw0rdfish!x");
    await user.click(screen.getByRole("button", { name: "Set password" }));
    expect(await screen.findByText("Password changed")).toBeInTheDocument();
    expect(sent).toEqual({ password: "Sw0rdfish!x" });
  });

  it("the two entries must match before anything is sent", async () => {
    as("fuser", "fuser_details");
    renderAt("/users/password/7");
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText("New password"), "Sw0rdfish!x");
    await user.type(screen.getByLabelText("New password again"), "different");
    await user.click(screen.getByRole("button", { name: "Set password" }));
    expect(await screen.findByText("The two don't match")).toBeInTheDocument();
  });

  it("shows Okta's reason under the password", async () => {
    as("fuser", "fuser_details");
    server.use(http.put(`${API}/v1/admin/users/7/password`, () => HttpResponse.json(
      { type: "about:blank", title: "Unprocessable Content", status: 422, code: "okta_refused",
        detail: "Okta refused the change", errors: [{ field: "password", message: "Okta refused the change: At least 8 characters." }] },
      { status: 422, headers: { "Content-Type": "application/problem+json" } })));
    renderAt("/users/password/7");
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText("New password"), "short");
    await user.type(screen.getByLabelText("New password again"), "short");
    await user.click(screen.getByRole("button", { name: "Set password" }));
    expect(await screen.findByText("Okta refused the change: At least 8 characters.")).toBeInTheDocument();
  });
});
