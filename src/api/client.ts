// Sets up the generated client (src/api/generated, from portal-api-v2's openapi.json) once:
// the API address, and the Okta login token on every request.
//
// Errors from /v1 are RFC 7807 problem documents:
//   {"status": 422, "code": "invalid_request", "detail": "…", "errors": [{"field": "link", "message": "…"}]}
// toHttpError turns them into Refine's HttpError, so forms can show each field's message.

import type { HttpError } from "@refinedev/core";
import { env } from "../config/env";
import { getAccessToken } from "../auth/okta";
import { client } from "./generated/client.gen";

client.setConfig({ baseUrl: env.apiUrl ?? "" });

client.interceptors.request.use((request) => {
  const token = getAccessToken();
  if (token) request.headers.set("Authorization", `Bearer ${token}`);
  return request;
});

export { client };

type Problem = {
  status?: number;
  code?: string;
  title?: string;
  detail?: string;
  errors?: { field: string; message: string }[];
};

export function toHttpError(error: unknown, response: Response | undefined): HttpError {
  const problem = (error && typeof error === "object" ? error : {}) as Problem;
  const statusCode = response?.status ?? problem.status ?? 0;
  const fieldErrors: Record<string, string[]> = {};
  for (const e of problem.errors ?? []) {
    // "body.link" or "link" → "link"
    const field = e.field.replace(/^body\./, "");
    (fieldErrors[field] ??= []).push(e.message);
  }
  return {
    message: problem.detail || problem.title || (statusCode ? `Request failed (${statusCode})` : "Can't reach the server."),
    statusCode,
    code: problem.code,
    errors: Object.keys(fieldErrors).length ? fieldErrors : undefined,
  };
}
