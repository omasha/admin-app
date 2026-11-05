import { OktaAuth } from "@okta/okta-auth-js";
import { env, isOktaConfigured } from "../config/env";

// One okta-auth-js instance for the whole app (PKCE login, token storage and renewal).
let instance: OktaAuth | null = null;

export function getOktaAuth(): OktaAuth | null {
  if (!isOktaConfigured) return null;
  if (!instance) {
    instance = new OktaAuth({
      issuer: env.oktaIssuer!,
      clientId: env.oktaClientId!,
      redirectUri: `${window.location.origin}/login/callback`,
      scopes: ["openid", "profile", "email", ...(env.oktaRefreshTokens ? ["offline_access"] : [])],
      pkce: true,
      // sessionStorage: tokens are cleared when the tab closes, so an admin login doesn't
      // linger on a shared computer.
      tokenManager: { storage: "sessionStorage", autoRenew: true },
    });
  }
  return instance;
}

export function getAccessToken(): string | undefined {
  return getOktaAuth()?.getAccessToken();
}
