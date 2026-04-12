/**
 * Firebase Invisible reCAPTCHA v3 utilities
 * Provides token generation for bot protection without user interaction
 */

export async function getRecaptchaToken(action: string): Promise<string | null> {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    // Check if reCAPTCHA is available (window.grecaptcha is set by Firebase)
    if (!window.grecaptcha) {
      console.warn("reCAPTCHA not initialized");
      return null;
    }

    // Get the reCAPTCHA token from Firebase
    const token = await window.grecaptcha.execute("recaptcha", {
      action,
    });

    return token;
  } catch (error) {
    console.error("Failed to get reCAPTCHA token:", error);
    return null;
  }
}

/**
 * Initialize reCAPTCHA v3 in the head
 * This script should be added to your document head
 */
export function getRecaptchaScriptTag(siteKey: string): string {
  return `<script src="https://www.google.com/recaptcha/api.js?render=${siteKey}"></script>`;
}

/**
 * Alternative: Use Firebase's built-in reCAPTCHA
 * This will be automatically initialized when using Firebase Authentication
 */
export async function getFirebaseRecaptchaToken(action: string): Promise<string | null> {
  try {
    if (typeof window === "undefined") {
      return null;
    }

    // This works with Firebase's AppCheck which provides reCAPTCHA v3
    if (window.grecaptcha && window.grecaptcha.enterprise) {
      const token = await window.grecaptcha.enterprise.execute("recaptcha", {
        action,
      });
      return token;
    }

    return await getRecaptchaToken(action);
  } catch (error) {
    console.error("Failed to get Firebase reCAPTCHA token:", error);
    return null;
  }
}

/**
 * Get reCAPTCHA token with action name and fallback handling
 */
export async function executeRecaptcha(
  action: "signup" | "login" | "verify_otp" | "password_reset"
): Promise<string | null> {
  try {
    // Try to get Firebase's reCAPTCHA token first
    const token = await getFirebaseRecaptchaToken(action);
    return token;
  } catch (error) {
    console.warn(`reCAPTCHA token generation failed for action "${action}":`, error);
    return null;
  }
}

declare global {
  interface Window {
    grecaptcha?: {
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
      enterprise?: {
        execute: (siteKey: string, options: { action: string }) => Promise<string>;
      };
    };
  }
}
