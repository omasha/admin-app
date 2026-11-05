// People: today's WordPress "fuser" screens (API_ENDPOINTS §6).
//
//   search   by the start of username, first/last name, email or bpguid      needs fuser
//   person   account summary                                                  needs fuser
//            whole profile (decrypted by the API; view only)                  needs fuser_details
//            their permissions, and "Give a permission"                       needs staff_admin
//   edit     change username or email, set a password (both sent to Okta)     needs fuser_details
//
// The API checks each of these itself; hiding a section here is only so people don't see
// buttons they can't use.

import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { CanAccess, useList, useOne } from "@refinedev/core";
import {
  Alert, Anchor, Badge, Button, Code, Group, Loader, Paper, PasswordInput, SimpleGrid, Stack, Table, Text, TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { toHttpError } from "../api/client";
import { setUserPassword } from "../api/generated/sdk.gen";
import type { AccountChange, GrantOut, ProfileDetails, UserSummary } from "../api/generated/types.gen";
import { FormPage } from "../components/FormPage";
import { cleanSearch, searchFields, usePeopleSearch, type SearchField } from "../api/people";
import { useResourceForm } from "../components/useResourceForm";
import { labelFor, permissions, userStatuses } from "./options";

const RESOURCE = "users";

export const fullName = (u: { first_name: string; last_name: string }) => `${u.first_name} ${u.last_name}`.trim();

const labels: Record<SearchField, string> = {
  username: "Username", first_name: "First name", last_name: "Last name", email: "Email", bpguid: "bpguid",
};

/** People: a search form, never a list of everyone. The search is kept in the address, so going
 *  back from a person returns to the same results. */
export function UserList() {
  const [params, setParams] = useSearchParams();
  const fromAddress = Object.fromEntries(searchFields.map((f) => [f, params.get(f) ?? ""])) as Record<SearchField, string>;
  const [draft, setDraft] = useState(fromAddress);
  const [problem, setProblem] = useState<string | null>(null);
  const search = cleanSearch(fromAddress);
  const { data, error, isFetching } = usePeopleSearch(search);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const cleaned = cleanSearch(draft);
    if (!cleaned) return setProblem("Fill in at least one field: 2 or more letters (bpguid: 4 or more).");
    setProblem(null);
    setParams(cleaned as Record<string, string>);
  };
  const clear = () => {
    setDraft(Object.fromEntries(searchFields.map((f) => [f, ""])) as Record<SearchField, string>);
    setProblem(null);
    setParams({});
  };

  return (
    <Stack>
      <Title order={2}>People</Title>
      <Paper withBorder p="lg">
        <form onSubmit={submit}>
          <Stack>
            <Text size="sm" c="dimmed">
              Fill in one field, or several to narrow it down. Each matches the start of the field:
              “fried” finds Friedman. Capital letters don't matter.
            </Text>
            <SimpleGrid cols={{ base: 1, sm: 3, lg: 5 }}>
              {searchFields.map((f) => (
                <TextInput key={f} label={labels[f]} value={draft[f]}
                           onChange={(e) => setDraft({ ...draft, [f]: e.currentTarget.value })} />
              ))}
            </SimpleGrid>
            {problem && <Text c="bmpRed" size="sm">{problem}</Text>}
            <Group>
              <Button type="submit" loading={isFetching}>Search</Button>
              <Button variant="default" onClick={clear}>Clear</Button>
            </Group>
          </Stack>
        </form>
      </Paper>

      {error && <Alert color="bmpRed" title="The search didn't work">{error.message}</Alert>}
      {search && data && (
        <Stack gap="xs">
          {data.more && (
            <Alert color="bmpYellow">
              More people match than shown here. Fill in more of a field, or another field, to narrow it down.
            </Alert>
          )}
          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                {["Name", "Email", "Username", "Status", "Profile", "WordPress ID"].map((h) => <Table.Th key={h}>{h}</Table.Th>)}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data.items.map((u) => (
                <Table.Tr key={u.id}>
                  <Table.Td>
                    <Anchor component={Link} to={`/${RESOURCE}/show/${u.id}`}>{fullName(u) || <em>(no name)</em>}</Anchor>
                  </Table.Td>
                  <Table.Td>{u.email}</Table.Td>
                  <Table.Td>{u.username}</Table.Td>
                  <Table.Td><Status value={u.status} /></Table.Td>
                  <Table.Td><Completed value={u.completed} /></Table.Td>
                  <Table.Td>{u.legacy_wpid}</Table.Td>
                </Table.Tr>
              ))}
              {data.items.length === 0 && (
                <Table.Tr><Table.Td colSpan={6}><Text c="dimmed">Nobody found.</Text></Table.Td></Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Stack>
      )}
    </Stack>
  );
}

function Status({ value }: { value: UserSummary["status"] }) {
  const color = value === "active" ? "bmpGreen" : value === "deactivated" ? "gray" : "bmpYellow";
  return <Badge color={color} variant="light">{labelFor(userStatuses, value)}</Badge>;
}

function Completed({ value }: { value: boolean | null }) {
  if (value === null) return <Text size="sm" c="dimmed">none</Text>;
  return value ? <Text size="sm">filled in</Text> : <Text size="sm" c="bmpYellow">not finished</Text>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>{label}</Text>
      <Text>{children === null || children === undefined || children === "" ? <Text span c="dimmed">—</Text> : children}</Text>
    </div>
  );
}

