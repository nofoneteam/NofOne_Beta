import { env } from "@/lib/config/env";
import { API_ROUTES } from "@/lib/api/constants";
import { logoutFrontend, persistAccessToken } from "@/lib/auth/session";
import type { ApiErrorResponse, ApiFetchOptions, ApiSuccessResponse } from "@/types/api";

class ApiRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

let refreshSessionPromise: Promise<string | null> | null = null;

function buildUrl(
  path: string,
  query?: ApiFetchOptions["query"],
): string {
  const url = new URL(path, env.apiBaseUrl);

  if (query) {
    for (const [key, value] of Object.entries(query as Record<string, unknown>)) {
      if (value === undefined || value === null || value === "") {
        continue;
      }

      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

function isBodyInit(value: ApiFetchOptions["body"]): value is BodyInit {
  return (
    value instanceof FormData ||
    value instanceof URLSearchParams ||
    value instanceof Blob ||
    typeof value === "string" ||
    value instanceof ArrayBuffer ||
    ArrayBuffer.isView(value)
  );
}

async function parseResponse<T>(
  response: Response,
): Promise<ApiSuccessResponse<T>> {
  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const payload = isJson
    ? ((await response.json()) as ApiSuccessResponse<T> | ApiErrorResponse)
    : null;

  if (!response.ok) {
    const error = payload && "message" in payload
      ? payload
      : {
          success: false as const,
          message: response.statusText || "Request failed",
        };

    throw new ApiRequestError(error.message || "Request failed", response.status);
  }

  if (!payload || !("success" in payload) || !payload.success) {
    throw new Error("API returned an invalid success response");
  }

  return payload;
}

async function executeRequest<T>(
  path: string,
  options: ApiFetchOptions,
): Promise<ApiSuccessResponse<T>> {
  const { body, token, cookie, query, headers, ...init } = options;
  const requestHeaders = new Headers(headers);
  let requestBody: BodyInit | undefined;

  if (body != null) {
    if (isBodyInit(body)) {
      requestBody = body;
    } else {
      requestHeaders.set("Content-Type", "application/json");
      requestBody = JSON.stringify(body);
    }
  }

  if (token) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  if (cookie) {
    requestHeaders.set("Cookie", cookie);
  }

  const response = await fetch(buildUrl(path, query), {
    ...init,
    body: requestBody,
    headers: requestHeaders,
    credentials: init.credentials ?? "include",
  });

  return parseResponse<T>(response);
}

async function refreshAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") {
    return null;
  }

  if (!refreshSessionPromise) {
    refreshSessionPromise = (async () => {
      try {
        const response = await executeRequest<{ accessToken: string }>(
          API_ROUTES.auth.refresh,
          {
            method: "POST",
            body: {},
          },
        );

        const nextAccessToken = response.data.accessToken;

        if (!nextAccessToken) {
          logoutFrontend();
          return null;
        }

        persistAccessToken(nextAccessToken);
        return nextAccessToken;
      } catch {
        logoutFrontend();
        return null;
      } finally {
        refreshSessionPromise = null;
      }
    })();
  }

  return refreshSessionPromise;
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<ApiSuccessResponse<T>> {
  try {
    return await executeRequest<T>(path, options);
  } catch (error) {
    const canRefresh =
      error instanceof ApiRequestError &&
      error.status === 401 &&
      Boolean(options.token) &&
      path !== API_ROUTES.auth.refresh &&
      path !== API_ROUTES.auth.logout;

    if (!canRefresh) {
      throw error;
    }

    const nextAccessToken = await refreshAccessToken();

    if (!nextAccessToken) {
      throw new ApiRequestError("Session expired. Please sign in again.", 401);
    }

    return executeRequest<T>(path, {
      ...options,
      token: nextAccessToken,
    });
  }
}
