# admin-app (prototype)

A prototype of the unified admin app in `../refactor/REFACTOR_PLAN.md` §5 and `POC_PLAN.md`:
**Refine** for data, login and permissions, **Mantine 8** screens, over the **TypeScript client
generated** from `portal-api-v2`'s API description. It covers content blocks, widgets and embedded
forms, with the rich text editor (decision #13), plus People (today's WordPress "fuser" screens)
and Permissions.

The backend side is on `portal-api-v2`'s branch `feat-admin-app` (its README: "The plan's own database").
This is separate from the allocator prototype (`../allocator-admin`, its own database, Okta groups).

## Who sees what

Permissions are rows in the backend's `admin_grants` table, not Okta groups (REFACTOR_PLAN §2.2).
Each one includes the ones above it in this table, and the menu shows only what a person may use:

| Permission | Sees | Can |
|---|---|---|
| `fuser` | People | search for accounts (a form, never a list of everyone), open the account summary |
| `fuser_details` | People | also see the whole profile (view only); change a person's username, email or password (sent to Okta) |
| `staff_admin` | everything | content, forms, Permissions, and all of the above |

"/" opens the first section the person may use. Someone with no permission gets "No access". The
API refuses them too; hiding things here is only a convenience. Staff admins give and remove
permissions on the Permissions page, or from a person's page ("Give a permission").

## Run locally

1. Backend: follow "The plan's own database" in `../portal-api-v2/README.md` (Docker, `.env`,
   migrations, `add-user … --bpguid … --grant staff_admin`), then `./start-local.sh` there.
2. `npm install`, then `cp .env.sample .env.local` and fill it in.
3. In Okta (dev): add `http://localhost:3100/login/callback` to the Okta app's sign-in redirect
   URIs, and `http://localhost:3100` (exactly that) to its sign-out redirect URIs. If it's an Okta app of its own, add its client ID to `OKTA_EXTRA_CLIENT_IDS` in the
   backend's `.env`. No groups or extra claims are needed.
4. `npm run dev`, then http://localhost:3100

## After the API changes

```bash
(cd ../portal-api-v2 && .venv/bin/python scripts/export_openapi.py)   # backend → openapi.json
npm run api:generate                                                  # openapi.json → src/api/generated
npm run typecheck                                                     # does the app still fit the API?
```

Don't edit `src/api/generated`.

## Test and build

```bash
npm test          # Vitest; the backend is faked with MSW (tests/server.ts), Okta is faked in tests/setup.ts
npm run typecheck
npm run build
```

## Layout

```
src/
  App.tsx                 Refine setup, the routes, which page each resource uses
  api/generated/          the generated client (types + one function per route)
  api/client.ts           API address, login token, problem details → Refine errors
  api/dataProvider.ts     THE adapter: Refine ↔ the list rules (§3.1); one entry per resource
  auth/providers.ts       Refine's auth (okta-auth-js) and access control (GET /v1/me)
  components/
    ResourceList.tsx      one list screen for all resources (search, filters, sort, pages, delete)
    useResourceForm.ts    one form pattern: Refine loads/saves, Mantine holds the fields
    RichTextField.tsx     the rich text editor (Tiptap via @mantine/tiptap)
    FormPage.tsx, Layout.tsx
  pages/                  one file per resource: its columns and its form fields
  pages/arrangeBlocks.tsx drag-and-drop order for one placement's blocks (dnd-kit), saved in one request
  api/people.ts           the people search: at least one field, each matched from its start
  pages/users.tsx         People: the search form, the person's page (summary, profile, permissions), username/email
                          change and new password (both sent to Okta by the backend)
  pages/grants.tsx        Permissions: the list, and "Give a permission" with a person search
```

## Findings so far (for comparing prototypes)

- **Refine's ready-made Mantine screens can't be used.** `@refinedev/mantine` 3.0.2 (latest) needs
  Mantine 5; the portal is on Mantine 8. So this uses Refine's core only, and the list and form
  screens are written once here (`ResourceList`, `useResourceForm`) and reused. Refine's savings are
  the data adapter, paging/sorting/filter state, saving, and login/permission wiring, not the screens.
- **Adding a resource** = an entry in `api/dataProvider.ts`, one in `App.tsx`, and a `pages/` file
  with its columns and fields. Widgets and embedded forms were added this way after content blocks.
- **The generated client fits.** Widgets come out as "one of two shapes, told apart by `type`"
  (risk R8). Answer fields the API always sends are marked required, so the types don't say
  "maybe missing" and removing one counts as a breaking change.
- **react-router, not TanStack Router.** Refine has no TanStack Router adapter; the portal uses TanStack Router.
- **Drag and drop isn't part of Refine.** The Arrange view uses dnd-kit (with ↑ ↓ buttons and the
  keyboard as alternatives) and one backend route that renumbers a whole placement at once.
- **Different permissions per action** fit Refine's access control as it is: each resource lists
  the permission per action (`auth/providers.ts`), and the profile is a resource of its own
  (`user-profiles`) because it needs `fuser_details`.
- **One login for all tabs**, kept in localStorage like the portal: it lasts until logging out or
  the token runs out (24 hours), even if the browser is closed.
- **Size:** about 1.4 MB of JavaScript (420 kB compressed) before any code splitting.
