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
      // localStorage: one login shared by every tab of the admin app, like the portal. It lasts
      // until logging out or the token runs out (24 hours), even if the browser is closed.
      tokenManager: { storage: "localStorage", autoRenew: true },
    });
    // Start okta-auth-js's background service, as the portal does (its AuthProvider): it renews
    // the login before it runs out.
    void instance.start();
  }
  return instance;
}

export function getAccessToken(): string | undefined {
  return getOktaAuth()?.getAccessToken();
}
