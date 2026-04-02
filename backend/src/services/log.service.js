const ApiError = require("../utils/apiError");
const collections = require("../models/collections");
const { normalizeDate } = require("../utils/date");
const {
  getFirestore,
  serializeDocument,
} = require("../utils/firestore");

function buildDailyLogId(userId, normalizedDate) {
  return `${userId}_${normalizedDate.toISOString().slice(0, 10)}`;
}

async function createOrUpdateDailyLog(userId, payload) {
  const db = getFirestore();
  const userSnapshot = await db.collection(collections.users).doc(userId).get();
  const user = serializeDocument(userSnapshot);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const normalizedDate = normalizeDate(payload.date);
  const logRef = db
    .collection(collections.dailyLogs)
    .doc(buildDailyLogId(userId, normalizedDate));
  const existingLog = await logRef.get();

  await logRef.set(
    {
      ...payload,
      userId,
      date: normalizedDate.toISOString(),
      updatedAt: new Date().toISOString(),
      createdAt: existingLog.exists
        ? existingLog.data().createdAt
        : new Date().toISOString(),
    },
    { merge: true }
  );

  return serializeDocument(await logRef.get());
}

async function getDailyLogByDate(userId, date) {
  const db = getFirestore();
  const normalizedDate = normalizeDate(date);
  const logSnapshot = await db
    .collection(collections.dailyLogs)
    .doc(buildDailyLogId(userId, normalizedDate))
    .get();
  const log = serializeDocument(logSnapshot);

  if (!log) {
    throw new ApiError(404, "Daily log not found for the requested date");
  }

  return log;
}

module.exports = {
  createOrUpdateDailyLog,
  getDailyLogByDate,
};
