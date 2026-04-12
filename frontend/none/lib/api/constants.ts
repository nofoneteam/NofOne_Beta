export const API_PREFIX = "/api";

export const AUTH_TOKEN_STORAGE_KEY = "auth_access_token";
export const REFERRAL_CODE_STORAGE_KEY = "auth_referral_code";

export const API_ROUTES = {
  health: "/health",
  auth: {
    signupRequestOtp: `${API_PREFIX}/auth/signup/request-otp`,
    signupVerifyOtp: `${API_PREFIX}/auth/signup/verify-otp`,
    loginRequestOtp: `${API_PREFIX}/auth/login/request-otp`,
    loginVerifyOtp: `${API_PREFIX}/auth/login/verify-otp`,
    google: `${API_PREFIX}/auth/google`,
    phone: `${API_PREFIX}/auth/phone`,
    refresh: `${API_PREFIX}/auth/refresh`,
    logout: `${API_PREFIX}/auth/logout`,
    me: `${API_PREFIX}/auth/me`,
  },
  user: {
    profile: `${API_PREFIX}/user/profile`,
    profileAiSuggestion: `${API_PREFIX}/user/profile-ai-suggestion`,
    chatPreferences: `${API_PREFIX}/user/chat-preferences`,
    reports: `${API_PREFIX}/user/reports`,
  },
  logs: {
    base: `${API_PREFIX}/logs`,
    dashboard: `${API_PREFIX}/logs/dashboard`,
    progressReport: `${API_PREFIX}/logs/progress-report`,
    weightTracker: `${API_PREFIX}/logs/weight-tracker`,
    weeklySummary: `${API_PREFIX}/logs/weekly-summary`,
    weeklyReport: `${API_PREFIX}/logs/weekly-report`,
    shareReport: `${API_PREFIX}/logs/share-report`,
    sharedReport: `${API_PREFIX}/logs/shared`,
  },
  chat: {
    base: `${API_PREFIX}/chat`,
  },
  admin: {
    bootstrap: `${API_PREFIX}/admin/bootstrap`,
    updateUserRole: `${API_PREFIX}/admin/users`,
    chatConfig: `${API_PREFIX}/admin/chat-config`,
  },
} as const;

export const USER_ROLES = ["user", "admin"] as const;
export const AUTH_PROVIDERS = ["email", "phone", "google"] as const;
export const HEALTH_GOALS = [
  "loss",
  "gain",
  "maintain",
  "lose_weight",
  "gain_weight",
] as const;
export const ACTIVITY_LEVELS = [
  "sedentary",
  "light",
  "moderate",
  "active",
  "very_active",
] as const;
export const YES_NO_OPTIONS = ["yes", "no"] as const;
export const CHAT_MESSAGE_TYPES = ["text", "image", "audio"] as const;
export const SHARE_REPORT_PERIODS = ["weekly", "monthly", "custom"] as const;
export const CHAT_RESPONSE_SOURCES = [
  "session_cache",
  "shared_cache",
  "refusal",
  "model",
] as const;
