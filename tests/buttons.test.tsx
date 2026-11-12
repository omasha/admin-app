import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { renderAt } from "./render";
import { API, block, server } from "./server";

// Home page buttons: a content block of type Button on the Homepage placement.

describe("Home page buttons", () => {
  it("picking the Button type sets the Homepage placement, swaps the body for a link, and saves both", async () => {
    let sent: Record<string, unknown> | null = null;
    server.use(http.post(`${API}/v1/admin/content-blocks`, async ({ request }) => {
      sent = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({ ...block(9, "x"), ...sent }, { status: 201 });
    }));
    renderAt("/content-blocks/create");
    const user = userEvent.setup();
    expect(await screen.findByText("Body")).toBeInTheDocument();

    await user.click(screen.getByRole("textbox", { name: "Type" }));
    await user.click(await screen.findByRole("option", { name: "Button", hidden: true }));

    expect(screen.getByRole("textbox", { name: "Placement" })).toHaveValue("Homepage");
    expect(screen.queryByText("Body")).not.toBeInTheDocument();
    expect(screen.getByText(/Shows on the portal's home page/)).toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: "Button text" }), "Go to Your Profile");
    await user.type(screen.getByRole("textbox", { name: "Link" }), "/my-profile");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(sent).not.toBeNull());
    expect(sent).toMatchObject({
      block_type: "button", placement: "homepage", title: "Go to Your Profile", link: "/my-profile", body: null,
    });
  });

  it("picking another placement turns a button back into an HTML block", async () => {
    renderAt("/content-blocks/create");
    const user = userEvent.setup();
    await user.click(await screen.findByRole("textbox", { name: "Placement" }));
    await user.click(await screen.findByRole("option", { name: "Homepage", hidden: true }));
    expect(screen.getByRole("textbox", { name: "Type" })).toHaveValue("Button");

    await user.click(screen.getByRole("textbox", { name: "Placement" }));
    await user.click(await screen.findByRole("option", { name: "Sidebar", hidden: true }));
    expect(screen.getByRole("textbox", { name: "Type" })).toHaveValue("HTML block");
    expect(screen.getByText("Body")).toBeInTheDocument();
  });

  it("widgets aren't offered the Homepage placement", async () => {
    renderAt("/widgets/create");
    const user = userEvent.setup();
    await user.click(await screen.findByRole("textbox", { name: "Placement" }));
    expect(await screen.findByRole("option", { name: "Sidebar", hidden: true })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Homepage", hidden: true })).not.toBeInTheDocument();
  });
});

describe("Who sees a block", () => {
  it("a new block is for everyone; picking visitors only is saved", async () => {
    let sent: Record<string, unknown> | null = null;
    server.use(http.post(`${API}/v1/admin/content-blocks`, async ({ request }) => {
      sent = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({ ...block(9, "x"), ...sent }, { status: 201 });
    }));
    renderAt("/content-blocks/create");
    const user = userEvent.setup();
    const showTo = await screen.findByRole("textbox", { name: "Show to" });
    expect(showTo).toHaveValue("Everyone");
    await user.type(screen.getByRole("textbox", { name: "Title" }), "Log in to see more");
    await user.click(screen.getByRole("textbox", { name: "Placement" }));
    await user.click(await screen.findByRole("option", { name: "Tickets", hidden: true }));
    await user.click(showTo);
    await user.click(await screen.findByRole("option", { name: "Visitors only (not logged in)", hidden: true }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(sent).not.toBeNull());
    expect(sent).toMatchObject({ title: "Log in to see more", placement: "ud_tickets", audience: "visitors" });
  });

  it("buttons don't offer it", async () => {
    renderAt("/content-blocks/create");
    const user = userEvent.setup();
    await user.click(await screen.findByRole("textbox", { name: "Type" }));
    await user.click(await screen.findByRole("option", { name: "Button", hidden: true }));
    expect(screen.queryByRole("textbox", { name: "Show to" })).not.toBeInTheDocument();
  });
});
