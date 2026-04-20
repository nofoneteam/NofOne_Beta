const ApiError = require("../utils/apiError");
const ChatConfigModel = require("../models/chatConfig.model");
const UserModel = require("../models/user.model");
const { getFirestore, serializeDocument, serializeQuerySnapshot } = require("../utils/firestore");
const { getRedisClient } = require("../utils/redis");
const env = require("../config/env");
const { sendAdminPromotionEmail } = require("./email.service");

function getChatConfigCacheKey() {
  return `${env.redis.keyPrefix}:chat:config:${ChatConfigModel.documentId}`;
}

function startOfUtcDay(date) {
  const value = new Date(date);
  value.setUTCHours(0, 0, 0, 0);
  return value;
}

function addUtcDays(date, days) {
  const value = new Date(date);
  value.setUTCDate(value.getUTCDate() + days);
  return value;
}

function formatIsoDate(date) {
  return startOfUtcDay(date).toISOString().slice(0, 10);
}

function formatMonthKey(date) {
  return startOfUtcDay(date).toISOString().slice(0, 7);
}

function createSeries(points, formatter) {
  return points.map((date) => ({
    label: formatter(date),
    value: 0,
  }));
}

function incrementByLabel(series, label) {
  const match = series.find((item) => item.label === label);
  if (match) {
    match.value += 1;
  }
}

function normalizeEmailQuery(value) {
  return String(value || "").trim().toLowerCase();
}

async function getChatConfig() {
  const db = getFirestore();
  const snapshot = await db
    .collection(ChatConfigModel.collectionName)
    .doc(ChatConfigModel.documentId)
    .get();

  return serializeDocument(snapshot);
}

async function upsertChatConfig(payload) {
  const db = getFirestore();
  const ref = db
    .collection(ChatConfigModel.collectionName)
    .doc(ChatConfigModel.documentId);
  const existing = await ref.get();

  await ref.set(
    {
      systemPrompt: payload.systemPrompt ?? existing.data()?.systemPrompt ?? null,
      imageSystemPrompt:
        payload.imageSystemPrompt ?? existing.data()?.imageSystemPrompt ?? null,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  const config = serializeDocument(await ref.get());
  const redisClient = await getRedisClient();

  if (redisClient) {
    await redisClient.set(getChatConfigCacheKey(), JSON.stringify(config), {
      EX: env.chatConfig.redisTtlSeconds,
    });
  }

  return config;
}

async function listRecentUsers({ field, limit = 8, onlyReferred = false }) {
  const db = getFirestore();
  const query = db
    .collection(UserModel.collectionName)
    .orderBy(field, "desc")
    .limit(limit * 3);

  const snapshot = await query.get();
  return serializeQuerySnapshot(snapshot)
    .filter((user) => !onlyReferred || user.referredByUserId)
    .slice(0, limit);
}

async function getUsersCreatedSince(startDate) {
  const db = getFirestore();
  const snapshot = await db
    .collection(UserModel.collectionName)
    .where("createdAt", ">=", startDate.toISOString())
    .get();

  return serializeQuerySnapshot(snapshot);
}

async function getAdminOverview() {
  const now = startOfUtcDay(new Date());
  const dailyPoints = Array.from({ length: 14 }, (_, index) => addUtcDays(now, index - 13));
  const weeklyPoints = Array.from({ length: 8 }, (_, index) => addUtcDays(now, (index - 7) * 7));
  const monthlyPoints = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (5 - index), 1));
    return date;
  });

  const createdUsers = await getUsersCreatedSince(monthlyPoints[0]);
  const referredUsers = createdUsers.filter((user) => user.referredByUserId);

  const dailySignups = createSeries(dailyPoints, formatIsoDate);
  const dailyReferrals = createSeries(dailyPoints, formatIsoDate);
  const weeklySignups = createSeries(weeklyPoints, (date) => formatIsoDate(date));
  const weeklyReferrals = createSeries(weeklyPoints, (date) => formatIsoDate(date));
  const monthlySignups = createSeries(monthlyPoints, formatMonthKey);
  const monthlyReferrals = createSeries(monthlyPoints, formatMonthKey);

  for (const user of createdUsers) {
    const createdAt = new Date(user.createdAt);
    incrementByLabel(dailySignups, formatIsoDate(createdAt));
    incrementByLabel(monthlySignups, formatMonthKey(createdAt));

    const weeklyBucket = weeklyPoints
      .map((date, index) => ({ date, index }))
      .reverse()
      .find(({ date }) => createdAt >= date);

    if (weeklyBucket) {
      weeklySignups[weeklyBucket.index].value += 1;
    }
  }

  for (const user of referredUsers) {
    const referredAt = new Date(user.referredAt || user.createdAt);
    incrementByLabel(dailyReferrals, formatIsoDate(referredAt));
    incrementByLabel(monthlyReferrals, formatMonthKey(referredAt));

    const weeklyBucket = weeklyPoints
      .map((date, index) => ({ date, index }))
      .reverse()
      .find(({ date }) => referredAt >= date);

    if (weeklyBucket) {
      weeklyReferrals[weeklyBucket.index].value += 1;
    }
  }

  const [latestSignups, latestReferrals, admins] = await Promise.all([
    listRecentUsers({ field: "createdAt", limit: 8 }),
    listRecentUsers({ field: "referredAt", limit: 8, onlyReferred: true }),
    listAdmins(),
  ]);

  return {
    totals: {
      signups: createdUsers.length,
      referrals: referredUsers.length,
      admins: admins.length,
    },
    charts: {
      daily: {
        signups: dailySignups,
        referrals: dailyReferrals,
      },
      weekly: {
        signups: weeklySignups,
        referrals: weeklyReferrals,
      },
      monthly: {
        signups: monthlySignups,
        referrals: monthlyReferrals,
      },
    },
    latestSignups,
    latestReferrals,
  };
}

async function searchUsersByEmail(email) {
  const query = normalizeEmailQuery(email);

  if (!query) {
    return [];
  }

  const db = getFirestore();
  const usersRef = db.collection(UserModel.collectionName);
  const snapshot = await usersRef
    .where("email", ">=", query)
    .where("email", "<=", `${query}\uf8ff`)
    .limit(10)
    .get();

  return serializeQuerySnapshot(snapshot);
}

async function listAdmins() {
  const db = getFirestore();
  const snapshot = await db
    .collection(UserModel.collectionName)
    .where("role", "==", "admin")
    .get();

  return serializeQuerySnapshot(snapshot).sort((first, second) =>
    String(first.name || first.email || "").localeCompare(String(second.name || second.email || ""))
  );
}

async function updateUserRole({ actor, userId, role }) {
  const db = getFirestore();
  const userRef = db.collection(UserModel.collectionName).doc(userId);
  const snapshot = await userRef.get();

  if (!snapshot.exists) {
    throw new ApiError(404, "User not found");
  }

  const currentUser = serializeDocument(snapshot);

  if (currentUser.role === role) {
    return currentUser;
  }

  await userRef.set(
    {
      role,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  const updatedUser = serializeDocument(await userRef.get());

  if (role === "admin" && updatedUser.email) {
    try {
      await sendAdminPromotionEmail({
        to: updatedUser.email,
        promotedUserName: updatedUser.name,
        grantedByName: actor?.name || actor?.email || "the Nofone team",
      });
    } catch (error) {
      console.error("Failed to send admin promotion email", error);
    }
  }

  return updatedUser;
}

module.exports = {
  getAdminOverview,
  searchUsersByEmail,
  listAdmins,
  updateUserRole,
  getChatConfig,
  upsertChatConfig,
};
