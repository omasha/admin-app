import { Link } from "react-router";
import { Anchor, Container, Text, Title } from "@mantine/core";

export function NotFound() {
  return (
    <Container size="sm" py="xl" ta="center">
      <Title order={2} mb="sm">Page not found</Title>
      <Text>
        We couldn't find that page. Head back{" "}
        <Anchor component={Link} to="/">home</Anchor>.
      </Text>
    </Container>
  );
}
