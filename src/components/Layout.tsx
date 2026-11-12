import { NavLink as RouterNavLink, Outlet } from "react-router";
import { CanAccess, useGetIdentity, useLogout } from "@refinedev/core";
import { AppShell, Badge, Button, Group, NavLink, Stack, Text, Title } from "@mantine/core";

type Identity = { name: string; email: string };

// The menu, in order. Each shows only to people allowed to list it; "/" opens the first one
// the person may use (pages/auth.tsx, StartPage).
export const sections = [
  { resource: "content-blocks", label: "Content blocks" },
  { resource: "widgets", label: "Widgets" },
  { resource: "embedded-forms", label: "Embedded forms" },
  { resource: "users", label: "People" },
  { resource: "grants", label: "Permissions" },
  { resource: "stats", label: "Statistics" },
];

export function Layout() {
  const { data: identity } = useGetIdentity<Identity>();
  const { mutate: logout } = useLogout();
  return (
    <AppShell header={{ height: 56 }} navbar={{ width: 220, breakpoint: "sm" }} padding="lg">
      <AppShell.Header px="md">
        <Group h="100%" justify="space-between">
          <Group gap="xs">
            <Title order={4}>Burner Profiles Admin</Title>
            <Badge variant="light" color="bmpOrange">prototype</Badge>
          </Group>
          <Group gap="sm">
            <Text size="sm">{identity?.name}</Text>
            <Button size="xs" variant="default" onClick={() => logout()}>Log out</Button>
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar p="xs">
        <Stack gap={2}>
          {sections.map((s) => (
            <CanAccess key={s.resource} resource={s.resource} action="list">
              <NavLink component={RouterNavLink} to={`/${s.resource}`} label={s.label} />
            </CanAccess>
          ))}
        </Stack>
      </AppShell.Navbar>
      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
