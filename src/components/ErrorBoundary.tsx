import { Component, type ErrorInfo, type ReactNode } from "react";
import { Alert, Anchor, Button, Container, Group, Text, Title } from "@mantine/core";

// The "something went wrong" screen. Plain <a href> rather than a router Link so it also
// works for the outermost boundary, which sits outside the router.
export function ErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <Container size="sm" py="xl">
      <Title order={2} mb="sm">Something went wrong</Title>
      <Text mb="md">
        This page hit an unexpected problem. You can try again, or head back{" "}
        <Anchor href="/">home</Anchor>.
      </Text>
      {/* The raw error text is for developers; people just see the sentence above. */}
      {import.meta.env.DEV ? (
        <Alert color="bmpRed" title="Error details (dev only)" role="alert">{error.message}</Alert>
      ) : null}
      <Group mt="md">
        <Button onClick={reset}>Try again</Button>
      </Group>
    </Container>
  );
}

type Props = { children: ReactNode; resetKey?: unknown };
type State = { error: Error | null };

// Catches errors thrown while rendering anything below it, so a crash shows ErrorFallback
// instead of a blank page. When `resetKey` changes (the layout passes the current path),
// the error clears, so moving to another page works without a reload.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Screen crashed:", error, info.componentStack);
  }

  componentDidUpdate(prev: Props): void {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.reset();
  }

  reset = () => this.setState({ error: null });

  render() {
    return this.state.error ? <ErrorFallback error={this.state.error} reset={this.reset} /> : this.props.children;
  }
}
