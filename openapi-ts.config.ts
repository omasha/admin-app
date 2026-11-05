// Generates src/api/generated from portal-api-v2's committed openapi.json (REFACTOR_PLAN §3).
// Run `npm run api:generate` after the backend's openapi.json changes. Don't edit the output.
import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: "../portal-api-v2/openapi.json",
  output: "src/api/generated",
  plugins: ["@hey-api/client-fetch", "@hey-api/typescript", "@hey-api/sdk"],
});
