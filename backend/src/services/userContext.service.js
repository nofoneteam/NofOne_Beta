const DailyLogModel = require("../models/dailyLog.model");
const HealthProfileModel = require("../models/healthProfile.model");
const UserModel = require("../models/user.model");
const env = require("../config/env");
const {
  getFirestore,
  serializeDocument,
} = require("../utils/firestore");
const { getRedisClient } = require("../utils/redis");

function getUserContextCacheKey(userId) {
  return `${env.redis.keyPrefix}:chat:user-context:${userId}`;
}

function compactProfile(profile, user) {
  if (!profile && !user) {
    return "";
  }

  const parts = [];

  if (user?.name) {
    parts.push(`name=${user.name}`);
  }

  if (profile?.height != null) {
    parts.push(`height=${profile.height}`);
  }

  if (profile?.weight != null) {
    parts.push(`weight=${profile.weight}`);
  }

  if (profile?.targetWeight != null) {
    parts.push(`targetWeight=${profile.targetWeight}`);
  }

  if (profile?.age != null) {
    parts.push(`age=${profile.age}`);
  }

  if (profile?.gender) {
    parts.push(`gender=${profile.gender}`);
  }

  if (profile?.bmi != null) {
    parts.push(`bmi=${profile.bmi}`);
  }

  if (profile?.bmiCategory) {
    parts.push(`bmiCategory=${profile.bmiCategory}`);
  }

  if (profile?.goal) {
    parts.push(`goal=${profile.goal}`);
  }

  if (profile?.activityLevel) {
    parts.push(`activity=${profile.activityLevel}`);
  }

  if (profile?.dietType) {
    parts.push(`diet=${profile.dietType}`);
  }

  if (profile?.location) {
    parts.push(`location=${profile.location}`);
  }

  if (profile?.city) {
    parts.push(`city=${profile.city}`);
  }

  if (profile?.ethnicityCuisine) {
    parts.push(`cuisine=${profile.ethnicityCuisine}`);
  }

  if (profile?.diabetes) {
    parts.push(`diabetes=${profile.diabetes}`);
  }

  if (profile?.hypertension) {
    parts.push(`hypertension=${profile.hypertension}`);
  }

  if (profile?.cholesterol) {
    parts.push(`cholesterol=${profile.cholesterol}`);
  }

  if (profile?.cancerSurvivor) {
    parts.push(`cancerSurvivor=${profile.cancerSurvivor}`);
  }

  if (profile?.hrt) {
    parts.push(`hrt=${profile.hrt}`);
  }

  if (profile?.otherConditions) {
    parts.push(`other=${profile.otherConditions}`);
  }

  if (Array.isArray(profile?.allergies) && profile.allergies.length > 0) {
    parts.push(`allergies=${profile.allergies.join("/")}`);
  }

  if (Array.isArray(profile?.foodDislikes) && profile.foodDislikes.length > 0) {
    parts.push(`dislikes=${profile.foodDislikes.join("/")}`);
  }

  if (Array.isArray(profile?.aiNotes) && profile.aiNotes.length > 0) {
    parts.push(`notes=${profile.aiNotes.slice(0, 3).join(" | ")}`);
  }

  return parts.length > 0 ? `Profile: ${parts.join(", ")}` : "";
}

function compactLogs(logs) {
  if (!logs.length) {
    return "";
  }

  const summarizedLogs = logs.slice(0, env.chatContext.userLogLimit).map((log) => {
    const date = String(log.date || "").slice(0, 10);
    return [
      date,
      `cal=${log.calories ?? 0}`,
      `p=${log.protein ?? 0}`,
      `c=${log.carbs ?? 0}`,
      `f=${log.fat ?? 0}`,
      `water=${log.waterIntake ?? 0}`,
      `sleep=${log.sleepHours ?? 0}`,
      `move=${log.exerciseMinutes ?? 0}`,
      `ex=${log.exerciseCalories ?? 0}`,
      `wt=${log.weight ?? "-"}`,
    ].join(" ");
  });

  return `Logs: ${summarizedLogs.join(" | ")}`;
}

function buildUserContextSummary({ user, profile, logs }) {
  return [compactProfile(profile, user), compactLogs(logs)].filter(Boolean).join("\n");
}

function buildRecentLogDocumentIds(userId) {
  const ids = [];
  const cursor = new Date();

  for (
    let offset = 0;
    offset < env.chatContext.userLogLookbackDays &&
    ids.length < env.chatContext.userLogLookbackDays;
    offset += 1
  ) {
    const date = new Date(cursor);
    date.setUTCDate(cursor.getUTCDate() - offset);
    const isoDate = date.toISOString().slice(0, 10);
    ids.push(`${userId}_${isoDate}`);
  }

  return ids;
}

async function fetchRecentLogs(userId) {
  const db = getFirestore();
  const ids = buildRecentLogDocumentIds(userId);
  const refs = ids.map((id) => db.collection(DailyLogModel.collectionName).doc(id));
  const snapshots = await db.getAll(...refs);

  return snapshots
    .map(serializeDocument)
    .filter(Boolean)
    .sort((first, second) => String(second.date).localeCompare(String(first.date)))
    .slice(0, env.chatContext.userLogLimit);
}

async function fetchUserContextSummary(userId) {
  const db = getFirestore();
  const [userSnapshot, profileSnapshot, logs] = await Promise.all([
    db.collection(UserModel.collectionName).doc(userId).get(),
    db.collection(HealthProfileModel.collectionName).doc(userId).get(),
    fetchRecentLogs(userId),
  ]);

  return buildUserContextSummary({
    user: serializeDocument(userSnapshot),
    profile: serializeDocument(profileSnapshot),
    logs,
  });
}

async function getUserContextSummary(userId) {
  const redisClient = await getRedisClient();
  const cacheKey = getUserContextCacheKey(userId);

  if (redisClient) {
    const cachedSummary = await redisClient.get(cacheKey);

    if (cachedSummary) {
      return cachedSummary;
    }
  }

  const summary = await fetchUserContextSummary(userId);

  if (redisClient && summary) {
    await redisClient.set(cacheKey, summary, {
      EX: env.chatContext.redisTtlSeconds,
    });
  }

  return summary;
}

async function refreshUserContextSummary(userId) {
  const redisClient = await getRedisClient();
  const summary = await fetchUserContextSummary(userId);

  if (redisClient) {
    const cacheKey = getUserContextCacheKey(userId);

    if (summary) {
      await redisClient.set(cacheKey, summary, {
        EX: env.chatContext.redisTtlSeconds,
      });
    } else {
      await redisClient.del(cacheKey);
    }
  }

  return summary;
}

module.exports = {
  getUserContextSummary,
  refreshUserContextSummary,
};
