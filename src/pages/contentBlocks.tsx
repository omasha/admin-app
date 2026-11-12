// Content blocks (API_ENDPOINTS §3): list, add, edit. The resource's whole UI.
//
// Three types: an HTML block, a navigation tile, and a button. A button is its text and
// where it goes, and lives on the Homepage placement: the portal's home page shows the
// published ones to logged-in people, in order, on its photo (the first one stands out).

import { Link, useParams } from "react-router";
import { Alert, Badge, Button, Group, NumberInput, Select, Switch, TextInput } from "@mantine/core";
import type { ContentBlockIn, ContentBlockOut } from "../api/generated/types.gen";
import { FormPage, orNull } from "../components/FormPage";
import { ResourceList } from "../components/ResourceList";
import { RichTextField } from "../components/RichTextField";
import { useResourceForm } from "../components/useResourceForm";
import { blockPlacements as placements, blockTypes, labelFor, yesNo } from "./options";

const RESOURCE = "content-blocks";

export function ContentBlockList() {
  return (
    <ResourceList<ContentBlockOut>
      resource={RESOURCE}
      title="Content blocks"
      searchPlaceholder="Title"
      rowLabel={(b) => b.title || `Block ${b.id}`}
      actions={<Button component={Link} to={`/${RESOURCE}/arrange`} variant="default">Arrange order</Button>}
      initialSort={[{ field: "placement", order: "asc" }, { field: "sort_order", order: "asc" }]}
      filters={[
        { field: "placement", label: "Placement", options: placements },
        { field: "block_type", label: "Type", options: blockTypes },
        { field: "published", label: "Published", options: yesNo },
      ]}
      columns={[
        { key: "title", label: "Title", sortable: true, render: (b) => b.title || <em>(no title)</em> },
        { key: "placement", label: "Placement", sortable: true, render: (b) => labelFor(placements, b.placement) },
        { key: "sort_order", label: "Order", sortable: true },
        { key: "block_type", label: "Type", render: (b) => labelFor(blockTypes, b.block_type) },
        { key: "published", label: "Status", render: (b) => <Published value={b.published} /> },
        { key: "updated_at", label: "Changed", sortable: true, render: (b) => new Date(b.updated_at + "Z").toLocaleString() },
      ]}
    />
  );
}

export function Published({ value }: { value: boolean }) {
  return value ? <Badge color="bmpGreen">Published</Badge> : <Badge color="gray" variant="light">Draft</Badge>;
}

type Values = {
  title: string;
  block_type: NonNullable<ContentBlockIn["block_type"]>;
  body: string;
  link: string;
  css_class: string;
  placement: ContentBlockIn["placement"] | null;
  sort_order: number;
  published: boolean;
};

const empty: Values = {
  title: "", block_type: "html", body: "", link: "", css_class: "", placement: null, sort_order: 0, published: false,
};

const fromRecord = (b: ContentBlockOut): Values => ({
  title: b.title ?? "", block_type: b.block_type, body: b.body ?? "", link: b.link ?? "", css_class: b.css_class ?? "",
  placement: b.placement, sort_order: b.sort_order, published: b.published,
});

const toPayload = (v: Values): ContentBlockIn => ({
  title: orNull(v.title), block_type: v.block_type, body: v.block_type === "button" ? null : orNull(v.body),
  link: v.block_type === "html" ? null : orNull(v.link), css_class: orNull(v.css_class),
  placement: v.placement as ContentBlockIn["placement"], sort_order: v.sort_order, published: v.published,
});

export function ContentBlockForm({ action }: { action: "create" | "edit" }) {
  const { id } = useParams();
  const { form, onSubmit, loading, saving, loadError } = useResourceForm<Values, ContentBlockOut>({
    resource: RESOURCE, action, id, initialValues: empty, fromRecord, toPayload,
  });
  const v = form.getValues();
  const isButton = v.block_type === "button";
  // A button goes on the home page, and the home page takes only buttons: picking one
  // sets the other, so the two never disagree (the API refuses them if they do).
  const setType = (type: string | null) => {
    if (!type) return;
    form.setFieldValue("block_type", type as Values["block_type"]);
    if (type === "button") form.setFieldValue("placement", "homepage");
    else if (v.placement === "homepage") form.setFieldValue("placement", null);
  };
  const setPlacement = (placement: string | null) => {
    form.setFieldValue("placement", placement as Values["placement"]);
    if (placement === "homepage") form.setFieldValue("block_type", "button");
    else if (isButton) form.setFieldValue("block_type", "html");
  };

  return (
    <FormPage title={action === "create" ? "Add content block" : "Edit content block"} backTo={`/${RESOURCE}`}
              backLabel="Content blocks" onSubmit={onSubmit} loading={loading} saving={saving} loadError={loadError}>
      <Group grow>
        <Select label="Type" data={blockTypes} allowDeselect={false} {...form.getInputProps("block_type")}
                onChange={setType} />
        <Select label="Placement" required data={placements} {...form.getInputProps("placement")}
                onChange={setPlacement} />
        <NumberInput label="Order" {...form.getInputProps("sort_order")} />
      </Group>
      {isButton && (
        <Alert color="bmpBlue">
          Shows on the portal's home page, on the photo, to people who are logged in. With several buttons, the
          first in order stands out and the others are outlined.
        </Alert>
      )}
      <TextInput label={isButton ? "Button text" : "Title"} required={isButton}
                 description={isButton ? "What the button says, for example: Go to Your Profile" : undefined}
                 {...form.getInputProps("title")} />
      {v.block_type === "nav" && (
        <TextInput label="Link" description="Where the tile goes: https://… or mailto:…" {...form.getInputProps("link")} />
      )}
      {isButton && (
        <TextInput label="Link" required
                   description="Where the button goes. A page in the portal: /my-profile. Anywhere else: https://… or mailto:…"
                   {...form.getInputProps("link")} />
      )}
      {!isButton && (
        <RichTextField label="Body" value={v.body} onChange={(html) => form.setFieldValue("body", html)}
                       error={form.errors.body as string | undefined} />
      )}
      <TextInput label="CSS class" description="Optional: a class the portal applies to the block"
                 {...form.getInputProps("css_class")} />
      <Switch label="Published" {...form.getInputProps("published", { type: "checkbox" })} />
    </FormPage>
  );
}
