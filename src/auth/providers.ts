// Refine's auth and access-control providers (REFACTOR_PLAN §5.1).
//
//   authProvider:           login/logout/"is anyone logged in" with okta-auth-js (PKCE)
//   accessControlProvider:  "may this person do X on resource Y", from GET /v1/me
//
// The screens only use these to show or hide things. The API checks every route itself, so a
// hidden button is a convenience, never the protection.

import type { AccessControlProvider, AuthProvider } from "@refinedev/core";
import { getMe } from "../api/generated/sdk.gen";
import type { CurrentUser as Me } from "../api/generated/types.gen";
import { toHttpError } from "../api/client";
import { getOktaAuth } from "./okta";

// Which grant (admin_grants.permission) each resource needs. Anything not listed: nobody.
export const resourcePermission: Record<string, string> = {
  "content-blocks": "staff_admin",
  widgets: "staff_admin",
  "embedded-forms": "staff_admin",
};

/** Only paths inside this app, and never the login pages themselves. */
export function safeReturnPath(to: string | null | undefined): string {
  if (!to || !to.startsWith("/") || to.startsWith("//") || to.startsWith("/login")) return "/";
  return to;
}

let mePromise: Promise<Me> | null = null;

export function loadMe(): Promise<Me> {
  mePromise ??= getMe().then(({ data, error, response }) => {
    if (error !== undefined || !data) {
      mePromise = null;
      throw toHttpError(error, response);
    }
    return data;
  });
  return mePromise;
}

export function forgetMe(): void {
  mePromise = null;
}

export const authProvider: AuthProvider = {
  // `to`: where to land after logging in (Refine puts it in /login?to=…). Never back on /login.
  login: async ({ to }: { to?: string | null } = {}) => {
    const okta = getOktaAuth();
    if (!okta) return { success: false, error: { name: "Okta", message: "Okta isn't configured (.env.local)." } };
    await okta.signInWithRedirect({ originalUri: safeReturnPath(to) });
    return { success: true };
  },

  logout: async () => {
    forgetMe();
    await getOktaAuth()?.signOut({ postLogoutRedirectUri: `${window.location.origin}/login` });
    return { success: true };
  },

  check: async () => {
    const okta = getOktaAuth();
    const authenticated = okta ? await okta.isAuthenticated() : false;
    return authenticated ? { authenticated: true } : { authenticated: false, redirectTo: "/login" };
  },

  // 401 from the API: the login has gone; log in again. 403 is "not allowed", not a logout.
  onError: async (error) => (error?.statusCode === 401 ? { logout: true, redirectTo: "/login" } : {}),

  getIdentity: async () => {
    const me = await loadMe();
    const name = me.account ? `${me.account.first_name} ${me.account.last_name}`.trim() : "";
    return { id: me.bpguid, name: name || me.username || me.bpguid, email: me.account?.email, account: me.account };
  },

  getPermissions: async () => (await loadMe()).permissions,
};

export const accessControlProvider: AccessControlProvider = {
  can: async ({ resource }) => {
    const needed = resource ? resourcePermission[resource] : undefined;
    if (!needed) return { can: false, reason: "Not available" };
    const me = await loadMe();
    return me.permissions.includes(needed)
      ? { can: true }
      : { can: false, reason: "You don't have access to this." };
  },
  options: { buttons: { enableAccessControl: true, hideIfUnauthorized: true } },
};
