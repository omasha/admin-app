// Choices shown in selects. The values are the API's own (src/api/generated/types.gen.ts);
// `satisfies` makes the build fail if the API's list changes and these don't.

import type { ContentBlockIn, EmbeddedFormIn, WidgetIn } from "../api/generated/types.gen";

type Option<V> = { value: V; label: string };

export const placements = [
  { value: "ud_participate", label: "Participate" },
  { value: "ud_tickets", label: "Tickets" },
  { value: "ud_volunteer", label: "Volunteer (retired)" },
  { value: "sidebar", label: "Sidebar" },
  { value: "nav_panel", label: "Navigation panel" },
] satisfies Option<ContentBlockIn["placement"]>[];

export const blockTypes = [
  { value: "html", label: "HTML block" },
  { value: "nav", label: "Navigation tile" },
] satisfies Option<NonNullable<ContentBlockIn["block_type"]>>[];

export const widgetTypes = [
  { value: "html", label: "HTML" },
  { value: "allocator_access", label: "Allocator access (worked out per person)" },
] satisfies Option<WidgetIn["widget_type"]>[];

export const formSources = [
  { value: "surveygizmo", label: "Alchemer (SurveyGizmo)" },
  { value: "salesforce", label: "Salesforce" },
  { value: "link-only", label: "Link only (not embedded)" },
] satisfies Option<EmbeddedFormIn["source"]>[];

export const embedTypes = [
  { value: "iframe", label: "Frame (iframe)" },
  { value: "jsembed", label: "Script embed" },
] satisfies Option<NonNullable<EmbeddedFormIn["embed_type"]>>[];

export const yesNo = [
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

export const labelFor = (options: { value: string; label: string }[], value: unknown) =>
  options.find((o) => o.value === value)?.label ?? String(value ?? "");
