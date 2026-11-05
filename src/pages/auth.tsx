// Login, the Okta callback, the start page and "no access".

import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router";
import { useLogin, usePermissions } from "@refinedev/core";
import { Alert, Button, Center, Code, Loader, Paper, Stack, Text, Title } from "@mantine/core";
import { isOktaConfigured } from "../config/env";
import { getOktaAuth } from "../auth/okta";
import { loadMe, safeReturnPath } from "../auth/providers";
import type { CurrentUser as Me } from "../api/generated/types.gen";

export function LoginPage() {
  const { mutate: login, isPending } = useLogin<{ to: string | null }>();
  const [params] = useSearchParams();
  const to = params.get("to");
  const [alreadyIn, setAlreadyIn] = useState<boolean | null>(null);
  useEffect(() => {
    const okta = getOktaAuth();
    if (!okta) return setAlreadyIn(false);
    okta.isAuthenticated().then(setAlreadyIn, () => setAlreadyIn(false));
  }, []);

  if (alreadyIn) return <Navigate to={safeReturnPath(to)} replace />;
  return (
    <Center h="100vh">
      <Paper withBorder p="xl" w={380}>
        <Stack>
          <Title order={3}>Burner Profiles Admin</Title>
          {isOktaConfigured ? (
            <Button onClick={() => login({ to })} loading={isPending || alreadyIn === null}>Log in with Okta</Button>
          ) : (
            <Alert color="bmpRed">Okta isn't set up: fill in .env.local (see .env.sample) and restart.</Alert>
          )}
        </Stack>
      </Paper>
    </Center>
  );
}

export function LoginCallback() {
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);
  useEffect(() => {
    // Okta's code can be used once. React runs this twice in development (StrictMode), so only
    // the first run uses it; a second would fail and flash an error just before leaving the page.
    if (started.current) return;
    started.current = true;
    const okta = getOktaAuth();
    if (!okta) return setError("Okta isn't set up: fill in .env.local (see .env.sample) and restart.");
    // Stores the tokens, then goes to the page the person started on.
    okta.handleLoginRedirect().catch((e: Error) => setError(e.message || String(e)));
  }, []);
  return (
    <Center h="100vh">
      {error ? (
        <Alert color="bmpRed" title="Login didn't work" maw={520}>
          <Stack gap="xs">
            <Text size="sm">{error}</Text>
            <Button component={Link} to="/login" size="xs" variant="default" w="fit-content">Try again</Button>
          </Stack>
        </Alert>
      ) : <Loader />}
    </Center>
  );
}

/** "/": the first section this person may use, or "no access". */
export function StartPage() {
  const { data: permissions, isLoading } = usePermissions<string[]>({});
  if (isLoading) return <Loader />;
  if (permissions?.includes("staff_admin")) return <Navigate to="/content-blocks" replace />;
  return <NoAccess />;
}

export function NoAccess() {
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => {
    loadMe().then(setMe, () => setMe(null));
  }, []);
  return (
    <Stack maw={640}>
      <Title order={2}>No access</Title>
      <Text>You're logged in, but you don't have permission to use this.</Text>
      {me && (
        <Alert color="bmpBlue" title="For whoever sets up access">
          {me.account
            ? <>Account #{me.account.id} ({me.account.email}) has: {me.permissions.join(", ") || "no permissions"}.</>
            : <>No account in this database has this login's bpguid ({me.bpguid}).</>}
          <br />
          Prototype: {me.account ? "grant access" : "add an account"} with{" "}
          <Code>{me.account
            ? `.venv/bin/python -m portal_api_v2.identity.cli grant ${me.account.email} staff_admin`
            : `.venv/bin/python -m portal_api_v2.identity.cli add-user <email> --bpguid ${me.bpguid} --grant staff_admin`}</Code>
        </Alert>
      )}
    </Stack>
  );
}
