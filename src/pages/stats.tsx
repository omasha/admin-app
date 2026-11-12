// Statistics: questions about everyone at once, answered with counts (staff admins only).
//
//   "How many people went in 2019?"            Year attended = 2019
//   "How many people come from California?"    Country = United States, State = CA
//   "Where did the 2019 attendees come from?"  Year attended = 2019, Break down by = Country
//
// The choices are kept in the address, so a question can be bookmarked or sent to someone.
// The country and state lists are the ones people actually have on their profiles, asked
// from the same API route (broken down by country / by state).

import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { Alert, Box, Group, Loader, Paper, Select, SimpleGrid, Stack, Table, Text, Title } from "@mantine/core";
import type { PeopleStats, StatRow } from "../api/generated/types.gen";
import { usePeopleStats, type StatsQuery } from "../api/stats";
import { labelFor, userStatuses, yesNo } from "./options";

const FIRST_YEAR = 1986;
const years = Array.from({ length: new Date().getFullYear() - FIRST_YEAR + 1 }, (_, i) =>
  String(new Date().getFullYear() - i));

const groupings = [
  { value: "year", label: "Year attended" },
  { value: "country", label: "Country" },
  { value: "state", label: "State" },
];
const ANY = "any";
const statusChoices = [{ value: ANY, label: "Any" }, ...userStatuses];

let regionNames: Intl.DisplayNames | undefined;
try {
  regionNames = new Intl.DisplayNames(["en"], { type: "region" });
} catch { /* an old browser: the 2-letter codes are shown */ }

export function countryName(code: string): string {
  if (!code) return "(no country given)";
  try {
    return regionNames?.of(code) ?? code;
  } catch {
    return code; // not a code the browser knows
  }
}

const number = (n: number) => n.toLocaleString("en-US");
const people = (n: number) => `${number(n)} ${n === 1 ? "person" : "people"}`;

/** The address's choices as the API's query. Status is "active" unless something else is picked. */
function readQuery(params: URLSearchParams): StatsQuery {
  const pick = <T extends string>(name: string, allowed: readonly T[]) => {
    const v = params.get(name);
    return v && (allowed as readonly string[]).includes(v) ? (v as T) : undefined;
  };
  const year = Number(params.get("year"));
  const country = /^[A-Za-z]{2}$/.test(params.get("country") ?? "") ? params.get("country")!.toUpperCase() : undefined;
  const status = params.get("status") === ANY ? undefined
    : pick("status", ["active", "flagged_for_deletion", "deactivated"] as const) ?? "active";
  const completed = pick("completed", ["true", "false"] as const);
  return {
    year: years.includes(String(year)) ? year : undefined,
    country,
    state: country ? params.get("state") || undefined : undefined,
    status,
    completed: completed === undefined ? undefined : completed === "true",
    group_by: pick("group_by", ["year", "country", "state"] as const),
  };
}

/** The question in words, e.g. "Active accounts that say they attended in 2019 and live in CA, United States". */
export function describe(q: StatsQuery): string {
  const who = q.status ? `${labelFor(userStatuses, q.status)} accounts` : "All accounts";
  const that: string[] = [];
  if (q.year) that.push(`say they attended in ${q.year}`);
  if (q.country) that.push(`live in ${q.state ? `${q.state}, ` : ""}${countryName(q.country)}`);
  if (q.completed !== undefined && q.completed !== null) {
    that.push(q.completed ? "have filled in their profile" : "haven't filled in their profile");
  }
  return that.length ? `${who} that ${that.join(" and ")}` : who;
}

function rowLabel(row: StatRow, groupBy: PeopleStats["group_by"]): string {
  if (groupBy === "year") return row.value;
  if (groupBy === "country") return countryName(row.value);
  const state = row.value || "(no state given)";
  return row.country === null ? state : `${state}, ${countryName(row.country)}`;
}

