/**
 * API client with automatic reCAPTCHA token injection
 * Automatically adds reCAPTCHA tokens to sign-up and login requests
 */

import { executeRecaptcha } from "@/lib/recaptcha";

export interface ApiRequestConfig extends RequestInit {
  action?: "signup" | "login" | "verify_otp" | "password_reset";
  includeRecaptcha?: boolean;
}

/**
 * Enhanced fetch that automatically includes reCAPTCHA token
 */
export async function apiCall<T>(
  url: string,
  options: ApiRequestConfig = {}
): Promise<T> {
  const {
    action,
    includeRecaptcha = true,
    ...fetchOptions
  } = options;

  // Prepare request body
  let body = fetchOptions.body;

  // Add reCAPTCHA token if requested
  if (includeRecaptcha && action && fetchOptions.method !== "GET") {
    const recaptchaToken = await executeRecaptcha(action);

    if (recaptchaToken) {
      // Parse and add token to request body
      if (typeof body === "string") {
        const bodyObj = JSON.parse(body);
        bodyObj.recaptchaToken = recaptchaToken;
        body = JSON.stringify(bodyObj);
      } else if (body instanceof FormData) {
        body.append("recaptchaToken", recaptchaToken);
      } else {
        body = JSON.stringify({
          ...body,
          recaptchaToken,
        });
      }
    }
  }

  // Set content type if not already set
  const headers = new Headers(fetchOptions.headers || {});
  if (!headers.has("Content-Type") && body && typeof body === "string") {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...fetchOptions,
    body,
    headers,
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ message: response.statusText }));
    const error = new Error(
      errorData.message || `HTTP ${response.status}`
    ) as any;
    error.status = response.status;
    error.data = errorData;
    throw error;
  }

  return response.json();
}

/**
 * POST request with reCAPTCHA
 */
export function apiPost<T>(
  url: string,
  data?: Record<string, any>,
  config?: Omit<ApiRequestConfig, "method" | "body">
): Promise<T> {
  return apiCall<T>(url, {
    ...config,
    method: "POST",
    body: JSON.stringify(data || {}),
  });
}

/**
 * GET request
 */
export function apiGet<T>(
  url: string,
  config?: Omit<ApiRequestConfig, "method" | "body">
): Promise<T> {
  return apiCall<T>(url, {
    ...config,
    method: "GET",
  });
}

/**
 * PUT request with reCAPTCHA
 */
export function apiPut<T>(
  url: string,
  data?: Record<string, any>,
  config?: Omit<ApiRequestConfig, "method" | "body">
): Promise<T> {
  return apiCall<T>(url, {
    ...config,
    method: "PUT",
    body: JSON.stringify(data || {}),
  });
}

/**
 * PATCH request with reCAPTCHA
 */
export function apiPatch<T>(
  url: string,
  data?: Record<string, any>,
  config?: Omit<ApiRequestConfig, "method" | "body">
): Promise<T> {
  return apiCall<T>(url, {
    ...config,
    method: "PATCH",
    body: JSON.stringify(data || {}),
  });
}

/**
 * DELETE request
 */
export function apiDelete<T>(
  url: string,
  config?: Omit<ApiRequestConfig, "method" | "body">
): Promise<T> {
  return apiCall<T>(url, {
    ...config,
    method: "DELETE",
  });
}
