// Arrange: put one placement's content blocks in order by dragging them (or with the ↑ ↓
// buttons, or the keyboard: Tab to a handle, Space to pick up, arrows to move, Space to drop).
//
// Nothing is saved until "Save order". Saving sends every block in the placement, first to
// last, to PUT /v1/admin/content-blocks/order, which renumbers them 1, 2, 3… all at once. If
// someone else added or removed a block in the meantime, the API refuses and the page reloads.

import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useInvalidate, useList, useNotification } from "@refinedev/core";
import {
  DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ActionIcon, Alert, Anchor, Badge, Button, Group, Loader, Paper, Select, Stack, Text, Title,
} from "@mantine/core";
import { reorderContentBlocks } from "../api/generated/sdk.gen";
import type { ContentBlockOut } from "../api/generated/types.gen";
import { toHttpError } from "../api/client";
import { Published } from "./contentBlocks";
import { blockPlacements as placements, blockTypes, labelFor } from "./options";

const RESOURCE = "content-blocks";
type Placement = ContentBlockOut["placement"];

export function ArrangeBlocks() {
  const [params, setParams] = useSearchParams();
  const placement = (params.get("placement") as Placement | null) ?? null;

  return (
    <Stack maw={760}>
      <Anchor component={Link} to={`/${RESOURCE}`} size="sm">← Content blocks</Anchor>
      <Title order={2}>Arrange content blocks</Title>
      <Text c="dimmed" size="sm">
        Blocks show on the portal in this order, within their placement. Drag them by the handle, or use the arrows.
      </Text>
      <Select label="Placement" data={placements} placeholder="Pick a placement" w={260} value={placement}
              allowDeselect={false}
              onChange={(value) => value && setParams({ placement: value }, { replace: true })} />
      {placement && <Arranger key={placement} placement={placement} />}
    </Stack>
  );
}

function Arranger({ placement }: { placement: Placement }) {
  const invalidate = useInvalidate();
  const { open } = useNotification();
  const { result, query } = useList<ContentBlockOut>({
    resource: RESOURCE,
    filters: [{ field: "placement", operator: "eq", value: placement }],
    sorters: [{ field: "sort_order", order: "asc" }, { field: "id", order: "asc" }],
    pagination: { currentPage: 1, pageSize: 100 },
  });
  const loaded = result.data;

  const [order, setOrder] = useState<ContentBlockOut[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Show the list as loaded whenever a new answer arrives (not on every redraw).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setOrder(loaded), [query.dataUpdatedAt]);

  const changed = useMemo(
    () => order.map((b) => b.id).join() !== loaded.map((b) => b.id).join()
      || order.some((b, i) => b.sort_order !== i + 1), // ties or gaps get renumbered too
    [order, loaded],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length) return;
    setOrder((current) => arrayMove(current, from, to));
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = order.findIndex((b) => b.id === active.id);
    const to = order.findIndex((b) => b.id === over.id);
    move(from, to);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    const { error: problem, response } = await reorderContentBlocks({
      body: { placement, ids: order.map((b) => b.id) },
    });
    setSaving(false);
    if (problem !== undefined || !response?.ok) {
      const httpError = toHttpError(problem, response);
      setError(httpError.message);
      if (httpError.statusCode === 409) await query.refetch(); // someone else changed the placement
      return;
    }
    open?.({ type: "success", message: "Order saved" });
    await invalidate({ resource: RESOURCE, invalidates: ["list"] });
  };

  if (query.isLoading) return <Loader />;
  if (query.isError) return <Alert color="bmpRed" title="Couldn't load the blocks">{query.error?.message}</Alert>;
  if (loaded.length === 0) return <Text>No blocks in this placement.</Text>;

  const total = result.total ?? loaded.length;
  return (
    <Stack>
      {total > loaded.length && (
        <Alert color="bmpYellow">This placement has {total} blocks; only the first {loaded.length} can be arranged here.</Alert>
      )}
      {error && <Alert color="bmpRed" title="The order wasn't saved">{error}</Alert>}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={order.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          <Stack gap={6} role="list" aria-label="Blocks in display order">
            {order.map((block, index) => (
              <SortableRow key={block.id} block={block} position={index + 1}
                           onUp={index > 0 ? () => move(index, index - 1) : undefined}
                           onDown={index < order.length - 1 ? () => move(index, index + 1) : undefined} />
            ))}
          </Stack>
        </SortableContext>
      </DndContext>
      <Group>
        <Button onClick={save} loading={saving} disabled={!changed}>Save order</Button>
        <Button variant="default" disabled={!changed || saving} onClick={() => { setOrder(loaded); setError(null); }}>
          Undo changes
        </Button>
        {changed && <Text size="sm" c="dimmed">Not saved yet</Text>}
      </Group>
    </Stack>
  );
}

function SortableRow({ block, position, onUp, onDown }: {
  block: ContentBlockOut; position: number; onUp?: () => void; onDown?: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id });
  const title = block.title || `Block ${block.id}`;
  return (
    <Paper ref={setNodeRef} withBorder p="sm" role="listitem"
           style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1,
                    background: isDragging ? "var(--bmp-bg-surface)" : undefined, zIndex: isDragging ? 1 : undefined }}>
      <Group justify="space-between" wrap="nowrap">
        <Group gap="sm" wrap="nowrap">
          <ActionIcon ref={setActivatorNodeRef} variant="subtle" color="gray" aria-label={`Drag ${title}`}
                      style={{ cursor: "grab", touchAction: "none" }} {...attributes} {...listeners}>
            ⠿
          </ActionIcon>
          <Text w={24} c="dimmed" ta="right">{position}</Text>
          <Text fw={600}>{title}</Text>
          <Badge variant="light" color="gray">{labelFor(blockTypes, block.block_type)}</Badge>
          <Published value={block.published} />
        </Group>
        <Group gap={4} wrap="nowrap">
          <ActionIcon variant="default" aria-label={`Move ${title} up`} disabled={!onUp} onClick={onUp}>↑</ActionIcon>
          <ActionIcon variant="default" aria-label={`Move ${title} down`} disabled={!onDown} onClick={onDown}>↓</ActionIcon>
        </Group>
      </Group>
    </Paper>
  );
}
