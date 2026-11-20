// Systems that call the service API (SERVICE_API.md in the refactor docs): which Okta apps may
// look people up, and what each may do. Staff admins only.
//
// This only records the app in the API's own table. The Okta side (the app, its signing key and
// its policy) is made in Okta; switching a system off here cuts it off at once, even while its
// token lasts.

import { useState, type FormEvent, type ReactNode } from "react";
import { useParams } from "react-router";
import { useMutation } from "@tanstack/react-query";
import {
  Alert, Badge, Button, Checkbox, Code, Collapse, Group, Paper, SimpleGrid, Stack, Switch, Text, TextInput, Title,
} from "@mantine/core";
import { toHttpError } from "../api/client";
import { previewServiceLookup } from "../api/generated/sdk.gen";
import type { LookupPreview, ServiceClientIn, ServiceClientOut } from "../api/generated/types.gen";
import { FormPage } from "../components/FormPage";
import { ResourceList } from "../components/ResourceList";
import { useResourceForm } from "../components/useResourceForm";
import { labelFor, serviceScopes, yesNo } from "./options";

const RESOURCE = "service-clients";

export function ServiceClientList() {
  return (
    <ResourceList<ServiceClientOut>
      resource={RESOURCE}
      title="Systems with access"
      searchPlaceholder="Name or client ID"
      rowLabel={(c) => c.name}
      addLabel="Register a system"
      filters={[{ field: "active", label: "On", options: yesNo }]}
      columns={[
        { key: "name", label: "System", sortable: true },
        { key: "client_id", label: "Okta client ID", sortable: true, render: (c) => <Text span ff="monospace" size="sm">{c.client_id}</Text> },
        { key: "scopes", label: "May", render: (c) => c.scopes.map((s) => labelFor(serviceScopes, s)).join(", ") },
        { key: "active", label: "Status", render: (c) => (c.active ? <Badge color="bmpGreen">On</Badge> : <Badge color="gray" variant="light">Off</Badge>) },
        { key: "created_at", label: "Registered", sortable: true, render: (c) => new Date(c.created_at + "Z").toLocaleDateString() },
      ]}
    />
  );
}

type Values = { client_id: string; name: string; scopes: string[]; active: boolean };

const empty: Values = { client_id: "", name: "", scopes: serviceScopes.map((s) => s.value), active: true };

const fromRecord = (c: ServiceClientOut): Values => ({
  client_id: c.client_id, name: c.name, scopes: [...c.scopes], active: c.active,
});

export function ServiceClientForm({ action }: { action: "create" | "edit" }) {
  const { id } = useParams();
  const creating = action === "create";
  // The client ID is set once; an edit sends only what can change.
  const toPayload = (v: Values): ServiceClientIn | Omit<ServiceClientIn, "client_id"> => {
    const change = { name: v.name.trim(), scopes: v.scopes as ServiceClientIn["scopes"], active: v.active };
    return creating ? { client_id: v.client_id.trim(), ...change } : change;
  };
  const { form, onSubmit, loading, saving, loadError } = useResourceForm<Values, ServiceClientOut>({
    resource: RESOURCE, action, id, initialValues: empty, fromRecord, toPayload,
  });
  const v = form.getValues();

  return (
    <Stack maw={860} gap="xl">
    <FormPage title={creating ? "Register a system" : "Edit system"} backTo={`/${RESOURCE}`}
              backLabel="Systems with access" onSubmit={onSubmit} loading={loading} saving={saving} loadError={loadError}>
      {creating && (
        <Alert color="bmpBlue" title="Make the app in Okta first">
          Create an API Services app there (signed-key login, DPoP off, a policy for the scope), then paste its client ID here.
          Steps: SERVICE_API.md in the refactor docs.
        </Alert>
      )}
      <TextInput label="Okta client ID" required readOnly={!creating} disabled={!creating}
                 description={creating ? "The app's client ID in Okta (the token's “cid”). It can't be changed afterwards." : "Can't be changed. Register a new system instead."}
                 {...form.getInputProps("client_id")} />
      <TextInput label="Name" required description="What the logs call this system, e.g. Salesforce"
                 {...form.getInputProps("name")} />
      <Checkbox.Group label="May" required {...form.getInputProps("scopes")}>
        <Stack gap="xs" mt="xs">
          {serviceScopes.map((s) => <Checkbox key={s.value} value={s.value} label={s.label} description={s.description} />)}
        </Stack>
      </Checkbox.Group>
      <Switch label="On" description={v.active ? "This system can use the lookups." : "Cut off: every request from this system is refused, even with a valid token."}
              {...form.getInputProps("active", { type: "checkbox" })} />
    </FormPage>
    {!creating && id && !loadError && <TryIt id={id} name={v.name} />}
    </Stack>
  );
}

