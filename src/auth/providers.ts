// Refine's auth and access-control providers (REFACTOR_PLAN §5.1).
//
//   authProvider:           login/logout/"is anyone logged in" with okta-auth-js (PKCE)
//   accessControlProvider:  "may this person do X on resource Y", from GET /v1/me
//
// The screens only use these to show or hide things. The API checks every route itself, so a
// hidden button is a convenience, never the protection.

import type { AccessControlProvider, AuthProvider, HttpError } from "@refinedev/core";
import { getMe } from "../api/generated/sdk.gen";
import type { CurrentUser as Me } from "../api/generated/types.gen";
import { toHttpError } from "../api/client";
import { getOktaAuth } from "./okta";

// Which permission each resource needs, for every action or per action. Anything not listed:
// nobody. /v1/me already lists the permissions each one includes (staff_admin includes all;
// fuser_details includes fuser), so a plain "is it in the list" is enough here.
type Needs = string | Record<string, string>;
export const resourcePermission: Record<string, Needs> = {
  "content-blocks": "staff_admin",
  widgets: "staff_admin",
  "embedded-forms": "staff_admin",
  users: { list: "fuser", show: "fuser", edit: "fuser_details" }, // edit: username, email, password (sent to Okta)
  "user-profiles": "fuser_details",
  grants: "staff_admin",
};

/** The permission `action` on `resource` needs, or undefined: nobody may. */
export function neededFor(resource: string, action: string): string | undefined {
  const needs = resourcePermission[resource];
  return typeof needs === "string" ? needs : needs?.[action];
}

export function allowed(permissions: readonly string[] | undefined, resource: string, action: string): boolean {
  const needed = neededFor(resource, action);
  return needed !== undefined && (permissions ?? []).includes(needed);
}

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
    // Okta only returns to an address listed exactly in the app's "Sign-out redirect URIs":
    // the bare origin (http://localhost:3100). The app then shows the login page by itself.
    // clearTokensBeforeRedirect: otherwise okta-auth-js only marks the saved login for removal
    // and the background service removes it later, after the app has already found it on the
    // way back from Okta and treated the (now cancelled) login as current.
    await getOktaAuth()?.signOut({ postLogoutRedirectUri: window.location.origin, clearTokensBeforeRedirect: true });
    return { success: true };
  },

  // Logged in = Okta has a saved login AND the API accepts it. A saved login the API refuses
  // (cancelled by logging out elsewhere, or run out) is forgotten, and the login page shown,
  // instead of the app carrying on with nothing allowed.
  check: async () => {
    const okta = getOktaAuth();
    if (!okta || !(await okta.isAuthenticated())) return { authenticated: false, redirectTo: "/login" };
    try {
      await loadMe();
    } catch (error) {
      if ((error as HttpError)?.statusCode === 401) {
        okta.tokenManager.clear();
        return { authenticated: false, redirectTo: "/login" };
      }
      // Any other problem (API down…): stay logged in; the pages show the error.
    }
    return { authenticated: true };
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
  can: async ({ resource, action }) => {
    if (!resource || !neededFor(resource, action)) return { can: false, reason: "Not available" };
    const me = await loadMe();
    return allowed(me.permissions, resource, action)
      ? { can: true }
      : { can: false, reason: "You don't have access to this." };
  },
  options: { buttons: { enableAccessControl: true, hideIfUnauthorized: true } },
};
