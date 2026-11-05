import { describe, expect, it } from "vitest";
import { listQuery } from "../src/api/dataProvider";
import { toHttpError } from "../src/api/client";

describe("list rules (REFACTOR_PLAN §3.1)", () => {
  it("maps Refine's paging, sorting, filters and search to the API's", () => {
    expect(listQuery(
      { currentPage: 3, pageSize: 10 },
      [{ field: "updated_at", order: "desc" }, { field: "title", order: "asc" }],
      [
        { field: "placement", operator: "eq", value: "sidebar" },
        { field: "q", operator: "contains", value: "camp" },
        { field: "published", operator: "eq", value: undefined },
      ],
    )).toEqual({ page: 3, per_page: 10, sort: "-updated_at,title", placement: "sidebar", q: "camp" });
  });

  it("defaults to page 1 of 25", () => {
    expect(listQuery(undefined, [], [])).toEqual({ page: 1, per_page: 25 });
  });
});

describe("problem details → Refine errors", () => {
  it("keeps the sentence and puts each field's message under the field", () => {
    const error = toHttpError(
      { status: 422, code: "invalid_request", detail: "Some values are missing or not valid.",
        errors: [{ field: "body.link", message: "must start with http:" }] },
      new Response(null, { status: 422 }),
    );
    expect(error).toMatchObject({
      statusCode: 422, code: "invalid_request", message: "Some values are missing or not valid.",
      errors: { link: ["must start with http:"] },
    });
  });
});
