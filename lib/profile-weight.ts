import type { UserProfile } from "@/lib/types"

export function syncProfileWeightFromDailyLog<T extends UserProfile>(
  profile: T,
  dailyWeight: number | undefined,
): T {
  if (
    typeof dailyWeight !== "number" ||
    !Number.isFinite(dailyWeight) ||
    dailyWeight <= 0 ||
    profile.weight === dailyWeight
  ) {
    return profile
  }

  return {
    ...profile,
    weight: dailyWeight,
  }
}
