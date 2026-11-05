import type { FormEvent, ReactNode } from "react";
import { Link } from "react-router";
import { Alert, Anchor, Button, Group, LoadingOverlay, Paper, Stack, Title } from "@mantine/core";

type Props = {
  title: string;
  backTo: string;
  backLabel: string;
  onSubmit: (event?: FormEvent<HTMLFormElement>) => void;
  loading: boolean;
  saving: boolean;
  loadError?: { message: string } | null;
  children: ReactNode;
};

export function FormPage({ title, backTo, backLabel, onSubmit, loading, saving, loadError, children }: Props) {
  return (
    <Stack maw={860}>
      <Anchor component={Link} to={backTo} size="sm">← {backLabel}</Anchor>
      <Title order={2}>{title}</Title>
      {loadError ? (
        <Alert color="bmpRed" title="Couldn't load this">{loadError.message}</Alert>
      ) : (
        <Paper withBorder p="lg" pos="relative">
          <LoadingOverlay visible={loading && !saving} />
          <form onSubmit={onSubmit} noValidate>
            <Stack>
              {children}
              <Group>
                <Button type="submit" loading={saving}>Save</Button>
                <Button component={Link} to={backTo} variant="default">Cancel</Button>
              </Group>
            </Stack>
          </form>
        </Paper>
      )}
    </Stack>
  );
}

/** "" → null, so optional text fields left empty are sent as "no value". */
export const orNull = (value: string | null | undefined) => (value === undefined || value === null || value.trim() === "" ? null : value);
