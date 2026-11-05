// Permissions: who may use which part of the admin app (API_ENDPOINTS §7, /admin/grants).
// Replaces today's WordPress access lists (`fuser`, `fuser_details`) and the command line.
// Staff admins only. The API refuses removing your own staff admin permission, so the app
// can't be left with nobody able to give permissions.

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useCreate, useOne, type HttpError } from "@refinedev/core";
import {
  Alert, Anchor, Button, Group, Paper, Radio, Select, Stack, Text, Title,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import type { GrantIn, GrantOut, UserSummary } from "../api/generated/types.gen";
import { cleanSearch, guessSearch, usePeopleSearch } from "../api/people";
import { ResourceList } from "../components/ResourceList";
import { labelFor, permissions } from "./options";
import { fullName } from "./users";

const RESOURCE = "grants";

const person = (u: { first_name: string; last_name: string; email: string }) =>
  fullName(u) ? `${fullName(u)} (${u.email})` : u.email;

export function GrantList() {
  const [params] = useSearchParams();
  const userId = Number(params.get("user_id")) || null;
  const { result: user } = useOne<UserSummary>({ resource: "users", id: userId ?? 0, queryOptions: { enabled: !!userId } });

  return (
    <Stack>
      {userId && (
        <Alert color="bmpBlue">
          Showing {user ? person(user) : "one person"}'s permissions.{" "}
          <Anchor component={Link} to={`/${RESOURCE}`}>Show everyone's</Anchor>
        </Alert>
      )}
      <ResourceList<GrantOut>
        key={userId ?? "all"}
        resource={RESOURCE}
        title="Permissions"
        searchPlaceholder="Person's email, username or name"
        rowLabel={(g) => `${labelFor(permissions, g.permission)} for ${g.user.email}`}
        addLabel="Give a permission"
        deleteLabel="Remove"
        rowLink={(g) => `/users/show/${g.user.id}`}
        extraQuery={userId ? [{ field: "user_id", operator: "eq", value: userId }] : undefined}
        filters={userId ? [] : [{ field: "permission", label: "Permission", options: permissions }]}
        columns={[
          { key: "last_name", label: "Person", sortable: true, render: (g) => fullName(g.user) || g.user.username },
          { key: "email", label: "Email", sortable: true, render: (g) => g.user.email },
          { key: "permission", label: "Permission", sortable: true, render: (g) => labelFor(permissions, g.permission) },
          { key: "granted_by", label: "Given by", render: (g) => (g.granted_by ? g.granted_by.email : <Text span c="dimmed">—</Text>) },
          { key: "created_at", label: "Since", sortable: true, render: (g) => new Date(g.created_at + "Z").toLocaleDateString() },
        ]}
      />
    </Stack>
  );
}

/** Pick a person by typing the start of their email, username, "first last" name or bpguid. */
function PersonPicker({ value, onChange, error }: {
  value: number | null; onChange: (id: number | null) => void; error?: string;
}) {
  const [search, setSearch] = useState("");
  const [q] = useDebouncedValue(search, 250);
  const { data } = usePeopleSearch(cleanSearch(guessSearch(q)), 20);
  const { result: chosen } = useOne<UserSummary>({ resource: "users", id: value ?? 0, queryOptions: { enabled: !!value } });

  const options = useMemo(() => {
    const found = (data?.items ?? []).filter((u) => u.status === "active");
    const all = chosen && !found.some((u) => u.id === chosen.id) ? [chosen, ...found] : found;
    return all.map((u) => ({ value: String(u.id), label: person(u) }));
  }, [data, chosen]);

  return (
    <Select label="Person" required searchable placeholder="Start of an email, username, “first last” name or bpguid"
            data={options} value={value ? String(value) : null} error={error}
            searchValue={search} onSearchChange={setSearch} filter={({ options: o }) => o}
            nothingFoundMessage={q.trim().length >= 2 ? "Nobody found (only active accounts)" : "Keep typing"}
            onChange={(v) => onChange(v ? Number(v) : null)} />
  );
}

export function GrantCreate() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [userId, setUserId] = useState<number | null>(Number(params.get("user_id")) || null);
  const [permission, setPermission] = useState<GrantIn["permission"]>("fuser");
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const { mutate, mutation } = useCreate<GrantOut, HttpError, GrantIn>();
  useEffect(() => { if (userId) setMissing(false); }, [userId]);

  const save = () => {
    if (!userId) return setMissing(true);
    setError(null);
    mutate(
      { resource: RESOURCE, values: { user_id: userId, permission },
        successNotification: () => ({ message: "Permission given", type: "success" }),
        errorNotification: false },
      { onSuccess: () => navigate(`/${RESOURCE}?user_id=${userId}`),
        onError: (e) => setError(e.message) },
    );
  };

  return (
    <Stack maw={640}>
      <Anchor component={Link} to={`/${RESOURCE}`} size="sm">← Permissions</Anchor>
      <Title order={2}>Give a permission</Title>
      <Paper withBorder p="lg">
        <Stack>
          {error && <Alert color="bmpRed" title="Not given">{error}</Alert>}
          <PersonPicker value={userId} onChange={setUserId} error={missing ? "Pick a person" : undefined} />
          <Radio.Group label="Permission" value={permission} onChange={(v) => setPermission(v as GrantIn["permission"])}>
            <Stack gap="sm" mt="xs">
              {permissions.map((p) => <Radio key={p.value} value={p.value} label={p.label} description={p.description} />)}
            </Stack>
          </Radio.Group>
          <Text size="sm" c="dimmed">
            Each one includes the ones above it. The API applies it straight away; their menu changes the next time they load the app.
          </Text>
          <Group>
            <Button onClick={save} loading={mutation.isPending}>Give permission</Button>
            <Button component={Link} to={`/${RESOURCE}`} variant="default">Cancel</Button>
          </Group>
        </Stack>
      </Paper>
    </Stack>
  );
}
