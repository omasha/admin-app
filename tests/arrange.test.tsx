import { describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { renderAt } from "./render";
import { API, block, server } from "./server";

const sidebar = [
  { ...block(1, "Welcome"), sort_order: 1 },
  { ...block(2, "Look who is here"), sort_order: 1 }, // a tie, as in real data
  { ...block(3, "Draft notice"), sort_order: 2, published: false },
];

function useSidebar(onSave: (body: unknown) => Response) {
  server.use(
    http.get(`${API}/v1/admin/content-blocks`, ({ request }) => {
      const url = new URL(request.url);
      expect(url.searchParams.get("placement")).toBe("sidebar");
      expect(url.searchParams.get("sort")).toBe("sort_order,id");
      return HttpResponse.json({ items: sidebar, total: sidebar.length });
    }),
    http.put(`${API}/v1/admin/content-blocks/order`, async ({ request }) => onSave(await request.json())),
  );
}

const titles = () =>
  within(screen.getByRole("list", { name: "Blocks in display order" }))
    .getAllByRole("listitem").map((row) => within(row).getAllByText(/./)[2].textContent);

describe("arranging content blocks", () => {
  it("moves blocks and saves the whole placement in the new order", async () => {
    let saved: unknown = null;
    useSidebar((body) => { saved = body; return HttpResponse.json({ items: [], total: 0 }); });
    renderAt("/content-blocks/arrange?placement=sidebar");
    const user = userEvent.setup();

    await screen.findByRole("button", { name: "Move Draft notice up" });
    expect(titles()).toEqual(["Welcome", "Look who is here", "Draft notice"]);
    // The tie (two blocks at 1) already counts as a change: saving renumbers them 1, 2, 3.
    expect(screen.getByRole("button", { name: "Save order" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Move Draft notice up" }));
    await user.click(screen.getByRole("button", { name: "Move Draft notice up" }));
    expect(titles()).toEqual(["Draft notice", "Welcome", "Look who is here"]);
    expect(screen.getByRole("button", { name: "Move Draft notice up" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Save order" }));
    await waitFor(() => expect(saved).toEqual({ placement: "sidebar", ids: [3, 1, 2] }));
  });

  it("undo puts the order back", async () => {
    useSidebar(() => HttpResponse.json({ items: [], total: 0 }));
    renderAt("/content-blocks/arrange?placement=sidebar");
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Move Welcome down" }));
    expect(titles()[0]).toBe("Look who is here");
    await user.click(screen.getByRole("button", { name: "Undo changes" }));
    expect(titles()).toEqual(["Welcome", "Look who is here", "Draft notice"]);
  });

  it("shows the server's sentence when the placement changed meanwhile", async () => {
    useSidebar(() => HttpResponse.json(
      { type: "about:blank", title: "Conflict", status: 409, code: "order_out_of_date",
        detail: "The list doesn't match the blocks in this placement any more. Reload and try again." },
      { status: 409, headers: { "Content-Type": "application/problem+json" } },
    ));
    renderAt("/content-blocks/arrange?placement=sidebar");
    await userEvent.setup().click(await screen.findByRole("button", { name: "Save order" }));
    expect(await screen.findByText(/doesn't match the blocks in this placement/)).toBeInTheDocument();
  });

  it("is reached from the list", async () => {
    renderAt("/content-blocks");
    expect(await screen.findByRole("link", { name: "Arrange order" })).toHaveAttribute("href", "/content-blocks/arrange");
  });
});
