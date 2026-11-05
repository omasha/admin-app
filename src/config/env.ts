// Typed access to environment configuration. All values come from VITE_* variables (see
// .env.sample). This is the only file that reads import.meta.env.

export const env = {
  apiUrl: (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, ""),
  oktaIssuer: import.meta.env.VITE_OKTA_ISSUER as string | undefined,
  oktaClientId: import.meta.env.VITE_OKTA_CLIENT_ID as string | undefined,
  // Refresh tokens (POC_PLAN step 3, risk R11). Only turn on once the Okta app allows the
  // "Refresh Token" grant: otherwise Okta refuses the login.
  oktaRefreshTokens: import.meta.env.VITE_OKTA_REFRESH_TOKENS === "true",
};

export const isOktaConfigured = Boolean(env.oktaIssuer && env.oktaClientId);
