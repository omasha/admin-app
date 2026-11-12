import { describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { renderAt } from "./render";
import { API, requests, server, staffMe } from "./server";

const asked = () => requests.filter((u) => u.pathname === "/v1/admin/stats/people")
  .map((u) => Object.fromEntries(u.searchParams));

describe("Statistics", () => {
  it("is in the menu for staff admins, and counts active accounts to begin with", async () => {
    requests.length = 0;
    renderAt("/");
    await screen.findByRole("heading", { name: "Content blocks" }); // "/" has opened the first section
    await userEvent.setup().click(screen.getByRole("link", { name: "Statistics" }));
    expect(await screen.findByText("1,200 people")).toBeInTheDocument();
    expect(screen.getByText("Active accounts")).toBeInTheDocument();
    expect(asked()).toContainEqual({ status: "active" });
  });

  it("is hidden from, and closed to, people who aren't staff admins", async () => {
    server.use(http.get(`${API}/v1/me`, () => HttpResponse.json({ ...staffMe, permissions: ["fuser", "fuser_details"] })));
    renderAt("/stats");
    expect(await screen.findByRole("heading", { name: "No access" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Statistics" })).not.toBeInTheDocument();
  });

  it("asks the question in the address, and says it in words", async () => {
    requests.length = 0;
    renderAt("/stats?year=2019&country=US&state=CA&status=any");
    expect(await screen.findByText("300 people")).toBeInTheDocument();
    expect(screen.getByText("All accounts that say they attended in 2019 and live in CA, United States")).toBeInTheDocument();
    expect(asked()).toContainEqual({ year: "2019", country: "US", state: "CA" });
  });

  it("picking a year asks again with it", async () => {
    renderAt("/stats");
    await screen.findByText("1,200 people");
    const user = userEvent.setup();
    await user.click(screen.getByRole("textbox", { name: "Year attended" }));
    await user.click(await screen.findByRole("option", { name: "2019", hidden: true }));
    expect(await screen.findByText("300 people")).toBeInTheDocument();
    expect(window.location.search).toBe("?year=2019");
  });

  it("offers the countries people live in, by name", async () => {
    renderAt("/stats");
    const user = userEvent.setup();
    await screen.findByText("1,200 people");
    await user.click(screen.getByRole("textbox", { name: "Country" }));
    expect(await screen.findByRole("option", { name: "Germany", hidden: true })).toBeInTheDocument();
    await user.click(screen.getByRole("option", { name: "United States", hidden: true }));
    await waitFor(() => expect(window.location.search).toBe("?country=US"));
    await waitFor(() => expect(screen.getByRole("textbox", { name: "State or province" })).toBeEnabled());
  });

  it("breaks the count down into a table, with hidden counts as “fewer than 5”", async () => {
    renderAt("/stats?group_by=country");
    const table = await screen.findByRole("table");
    const cells = within(table).getAllByRole("row").slice(1).map((r) =>
      within(r).getAllByRole("cell").slice(0, 2).map((c) => c.textContent));
    expect(cells).toEqual([["United States", "900"], ["Germany", "290"], ["New Zealand", "fewer than 5"],
                           ["(no country given)", "7"]]);
  });

  it("a state is shown with its country, and a hidden total says so", async () => {
    renderAt("/stats?group_by=state&country=US&state=NV");
    expect(await screen.findByText("Fewer than 5 people")).toBeInTheDocument();
    expect(await screen.findByRole("cell", { name: "CA, United States" })).toBeInTheDocument();
  });

  it("shows the API's reason when the count fails", async () => {
    server.use(http.get(`${API}/v1/admin/stats/people`, () =>
      HttpResponse.json({ status: 503, code: "no_database", detail: "The database isn't available." }, { status: 503 })));
    renderAt("/stats");
    expect(await screen.findByText("The database isn't available.")).toBeInTheDocument();
  });
});
