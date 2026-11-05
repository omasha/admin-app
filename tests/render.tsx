import { render } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { App } from "../src/App";
import { forgetMe } from "../src/auth/providers";
import { theme } from "../src/theme";
import "../src/api/client";

export function renderAt(path: string) {
  forgetMe();
  window.history.pushState({}, "", path);
  return render(<MantineProvider theme={theme}><App /></MantineProvider>);
}
