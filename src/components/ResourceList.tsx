// One list screen for every resource: search, filters, sortable columns, paging, edit and
// delete. Refine's useTable does the data work through the data provider; this file is only
// the Mantine 8 screen around it (Refine's own Mantine screens need Mantine 5, so they aren't used).

import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { useDelete, useTable, type BaseRecord, type CrudSort } from "@refinedev/core";
import {
  ActionIcon, Alert, Anchor, Button, Group, Pagination, Popover, Select, Stack, Table, Text, TextInput, Title,
  UnstyledButton,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";

export type Column<T> = {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => ReactNode;
};

export type FilterDef = {
  field: string;
  label: string;
  options: { value: string; label: string }[];
};

type Props<T> = {
  resource: string;
  title: string;
  columns: Column<T>[];
  filters?: FilterDef[];
  searchPlaceholder?: string;
  initialSort?: CrudSort[];
  rowLabel: (row: T) => string;
  actions?: ReactNode; // extra buttons next to "Add"
};

export function ResourceList<T extends BaseRecord>({
  resource, title, columns, filters = [], searchPlaceholder = "Search", initialSort = [], rowLabel, actions,
}: Props<T>) {
  const table = useTable<T>({
    resource,
    pagination: { pageSize: 25 },
    sorters: { initial: initialSort },
    syncWithLocation: true,
  });
  const { tableQuery, result, currentPage, setCurrentPage, pageCount, sorters, setSorters, setFilters } = table;

  const [search, setSearch] = useState(() => String(table.filters.find((f) => "field" in f && f.field === "q")?.value ?? ""));
  const [debounced] = useDebouncedValue(search, 300);
  useEffect(() => {
    setFilters([{ field: "q", operator: "contains", value: debounced || undefined }], "merge");
  }, [debounced, setFilters]);

  const filterValue = (field: string) => {
    const found = table.filters.find((f) => "field" in f && f.field === field);
    return found?.value === undefined || found.value === null ? null : String(found.value);
  };

  const sortOrder = (field: string) => sorters.find((s) => s.field === field)?.order;
  const toggleSort = (field: string) => {
    const order = sortOrder(field);
    setSorters(order === "asc" ? [{ field, order: "desc" }] : order === "desc" ? [] : [{ field, order: "asc" }]);
  };

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>{title}</Title>
        <Group gap="xs">
          {actions}
          <Button component={Link} to={`/${resource}/create`}>Add</Button>
        </Group>
      </Group>

      <Group align="end">
        <TextInput label="Search" placeholder={searchPlaceholder} value={search}
                   onChange={(e) => setSearch(e.currentTarget.value)} w={260} />
        {filters.map((f) => (
          <Select key={f.field} label={f.label} data={f.options} clearable placeholder="All" w={180}
                  value={filterValue(f.field)}
                  onChange={(value) => setFilters([{ field: f.field, operator: "eq", value: value ?? undefined }], "merge")} />
        ))}
      </Group>

      {tableQuery.isError && (
        <Alert color="bmpRed" title="Couldn't load the list">{tableQuery.error?.message}</Alert>
      )}

      <Table striped highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            {columns.map((c) => (
              <Table.Th key={c.key} aria-sort={sortOrder(c.key) === "asc" ? "ascending" : sortOrder(c.key) === "desc" ? "descending" : undefined}>
                {c.sortable ? (
                  <UnstyledButton onClick={() => toggleSort(c.key)} fw={700}>
                    {c.label} {sortOrder(c.key) === "asc" ? "▲" : sortOrder(c.key) === "desc" ? "▼" : ""}
                  </UnstyledButton>
                ) : c.label}
              </Table.Th>
            ))}
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {result.data.map((row) => (
            <Table.Tr key={String(row.id)}>
              {columns.map((c, i) => (
                <Table.Td key={c.key}>
                  {i === 0 ? (
                    <Anchor component={Link} to={`/${resource}/edit/${row.id}`}>
                      {c.render ? c.render(row) : String(row[c.key] ?? "")}
                    </Anchor>
                  ) : c.render ? c.render(row) : String(row[c.key] ?? "")}
                </Table.Td>
              ))}
              <Table.Td w={1}>
                <DeleteButton resource={resource} id={row.id!} label={rowLabel(row)} />
              </Table.Td>
            </Table.Tr>
          ))}
          {!tableQuery.isLoading && result.data.length === 0 && (
            <Table.Tr><Table.Td colSpan={columns.length + 1}><Text c="dimmed">Nothing found.</Text></Table.Td></Table.Tr>
          )}
        </Table.Tbody>
      </Table>

      <Group justify="space-between">
        <Text size="sm" c="dimmed">{result.total ?? 0} in all</Text>
        {pageCount > 1 && <Pagination total={pageCount} value={currentPage} onChange={setCurrentPage} />}
      </Group>
    </Stack>
  );
}

function DeleteButton({ resource, id, label }: { resource: string; id: string | number; label: string }) {
  const { mutate, mutation } = useDelete();
  const [open, setOpen] = useState(false);
  return (
    <Popover opened={open} onChange={setOpen} position="left" withArrow>
      <Popover.Target>
        <ActionIcon variant="subtle" color="bmpRed" aria-label={`Delete ${label}`} onClick={() => setOpen((o) => !o)}>
          ✕
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown>
        <Text size="sm" mb="xs">Delete “{label}”?</Text>
        <Group gap="xs">
          <Button size="xs" color="bmpRed" loading={mutation.isPending}
                  onClick={() => mutate({ resource, id }, { onSettled: () => setOpen(false) })}>
            Delete
          </Button>
          <Button size="xs" variant="default" onClick={() => setOpen(false)}>Cancel</Button>
        </Group>
      </Popover.Dropdown>
    </Popover>
  );
}