export function StatsPage() {
  const [params, setParams] = useSearchParams();
  const query = useMemo(() => readQuery(params), [params]);
  const { data, error, isFetching } = usePeopleStats(query);

  // The lists to pick from: what's on people's profiles (any account status).
  const countries = usePeopleStats({ group_by: "country" });
  const states = usePeopleStats({ group_by: "state", country: query.country }, !!query.country);
  const countryOptions = useMemo(() => (countries.data?.rows ?? []).filter((r) => r.value)
    .map((r) => ({ value: r.value, label: countryName(r.value) }))
    .sort((a, b) => a.label.localeCompare(b.label)), [countries.data]);
  const stateOptions = useMemo(() => (states.data?.rows ?? []).filter((r) => r.value)
    .map((r) => r.value).sort((a, b) => a.localeCompare(b)), [states.data]);

  const set = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [name, value] of Object.entries(changes)) {
      if (value) next.set(name, value);
      else next.delete(name);
    }
    setParams(next, { replace: true });
  };

  return (
    <Stack>
      <Title order={2}>Statistics</Title>
      <Paper withBorder p="lg">
        <Stack>
          <Text size="sm" c="dimmed">
            Pick who to count. Leave a box empty to count everyone. The answer changes as you pick.
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
            <Select label="Year attended" placeholder="Any year" data={years} searchable clearable
                    value={query.year ? String(query.year) : null} onChange={(v) => set({ year: v })} />
            <Select label="Country" placeholder="Any country" data={countryOptions} searchable clearable
                    value={query.country ?? null} onChange={(v) => set({ country: v, state: null })}
                    nothingFoundMessage={countries.isLoading ? "Loading…" : "Nobody lives there"} />
            <Select label="State or province" searchable clearable disabled={!query.country}
                    placeholder={query.country ? "Any state" : "Pick a country first"}
                    data={query.state && !stateOptions.includes(query.state) ? [query.state, ...stateOptions] : stateOptions}
                    value={query.state ?? null} onChange={(v) => set({ state: v })} />
            <Select label="Account status" data={statusChoices} allowDeselect={false}
                    value={query.status ?? ANY} onChange={(v) => set({ status: v === "active" ? null : v })} />
            <Select label="Profile filled in" placeholder="Either" data={yesNo} clearable
                    value={query.completed === undefined || query.completed === null ? null : String(query.completed)}
                    onChange={(v) => set({ completed: v })} />
            <Select label="Break down by" placeholder="Just the total" data={groupings} clearable
                    value={query.group_by ?? null} onChange={(v) => set({ group_by: v })} />
          </SimpleGrid>
        </Stack>
      </Paper>

      {error && <Alert color="bmpRed" title="The count didn't work">{error.message}</Alert>}
      {!data && isFetching && <Loader />}
      {data && <Answer data={data} query={query} dimmed={isFetching} />}

      <Text size="sm" c="dimmed" maw={760}>
        Years are what people ticked on their own profile, not ticket records. Where people live is
        the country and state on their profile; cities can't be counted. To keep any one person from
        being picked out, a count from 1 to {(data?.small ?? 5) - 1} is shown as “fewer than {data?.small ?? 5}”.
      </Text>
    </Stack>
  );
}

function Answer({ data, query, dimmed }: { data: PeopleStats; query: StatsQuery; dimmed: boolean }) {
  const fewer = `fewer than ${data.small}`;
  const largest = Math.max(1, ...data.rows.map((r) => r.count ?? 0));
  const heading = data.group_by ? labelFor(groupings, data.group_by) : "";
  return (
    <Stack style={{ opacity: dimmed ? 0.5 : 1 }} aria-busy={dimmed}>
      <Paper withBorder p="lg">
        <Text size="sm" c="dimmed">{describe(query)}</Text>
        <Text fz={40} fw={700} lh={1.2} data-testid="stats-total">
          {data.total === null ? `Fewer than ${data.small} people` : people(data.total)}
        </Text>
      </Paper>

      {data.group_by && (
        <Stack gap="xs">
          {data.group_by === "year" && (
            <Text size="sm" c="dimmed">
              {query.year
                ? `Of the people who attended in ${query.year}, how many attended each year. `
                : ""}
              Someone who attended in several years is counted in each of them, so the rows add up to more than the total.
            </Text>
          )}
          {data.more && <Alert color="bmpYellow">Only the {data.rows.length} largest are shown.</Alert>}
          {data.rows.length === 0 ? <Text>Nothing to show.</Text> : (
            <Table striped withTableBorder verticalSpacing={6}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{heading}</Table.Th>
                  <Table.Th ta="right">People</Table.Th>
                  <Table.Th w="55%" aria-hidden />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {data.rows.map((row) => {
                  const label = rowLabel(row, data.group_by);
                  return (
                    <Table.Tr key={`${row.country ?? ""}/${row.value}`}>
                      <Table.Td>{label}</Table.Td>
                      <Table.Td ta="right" style={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                        {row.count === null ? <Text span c="dimmed" size="sm">{fewer}</Text> : number(row.count)}
                      </Table.Td>
                      <Table.Td aria-hidden>
                        {row.count !== null && row.count > 0 && (
                          <Group gap={0} wrap="nowrap" title={`${label}: ${people(row.count)}`}>
                            {/* One measure, one color: the bar's length is the count. */}
                            <Box h={12} miw={2} w={`${(row.count / largest) * 100}%`}
                                 bg="bmpPurple.5" style={{ borderRadius: "0 4px 4px 0" }} />
                          </Group>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          )}
        </Stack>
      )}
    </Stack>
  );
}