export function UserShow() {
  const { id } = useParams();
  const { result: user, query } = useOne<UserSummary>({ resource: RESOURCE, id });

  return (
    <Stack maw={860}>
      <Anchor component={Link} to={`/${RESOURCE}`} size="sm">← People</Anchor>
      {query.isLoading && <Loader />}
      {query.isError && <Alert color="bmpRed" title="Couldn't load this person">{query.error?.message}</Alert>}
      {user && (
        <>
          <Group justify="space-between">
            <Title order={2}>{fullName(user) || user.username}</Title>
            <CanAccess resource={RESOURCE} action="edit">
              <Group gap="xs">
                <Button component={Link} to={`/${RESOURCE}/edit/${user.id}`} variant="default">
                  Change username or email
                </Button>
                <Button component={Link} to={`/${RESOURCE}/password/${user.id}`} variant="default">
                  Set a new password
                </Button>
              </Group>
            </CanAccess>
          </Group>
          <Paper withBorder p="lg">
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <Field label="Email">{user.email}</Field>
              <Field label="Username">{user.username}</Field>
              <Field label="bpguid"><Code>{user.bpguid}</Code></Field>
              <Field label="WordPress ID">{user.legacy_wpid}</Field>
              <Field label="Status"><Status value={user.status} /></Field>
              <Field label="Profile"><Completed value={user.completed} /></Field>
              <Field label="Account created">{new Date(user.created_at + "Z").toLocaleDateString()}</Field>
            </SimpleGrid>
          </Paper>
          <CanAccess resource="user-profiles" action="show">
            <ProfileCard userId={user.id} hasProfile={user.completed !== null} />
          </CanAccess>
          <CanAccess resource="grants" action="list">
            <PermissionsCard userId={user.id} active={user.status === "active"} />
          </CanAccess>
        </>
      )}
    </Stack>
  );
}

function ProfileCard({ userId, hasProfile }: { userId: number; hasProfile: boolean }) {
  const { result: p, query } = useOne<ProfileDetails>({
    resource: "user-profiles", id: userId, queryOptions: { enabled: hasProfile, retry: false },
  });
  return (
    <Stack gap="xs">
      <Title order={3}>Profile</Title>
      <Paper withBorder p="lg">
        {!hasProfile ? <Text c="dimmed">This person hasn't filled in a profile.</Text>
          : query.isLoading ? <Loader size="sm" />
          : query.isError ? <Alert color="bmpRed" title="Couldn't load the profile">{query.error?.message}</Alert>
          : p && (
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <Field label="Playa name">{p.playa_name}</Field>
              <Field label="Phone">{p.phone}</Field>
              <Field label="Address">
                {[p.addr1, p.addr2].filter(Boolean).join(", ")}
              </Field>
              <Field label="City, state, postal code">
                {[p.city, p.state, p.zip].filter(Boolean).join(", ")}
              </Field>
              <Field label="Country">{p.country}</Field>
              <Field label="Website">{p.url}</Field>
              <Field label="Years attended">{p.years.join(", ")}</Field>
              <Field label="Affiliations">{p.affiliations.join(", ")}</Field>
              <Field label="Work">{[p.title, p.work, p.org].filter(Boolean).join(" · ")}</Field>
              <Field label="Description">{p.descr}</Field>
            </SimpleGrid>
          )}
      </Paper>
    </Stack>
  );
}

