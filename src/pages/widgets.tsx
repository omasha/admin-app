// Widgets (API_ENDPOINTS §3): list, add, edit.

import { useParams } from "react-router";
import { Alert, Group, NumberInput, Select, Switch, TextInput } from "@mantine/core";
import type { WidgetIn, WidgetOut } from "../api/generated/types.gen";
import { FormPage, orNull } from "../components/FormPage";
import { ResourceList } from "../components/ResourceList";
import { RichTextField } from "../components/RichTextField";
import { useResourceForm } from "../components/useResourceForm";
import { Published } from "./contentBlocks";
import { labelFor, placements, widgetTypes } from "./options";

const RESOURCE = "widgets";

export function WidgetList() {
  return (
    <ResourceList<WidgetOut>
      resource={RESOURCE}
      title="Widgets"
      searchPlaceholder="Title"
      rowLabel={(w) => w.title || `Widget ${w.id}`}
      filters={[
        { field: "placement", label: "Placement", options: placements },
        { field: "widget_type", label: "Type", options: widgetTypes },
      ]}
      columns={[
        { key: "title", label: "Title", sortable: true, render: (w) => w.title || <em>(no title)</em> },
        { key: "widget_type", label: "Type", render: (w) => labelFor(widgetTypes, w.widget_type) },
        { key: "placement", label: "Placement", sortable: true, render: (w) => labelFor(placements, w.placement) },
        { key: "sort_order", label: "Order", sortable: true },
        { key: "published", label: "Status", render: (w) => <Published value={w.published} /> },
      ]}
    />
  );
}

type Values = {
  widget_type: WidgetIn["widget_type"] | null;
  title: string;
  html: string;
  placement: WidgetIn["placement"] | null;
  sort_order: number;
  published: boolean;
};

const empty: Values = { widget_type: "html", title: "", html: "", placement: null, sort_order: 0, published: false };

const fromRecord = (w: WidgetOut): Values => ({
  widget_type: w.widget_type, title: w.title, html: w.html ?? "", placement: w.placement,
  sort_order: w.sort_order, published: w.published,
});

const toPayload = (v: Values): WidgetIn => ({
  widget_type: v.widget_type as WidgetIn["widget_type"], title: v.title,
  html: v.widget_type === "html" ? orNull(v.html) : null,
  placement: v.placement as WidgetIn["placement"], sort_order: v.sort_order, published: v.published,
});

export function WidgetForm({ action }: { action: "create" | "edit" }) {
  const { id } = useParams();
  const { form, onSubmit, loading, saving, loadError } = useResourceForm<Values, WidgetOut>({
    resource: RESOURCE, action, id, initialValues: empty, fromRecord, toPayload,
  });
  const v = form.getValues();

  return (
    <FormPage title={action === "create" ? "Add widget" : "Edit widget"} backTo={`/${RESOURCE}`} backLabel="Widgets"
              onSubmit={onSubmit} loading={loading} saving={saving} loadError={loadError}>
      <Group grow>
        <Select label="Type" required data={widgetTypes} allowDeselect={false} {...form.getInputProps("widget_type")} />
        <Select label="Placement" required data={placements} {...form.getInputProps("placement")} />
        <NumberInput label="Order" {...form.getInputProps("sort_order")} />
      </Group>
      <TextInput label="Title" {...form.getInputProps("title")} />
      {v.widget_type === "html" ? (
        <RichTextField label="Body" value={v.html} onChange={(html) => form.setFieldValue("html", html)}
                       error={form.errors.html as string | undefined} />
      ) : (
        <Alert color="bmpBlue">
          Its content is worked out for each person: group owners see links to their groups. (Prototype: the
          allocator's data isn't in this database yet, so the portal doesn't show it.)
        </Alert>
      )}
      <Switch label="Published" {...form.getInputProps("published", { type: "checkbox" })} />
    </FormPage>
  );
}
