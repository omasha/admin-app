// Embedded forms (API_ENDPOINTS §4): list, add, edit. All of DB_SCHEMA §4's fields.

import { useParams } from "react-router";
import { Badge, Divider, Group, NumberInput, Select, Switch, Text, TextInput } from "@mantine/core";
import type { EmbeddedFormIn, EmbeddedFormOut } from "../api/generated/types.gen";
import { FormPage, orNull } from "../components/FormPage";
import { ResourceList } from "../components/ResourceList";
import { RichTextField } from "../components/RichTextField";
import { useResourceForm } from "../components/useResourceForm";
import { Published } from "./contentBlocks";
import { embedTypes, formSources, yesNo } from "./options";

const RESOURCE = "embedded-forms";

export function EmbeddedFormList() {
  return (
    <ResourceList<EmbeddedFormOut>
      resource={RESOURCE}
      title="Embedded forms"
      searchPlaceholder="Title or URL path"
      rowLabel={(f) => f.title}
      filters={[
        { field: "source", label: "Source", options: formSources },
        { field: "is_public", label: "Public", options: yesNo },
        { field: "published", label: "Published", options: yesNo },
      ]}
      columns={[
        { key: "title", label: "Title", sortable: true },
        { key: "url_path", label: "Address", render: (f) => f.url_path ? `/${f.is_public ? "public-form" : "form"}/${f.url_path}` : "—" },
        { key: "is_public", label: "Who", render: (f) => f.is_public ? <Badge variant="light">Public</Badge> : <Badge variant="light" color="bmpOrange">Logged in</Badge> },
        { key: "display_order", label: "Order", sortable: true, render: (f) => f.display_order ?? "—" },
        { key: "closes_at", label: "Closes", sortable: true, render: (f) => f.closes_at ? new Date(f.closes_at).toLocaleString() : "—" },
        { key: "published", label: "Status", render: (f) => <Published value={f.published} /> },
      ]}
    />
  );
}

type Values = {
  title: string;
  name_in_link: string;
  source: EmbeddedFormIn["source"] | null;
  embed_type: EmbeddedFormIn["embed_type"] | null;
  embed_url: string;
  url_path: string;
  profile_fields: string;
  is_public: boolean;
  instructions: string;
  sample_link: string;
  opens_at: string; // "YYYY-MM-DDTHH:mm", as the datetime-local input gives it
  opens_label: string;
  closes_at: string;
  closes_label: string;
  embed_closed: boolean;
  display_order: number | "";
  list_display: boolean;
  list_art_display: boolean;
  height: number | "";
  css_class: string;
  published: boolean;
};

const empty: Values = {
  title: "", name_in_link: "", source: "surveygizmo", embed_type: "iframe", embed_url: "", url_path: "",
  profile_fields: "", is_public: false, instructions: "", sample_link: "", opens_at: "", opens_label: "",
  closes_at: "", closes_label: "", embed_closed: false, display_order: "", list_display: false,
  list_art_display: false, height: "", css_class: "", published: false,
};

const toLocalInput = (iso: string | null) => (iso ? iso.slice(0, 16) : "");
const s = (value: string | null | undefined) => value ?? "";

const fromRecord = (f: EmbeddedFormOut): Values => ({
  title: f.title, name_in_link: s(f.name_in_link), source: f.source, embed_type: f.embed_type ?? null,
  embed_url: f.embed_url, url_path: s(f.url_path), profile_fields: s(f.profile_fields), is_public: f.is_public,
  instructions: s(f.instructions), sample_link: s(f.sample_link), opens_at: toLocalInput(f.opens_at ?? null),
  opens_label: s(f.opens_label), closes_at: toLocalInput(f.closes_at ?? null), closes_label: s(f.closes_label),
  embed_closed: f.embed_closed, display_order: f.display_order ?? "", list_display: f.list_display,
  list_art_display: f.list_art_display, height: f.height ?? "", css_class: s(f.css_class), published: f.published,
});

const num = (value: number | "") => (value === "" ? null : value);