function PermissionsCard({ userId, active }: { userId: number; active: boolean }) {
  const { result, query } = useList<GrantOut>({
    resource: "grants", filters: [{ field: "user_id", operator: "eq", value: userId }],
    pagination: { mode: "off" },
  });
  return (
    <Stack gap="xs">
      <Group justify="space-between">
        <Title order={3}>Permissions in this app</Title>
        {active && (
          <Button component={Link} to={`/grants/create?user_id=${userId}`} variant="default" size="xs">
            Give a permission
          </Button>
        )}
      </Group>
      <Paper withBorder p="lg">
        {query.isLoading ? <Loader size="sm" /> : result.data.length === 0 ? (
          <Text c="dimmed">None: this person can't use the admin app.</Text>
        ) : (
          <Group gap="xs">
            {result.data.map((g) => <Badge key={g.id} variant="light">{labelFor(permissions, g.permission)}</Badge>)}
            <Anchor component={Link} to={`/grants?user_id=${userId}`} size="sm">Manage</Anchor>
          </Group>
        )}
      </Paper>
    </Stack>
  );
}

type Values = { username: string; email: string };

export function UserEdit() {
  const { id } = useParams();
  const { form, onSubmit, loading, saving, loadError } = useResourceForm<Values, UserSummary>({
    resource: RESOURCE, action: "edit", id, initialValues: { username: "", email: "" },
    fromRecord: (u) => ({ username: u.username, email: u.email }),
    toPayload: (v): AccountChange => ({ username: v.username.trim(), email: v.email.trim() }),
  });
  return (
    <FormPage title="Change username or email" backTo={`/${RESOURCE}/show/${id}`} backLabel="Back to the person"
              onSubmit={onSubmit} loading={loading} saving={saving} loadError={loadError}>
      <Text size="sm" c="dimmed">
        Saved in Okta first, then here. If Okta refuses (for example, the username is taken there),
        nothing changes and Okta's reason is shown. They log in with the new username from then on.
      </Text>
      <TextInput label="Username" required {...form.getInputProps("username")} />
      <TextInput label="Email" type="email" required {...form.getInputProps("email")} />
    </FormPage>
  );
}

export function UserPassword() {
  const { id } = useParams();
  const { result: user } = useOne<UserSummary>({ resource: RESOURCE, id });
  const form = useForm({
    mode: "controlled",
    initialValues: { password: "", confirm: "" },
    validate: {
      password: (v) => (v ? null : "Enter a password"),
      confirm: (v, values) => (v === values.password ? null : "The two don't match"),
    },
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const save = form.onSubmit(async ({ password }) => {
    setSaving(true);
    setError(null);
    const { error: problem, response } = await setUserPassword({ path: { user_id: Number(id) }, body: { password } });
    setSaving(false);
    if (problem !== undefined || !response?.ok) {
      const e = toHttpError(problem, response);
      if (e.errors?.password) form.setFieldError("password", String(e.errors.password));
      else setError(e.message);
      return;
    }
    form.reset();
    setDone(true);
  });

  return (
    <Stack maw={640}>
      <Anchor component={Link} to={`/${RESOURCE}/show/${id}`} size="sm">← Back to the person</Anchor>
      <Title order={2}>Set a new password{user ? `: ${fullName(user) || user.username}` : ""}</Title>
      <Paper withBorder p="lg">
        <form onSubmit={save} noValidate>
          <Stack>
            {done && <Alert color="bmpGreen" title="Password changed">Okta accepted it. Let the person know their new password.</Alert>}
            {error && <Alert color="bmpRed" title="Not changed">{error}</Alert>}
            <Text size="sm" c="dimmed">
              Sent to Okta only, never stored here. Okta checks it against its password rules.
            </Text>
            <PasswordInput label="New password" autoComplete="new-password" {...form.getInputProps("password")} />
            <PasswordInput label="New password again" autoComplete="new-password" {...form.getInputProps("confirm")} />
            <Group>
              <Button type="submit" loading={saving}>Set password</Button>
              <Button component={Link} to={`/${RESOURCE}/show/${id}`} variant="default">Back</Button>
            </Group>
          </Stack>
        </form>
      </Paper>
    </Stack>
  );
}
