// Counts of people for the Statistics screen (GET /v1/admin/stats/people, staff admins only).
// Only counts come back, never names. A count the API hides (1 to small-1 people) is null.

import { useQuery } from "@tanstack/react-query";
import { getPeopleStats } from "./generated/sdk.gen";
import type { GetPeopleStatsData, PeopleStats } from "./generated/types.gen";
import { toHttpError } from "./client";

export type StatsQuery = NonNullable<GetPeopleStatsData["query"]>;

export function usePeopleStats(query: StatsQuery, enabled = true) {
  return useQuery<PeopleStats, Error>({
    queryKey: ["people-stats", query],
    enabled,
    retry: false, // a refused or failed count is shown straight away, with the API's reason
    staleTime: 5 * 60_000, // the same question again within 5 minutes isn't asked again
    queryFn: async () => {
      const { data, error, response } = await getPeopleStats({ query });
      if (error !== undefined || !data) throw toHttpError(error, response);
      return data;
    },
  });
}
