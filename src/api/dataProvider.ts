// Refine's data provider: the one adapter between Refine and the API (REFACTOR_PLAN §5.1).
//
// It teaches Refine the list rules (REFACTOR_PLAN §3.1) once, for every resource:
//   page / pageSize          → ?page=&per_page=
//   sorters                  → ?sort=-updated_at,title    (minus = descending)
//   filters, operator "eq"   → ?placement=sidebar         (flat field=value)
//   filter on field "q"      → ?q=…                       (free-text search)
//   answer {items, total}    → Refine's {data, total}
//
// Every call goes through the generated client's functions (src/api/generated/sdk.gen.ts), not
// hand-built URLs. Adding a resource = one entry in `resources` below.

import type { BaseRecord, CrudFilter, CrudSort, DataProvider } from "@refinedev/core";
import { env } from "../config/env";
import { toHttpError } from "./client";
import * as sdk from "./generated/sdk.gen";

// The generated functions all take {query, path, body} and resolve to {data, error, response}.
type Call = (options: {
  query?: Record<string, unknown>;
  path?: Record<string, unknown>;
  body?: unknown;
}) => Promise<{ data?: unknown; error?: unknown; response?: Response }>;

type ResourceCalls = {
  list: Call;
  get: Call;
  create: Call;
  update: Call;
  remove: Call;
  idParam: string; // the id's name in the route, e.g. /admin/content-blocks/{block_id}
};

const asCall = (fn: unknown) => fn as Call;

export const resources: Record<string, ResourceCalls> = {
  "content-blocks": {
    list: asCall(sdk.listContentBlocks),
    get: asCall(sdk.getContentBlock),
    create: asCall(sdk.createContentBlock),
    update: asCall(sdk.updateContentBlock),
    remove: asCall(sdk.deleteContentBlock),
    idParam: "block_id",
  },
  widgets: {
    list: asCall(sdk.listWidgets),
    get: asCall(sdk.getWidget),
    create: asCall(sdk.createWidget),
    update: asCall(sdk.updateWidget),
    remove: asCall(sdk.deleteWidget),
    idParam: "widget_id",
  },
  "embedded-forms": {
    list: asCall(sdk.listEmbeddedForms),
    get: asCall(sdk.getEmbeddedForm),
    create: asCall(sdk.createEmbeddedForm),
    update: asCall(sdk.updateEmbeddedForm),
    remove: asCall(sdk.deleteEmbeddedForm),
    idParam: "form_id",
  },
};

function callsFor(resource: string): ResourceCalls {
  const calls = resources[resource];
  if (!calls) throw new Error(`No API routes registered for resource "${resource}"`);
  return calls;
}

async function run<T>(call: Call, options: Parameters<Call>[0]): Promise<T> {
  const { data, error, response } = await call(options);
  if (error !== undefined || (response && !response.ok)) throw toHttpError(error, response);
  return data as T;
}

export function listQuery(
  pagination: { currentPage?: number; pageSize?: number; mode?: string } | undefined,
  sorters: CrudSort[] | undefined,
  filters: CrudFilter[] | undefined,
): Record<string, unknown> {
  const query: Record<string, unknown> = {};
  if (pagination?.mode !== "off") {
    query.page = pagination?.currentPage ?? 1;
    query.per_page = pagination?.pageSize ?? 25;
  }
  const sort = (sorters ?? []).map((s) => (s.order === "desc" ? `-${s.field}` : s.field)).join(",");
  if (sort) query.sort = sort;
  for (const filter of filters ?? []) {
    if (!("field" in filter)) continue; // and/or groups: not part of the §3.1 rules
    const { field, operator, value } = filter;
    if (value === undefined || value === null || value === "") continue;
    if (field === "q" || operator === "eq" || operator === "contains") query[field] = value;
  }
  return query;
}

export const dataProvider: DataProvider = {
  getApiUrl: () => env.apiUrl ?? "",

  getList: async ({ resource, pagination, sorters, filters }) => {
    const page = await run<{ items: BaseRecord[]; total: number }>(callsFor(resource).list, {
      query: listQuery(pagination, sorters, filters),
    });
    return { data: page.items as never[], total: page.total };
  },

  getOne: async ({ resource, id }) => {
    const calls = callsFor(resource);
    const data = await run<BaseRecord>(calls.get, { path: { [calls.idParam]: id } });
    return { data: data as never };
  },

  create: async ({ resource, variables }) => {
    const data = await run<BaseRecord>(callsFor(resource).create, { body: variables });
    return { data: data as never };
  },

  update: async ({ resource, id, variables }) => {
    const calls = callsFor(resource);
    const data = await run<BaseRecord>(calls.update, { path: { [calls.idParam]: id }, body: variables });
    return { data: data as never };
  },

  deleteOne: async ({ resource, id }) => {
    const calls = callsFor(resource);
    await run(calls.remove, { path: { [calls.idParam]: id } });
    return { data: { id } as never };
  },
};