const toPayload = (v: Values): EmbeddedFormIn => {
  const linkOnly = v.source === "link-only";
  return {
    title: v.title, name_in_link: orNull(v.name_in_link), source: v.source as EmbeddedFormIn["source"],
    embed_type: linkOnly ? null : v.embed_type, embed_url: v.embed_url, url_path: orNull(v.url_path),
    profile_fields: orNull(v.profile_fields), is_public: v.is_public, instructions: orNull(v.instructions),
    sample_link: orNull(v.sample_link), opens_at: orNull(v.opens_at), opens_label: orNull(v.opens_label),
    closes_at: orNull(v.closes_at), closes_label: orNull(v.closes_label), embed_closed: v.embed_closed,
    display_order: num(v.display_order), list_display: v.list_display, list_art_display: v.list_art_display,
    height: num(v.height), css_class: orNull(v.css_class), published: v.published,
  };
};

export function EmbeddedFormForm({ action }: { action: "create" | "edit" }) {
  const { id } = useParams();
  const { form, onSubmit, loading, saving, loadError } = useResourceForm<Values, EmbeddedFormOut>({
    resource: RESOURCE, action, id, initialValues: empty, fromRecord, toPayload,
  });
  const v = form.getValues();
  const linkOnly = v.source === "link-only";

  return (
    <FormPage title={action === "create" ? "Add embedded form" : "Edit embedded form"} backTo={`/${RESOURCE}`}
              backLabel="Embedded forms" onSubmit={onSubmit} loading={loading} saving={saving} loadError={loadError}>
      <TextInput label="Title" required {...form.getInputProps("title")} />
      <Group grow>
        <Select label="Source" required data={formSources} allowDeselect={false} {...form.getInputProps("source")} />
        {!linkOnly && <Select label="Embed type" required data={embedTypes} {...form.getInputProps("embed_type")} />}
      </Group>
      <TextInput label={linkOnly ? "Link" : "Embed address"} required description="https://…"
                 {...form.getInputProps("embed_url")} />
      <Group grow align="start">
        <TextInput label="URL path" required={!linkOnly}
                   description={v.url_path ? `Shown at /${v.is_public ? "public-form" : "form"}/${v.url_path}` : "Letters, digits, - and _"}
                   {...form.getInputProps("url_path")} />
        <TextInput label="Name in link" {...form.getInputProps("name_in_link")} />
      </Group>
      <Switch label="Public (no login needed)" {...form.getInputProps("is_public", { type: "checkbox" })} />
      <RichTextField label="Instructions" description="Shown above the form"
                     value={v.instructions} onChange={(html) => form.setFieldValue("instructions", html)}
                     error={form.errors.instructions as string | undefined} />

      <Divider label="Dates" labelPosition="left" />
      <Group grow align="start">
        <TextInput type="datetime-local" label="Opens" {...form.getInputProps("opens_at")} />
        <TextInput label="Opens (shown as)" placeholder="e.g. March 1 at noon PT" {...form.getInputProps("opens_label")} />
      </Group>
      <Group grow align="start">
        <TextInput type="datetime-local" label="Closes" {...form.getInputProps("closes_at")} />
        <TextInput label="Closes (shown as)" {...form.getInputProps("closes_label")} />
      </Group>
      <Switch label="Keep the form visible after it closes" {...form.getInputProps("embed_closed", { type: "checkbox" })} />
      <Text size="xs" c="dimmed">Prototype: times are stored as typed, with no time zone.</Text>

      <Divider label="Lists and display" labelPosition="left" />
      <Group>
        <Switch label="In the forms list" {...form.getInputProps("list_display", { type: "checkbox" })} />
        <Switch label="In the art forms list" {...form.getInputProps("list_art_display", { type: "checkbox" })} />
      </Group>
      <Group grow align="start">
        <NumberInput label="Order in lists" {...form.getInputProps("display_order")} />
        <NumberInput label="Frame height (px)" min={0} {...form.getInputProps("height")} />
        <TextInput label="CSS class" {...form.getInputProps("css_class")} />
      </Group>
      <TextInput label="Profile fields to pass in" description="Prefill, kept as today's comma-separated list"
                 {...form.getInputProps("profile_fields")} />
      <TextInput label="Sample link" description="https://… or mailto:…" {...form.getInputProps("sample_link")} />
      <Switch label="Published" {...form.getInputProps("published", { type: "checkbox" })} />
    </FormPage>
  );
}
