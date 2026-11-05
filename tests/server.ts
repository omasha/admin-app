// A fake portal-api-v2 for the app tests (MSW). Each test can replace handlers.
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

export const API = "http://localhost:3999";

export const staffMe = {
  bpguid: "FFD8D6CC-91B4-DD73-264F-EC63D7C6838B", username: "staff", permissions: ["staff_admin"],
  account: { id: 1, bpguid: "g-1", email: "staff@example.org", first_name: "Sam", last_name: "Staff", status: "active" },
};

export const block = (id: number, title: string) => ({
  id, title, block_type: "html", body: "<p>Hi</p>", link: null, css_class: null, placement: "sidebar",
  sort_order: id, published: true, created_at: "2026-11-05T10:00:00", updated_at: "2026-11-05T10:00:00",
});

export const requests: URL[] = [];

export const server = setupServer(
  http.get(`${API}/v1/me`, () => HttpResponse.json(staffMe)),
  http.get(`${API}/v1/admin/content-blocks`, ({ request }) => {
    requests.push(new URL(request.url));
    return HttpResponse.json({ items: [block(1, "Welcome"), block(2, "Ticket FAQ")], total: 2 });
  }),
);
