import type { HealthProfileWithUser } from "@/types/domain";

export function isProfileComplete(profile: HealthProfileWithUser | null | undefined) {
  if (!profile) {
    return false;
  }

  return Boolean(
    profile.age != null &&
      profile.height != null &&
      profile.weight != null &&
      profile.activityLevel &&
      profile.goal,
  );
}
