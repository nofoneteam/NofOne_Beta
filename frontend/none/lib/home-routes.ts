export const HOME_SECTION_ROUTES = {
  home: "/home",
  daily: "/home/daily-goals",
  weekly: "/home/weekly-summary",
  weight: "/home/weight-tracker",
  profile: "/home/profile",
  reminders: "/home/reminders",
  referral: "/home/referral-code",
  terms: "/home/terms-privacy",
  support: "/home/feedback-support",
  settings: "/home/settings",
} as const;

export type HomeSectionKey = keyof typeof HOME_SECTION_ROUTES;

export function getHomeSectionFromPath(pathname: string): HomeSectionKey {
  const normalized = pathname.replace(/\/+$/, "") || "/home";

  switch (normalized) {
    case "/home/daily-goals":
      return "daily";
    case "/home/weekly-summary":
      return "weekly";
    case "/home/weight-tracker":
      return "weight";
    case "/home/profile":
      return "profile";
    case "/home/reminders":
      return "reminders";
    case "/home/referral-code":
      return "referral";
    case "/home/terms-privacy":
      return "terms";
    case "/home/feedback-support":
      return "support";
    case "/home/settings":
      return "settings";
    case "/home":
    default:
      return "home";
  }
}
