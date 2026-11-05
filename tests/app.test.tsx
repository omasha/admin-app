import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { renderAt } from "./render";
import { API, block, requests, server, staffMe } from "./server";

describe("the admin app", () => {
  it("shows staff the content-block list, through the generated client with the login token", async () => {
    let auth: string | null = null;
    server.use(http.get(`${API}/v1/admin/content-blocks`, ({ request }) => {
      auth = request.headers.get("Authorization");
      requests.push(new URL(request.url));
      return HttpResponse.json({ items: [block(1, "Welcome")], total: 1 });
    }));
    renderAt("/");
    expect(await screen.findByText("Welcome")).toBeInTheDocument();
    expect(auth).toBe("Bearer test-token");
    const last = requests.at(-1)!;
    expect(last.searchParams.get("page")).toBe("1");
    expect(last.searchParams.get("per_page")).toBe("25");
    expect(screen.getByRole("link", { name: "Embedded forms" })).toBeInTheDocument();
  });

  it("shows someone without staff_admin 'No access' and no menu", async () => {
    server.use(http.get(`${API}/v1/me`, () => HttpResponse.json({ ...staffMe, permissions: [] })));
    renderAt("/content-blocks");
    expect(await screen.findByRole("heading", { name: "No access" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Content blocks" })).not.toBeInTheDocument();
  });

  it("shows the API's field error under the field", async () => {
    server.use(http.post(`${API}/v1/admin/content-blocks`, () => HttpResponse.json(
      { type: "about:blank", title: "Unprocessable Content", status: 422, code: "invalid_request",
        detail: "Some values are missing or not valid.",
        errors: [{ field: "placement", message: "Pick where the block goes" }] },
      { status: 422, headers: { "Content-Type": "application/problem+json" } },
    )));
    renderAt("/content-blocks/create");
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText("Title"), "New block");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(screen.getByText("Pick where the block goes")).toBeInTheDocument());
  });
});
