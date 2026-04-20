"use client";

import { AUTH_TOKEN_STORAGE_KEY } from "@/lib/api/constants";

export const AUTH_LOGOUT_EVENT = "nofone:auth-logout";

export function getStoredAccessToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

export function persistAccessToken(accessToken: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, accessToken);
}

export function clearStoredAccessToken() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
}

export function logoutFrontend(options: { redirectTo?: string } = {}) {
  if (typeof window === "undefined") {
    return;
  }

  const redirectTo = options.redirectTo ?? "/";

  clearStoredAccessToken();
  window.dispatchEvent(new Event(AUTH_LOGOUT_EVENT));

  if (window.location.pathname !== redirectTo) {
    window.location.replace(redirectTo);
  }
}
