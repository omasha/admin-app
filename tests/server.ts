// A fake portal-api-v2 for the app tests (MSW). Each test can replace handlers.
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

export const API = "http://localhost:3999";

export const staffMe = {
  // As the API sends it: staff_admin includes the other permissions.
  bpguid: "FFD8D6CC-91B4-DD73-264F-EC63D7C6838B", username: "staff", permissions: ["fuser", "fuser_details", "staff_admin"],
  account: { id: 1, bpguid: "g-1", email: "staff@example.org", first_name: "Sam", last_name: "Staff", status: "active" },
};

export const block = (id: number, title: string) => ({
  id, title, block_type: "html", body: "<p>Hi</p>", link: null, css_class: null, placement: "sidebar",
  sort_order: id, published: true, created_at: "2026-11-05T10:00:00", updated_at: "2026-11-05T10:00:00",
});

export const person = (id: number, first: string, email: string) => ({
  id, bpguid: `00000000-0000-0000-0000-00000000000${id}`, email, username: email.split("@")[0], first_name: first,
  last_name: "Tester", status: "active", legacy_wpid: 100 + id, completed: true, created_at: "2016-03-17T10:00:00",
});

export const profile = {
  playa_name: "Dusty", url: null, addr1: "1 Main St", addr2: null, city: "Gerlach", state: "NV", zip: "89412",
  country: "US", phone: "555-0100", descr: null, work: null, org: null, title: null, years: [2023, 2019],
  affiliations: ["Theme Camp"], completed: true, updated_at: "2026-11-05T10:00:00",
};

export const requests: URL[] = [];

export const server = setupServer(
  http.get(`${API}/v1/me`, () => HttpResponse.json(staffMe)),
  http.get(`${API}/v1/admin/content-blocks`, ({ request }) => {
    requests.push(new URL(request.url));
    return HttpResponse.json({ items: [block(1, "Welcome"), block(2, "Ticket FAQ")], total: 2 });
  }),
  http.get(`${API}/v1/admin/users`, ({ request }) => {
    requests.push(new URL(request.url));
    return HttpResponse.json({ items: [person(7, "Dusty", "dusty@example.org")], more: false });
  }),
  http.get(`${API}/v1/admin/users/:id`, ({ params }) => HttpResponse.json(person(Number(params.id), "Dusty", "dusty@example.org"))),
  http.get(`${API}/v1/admin/users/:id/profile`, () => HttpResponse.json(profile)),
  http.get(`${API}/v1/admin/grants`, () => HttpResponse.json({ items: [], total: 0 })),
);
