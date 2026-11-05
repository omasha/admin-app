// The people search (GET /v1/admin/users). Not a Refine list: there's no "list everyone" (close
// to a million accounts), only a search that needs at least one field. Each field matches the
// start of that field, which the database answers from an index.

import { useQuery } from "@tanstack/react-query";
import { searchUsers } from "./generated/sdk.gen";
import type { UserSearchResults } from "./generated/types.gen";
import { toHttpError } from "./client";

export const searchFields = ["username", "first_name", "last_name", "email", "bpguid"] as const;
export type SearchField = (typeof searchFields)[number];
export type PeopleSearch = Partial<Record<SearchField, string>>;

/** Only the filled-in fields, trimmed; `null` if none is long enough to search on. */
export function cleanSearch(search: PeopleSearch): PeopleSearch | null {
  const cleaned: PeopleSearch = {};
  for (const field of searchFields) {
    const value = search[field]?.trim();
    if (value) cleaned[field] = value;
  }
  const minimum = (f: SearchField) => (f === "bpguid" ? 4 : 2);
  const usable = Object.entries(cleaned).some(([f, v]) => v!.length >= minimum(f as SearchField));
  return usable ? cleaned : null;
}

export function usePeopleSearch(search: PeopleSearch | null, limit = 25) {
  return useQuery<UserSearchResults, Error>({
    queryKey: ["people-search", search, limit],
    enabled: search !== null,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error, response } = await searchUsers({ query: { ...search, limit } });
      if (error !== undefined || !data) throw toHttpError(error, response);
      return data;
    },
  });
}

/** One box (the permissions screen's person picker): guess the field from what's typed. */
export function guessSearch(text: string): PeopleSearch {
  const t = text.trim();
  if (t.includes("@")) return { email: t };
  if (/^[0-9a-f]{8}-?/i.test(t) && /[0-9]/.test(t) && t.length >= 8) return { bpguid: t };
  const space = t.indexOf(" ");
  if (space > 0) return { first_name: t.slice(0, space), last_name: t.slice(space + 1).trim() || undefined };
  return { username: t };
}
