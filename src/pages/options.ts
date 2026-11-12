// Choices shown in selects. The values are the API's own (src/api/generated/types.gen.ts);
// `satisfies` makes the build fail if the API's list changes and these don't.

import type { ContentBlockIn, EmbeddedFormIn, GrantIn, UserSummary, WidgetIn } from "../api/generated/types.gen";

type Option<V> = { value: V; label: string };

export const placements = [
  { value: "ud_participate", label: "Participate" },
  { value: "ud_tickets", label: "Tickets" },
  { value: "ud_volunteer", label: "Volunteer (retired)" },
  { value: "sidebar", label: "Sidebar" },
  { value: "nav_panel", label: "Navigation panel" },
] satisfies Option<WidgetIn["placement"]>[];

// Content blocks can also go on the portal's home page, which takes buttons only.
export const blockPlacements = [
  ...placements,
  { value: "homepage", label: "Homepage" },
] satisfies Option<ContentBlockIn["placement"]>[];

export const blockTypes = [
  { value: "html", label: "HTML block" },
  { value: "nav", label: "Navigation tile" },
  { value: "button", label: "Button" },
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

// What each permission lets someone do (identity/models.py in portal-api-v2). Each includes
// the ones below it.
export const permissions = [
  { value: "fuser", label: "Find people",
    description: "Search accounts and see the account summary: name, email, username, bpguid, status." },
  { value: "fuser_details", label: "Find people + see profiles",
    description: "Also see the whole profile, and change a person's username, email or password (in Okta too)." },
  { value: "staff_admin", label: "Staff admin",
    description: "Everything: content, forms and permissions, as well as all of the above." },
] satisfies (Option<GrantIn["permission"]> & { description: string })[];

export const userStatuses = [
  { value: "active", label: "Active" },
  { value: "flagged_for_deletion", label: "Flagged for deletion" },
  { value: "deactivated", label: "Deactivated" },
] satisfies Option<UserSummary["status"]>[];

// Who sees a content block on the portal. The portal never receives a block that isn't for
// the person looking (portal-api-v2 leaves it out of the answer).
export const audiences = [
  { value: "everyone", label: "Everyone" },
  { value: "visitors", label: "Visitors only (not logged in)" },
  { value: "logged_in", label: "Logged-in people only" },
] satisfies Option<NonNullable<ContentBlockIn["audience"]>>[];

export const yesNo = [
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

export const labelFor = (options: { value: string; label: string }[], value: unknown) =>
  options.find((o) => o.value === value)?.label ?? String(value ?? "");