// ------------------------------------------------------------------ try it

const dash = (value: ReactNode) => (value === null || value === undefined || value === "" ? <Text span c="dimmed">—</Text> : value);

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Text size="xs" c="dimmed">{label}</Text>
      <Text size="sm">{dash(children)}</Text>
    </div>
  );
}

const accessNotice: Record<Exclude<LookupPreview["access"], "allowed">, string> = {
  switched_off: "This system is switched off, so a real request from it would be refused. This is what it would get if it were on.",
  no_scope: "This system hasn't been given the lookup permission, so a real request from it would be refused. This is what it would get with it.",
};

/** One box: an email (has an @) or a bpguid. Asks the API what this system would receive. */
function TryIt({ id, name }: { id: string; name: string }) {
  const [text, setText] = useState("");
  const [showJson, setShowJson] = useState(false);
  const lookup = useMutation<LookupPreview, Error, string>({
    mutationFn: async (value) => {
      const query = value.includes("@") ? { email: value } : { bpguid: value };
      const { data, error, response } = await previewServiceLookup({ path: { service_client_id: Number(id) }, query });
      if (error !== undefined || !data) throw toHttpError(error, response);
      return data;
    },
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (text.trim()) lookup.mutate(text.trim());
  };
  const person = lookup.data?.result;
  const p = person?.profile;

  return (
    <Paper withBorder p="lg">
      <Stack>
        <Title order={3}>Try a lookup</Title>
        <Text size="sm" c="dimmed">
          Enter an email or a bpguid to see exactly what {name || "this system"} would receive. This shows real personal data
          (the address fields are the ones Salesforce pulls); each lookup is logged with your account, not the email.
        </Text>
        <form onSubmit={submit} noValidate>
          <Group align="end">
            <TextInput label="Email or bpguid" value={text} onChange={(e) => setText(e.currentTarget.value)}
                       placeholder="person@example.org or 0A1B2C3D-…" style={{ flex: 1 }} />
            <Button type="submit" loading={lookup.isPending} disabled={!text.trim()}>Look up</Button>
          </Group>
        </form>
        {lookup.isError && <Alert color="bmpRed" title="No result">{lookup.error.message}</Alert>}
        {lookup.data && person && (
          <Stack>
            {lookup.data.access !== "allowed" && <Alert color="bmpOrange">{accessNotice[lookup.data.access]}</Alert>}
            <Title order={4}>Person</Title>
            <SimpleGrid cols={{ base: 1, sm: 3 }}>
              <Field label="Name">{`${person.first_name} ${person.last_name}`.trim()}</Field>
              <Field label="Username">{person.username}</Field>
              <Field label="Status">{person.status}</Field>
              <Field label="Email">{person.email}</Field>
              <Field label="bpguid">{person.bpguid}</Field>
            </SimpleGrid>
            {p ? (
              <>
                <Title order={4}>Address</Title>
                <SimpleGrid cols={{ base: 1, sm: 3 }}>
                  <Field label="Address line 1">{p.addr1}</Field>
                  <Field label="Address line 2">{p.addr2}</Field>
                  <Field label="City">{p.city}</Field>
                  <Field label="State">{p.state}</Field>
                  <Field label="ZIP">{p.zip}</Field>
                  <Field label="Country">{p.country}</Field>
                </SimpleGrid>
                <Title order={4}>Rest of the profile</Title>
                <SimpleGrid cols={{ base: 1, sm: 3 }}>
                  <Field label="Playa name">{p.playa_name}</Field>
                  <Field label="Phone">{p.phone}</Field>
                  <Field label="Website">{p.url}</Field>
                  <Field label="Work">{p.work}</Field>
                  <Field label="Organization">{p.org}</Field>
                  <Field label="Title">{p.title}</Field>
                  <Field label="Years attended">{p.years.join(", ")}</Field>
                  <Field label="Affiliations">{p.affiliations.join(", ")}</Field>
                  <Field label="Profile completed">{p.completed ? "Yes" : "No"}</Field>
                </SimpleGrid>
                <Field label="About">{p.descr}</Field>
              </>
            ) : (
              <Alert color="bmpBlue">This person hasn't filled in a profile yet, so there is no address to pull.</Alert>
            )}
            <div>
              <Button variant="subtle" size="xs" onClick={() => setShowJson((x) => !x)}>
                {showJson ? "Hide" : "Show"} the answer exactly as the system gets it
              </Button>
              <Collapse in={showJson}>
                <Code block mt="xs">{JSON.stringify(lookup.data.result, null, 2)}</Code>
              </Collapse>
            </div>
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}
