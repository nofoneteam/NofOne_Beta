const ApiError = require("../utils/apiError");
const DailyLogModel = require("../models/dailyLog.model");
const UserModel = require("../models/user.model");
const { normalizeDate } = require("../utils/date");
const {
  getFirestore,
  serializeDocument,
} = require("../utils/firestore");

async function createOrUpdateDailyLog(userId, payload) {
  const db = getFirestore();
  const userSnapshot = await db.collection(UserModel.collectionName).doc(userId).get();
  const user = serializeDocument(userSnapshot);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const normalizedDate = normalizeDate(payload.date);
  const logRef = db
    .collection(DailyLogModel.collectionName)
    .doc(DailyLogModel.createDocumentId(userId, normalizedDate));
  const existingLog = await logRef.get();
  const logPayload = DailyLogModel.createPayload(
    userId,
    payload,
    normalizedDate,
    existingLog.exists ? existingLog.data() : null
  );

  await logRef.set(logPayload, { merge: true });

  return serializeDocument(await logRef.get());
}

async function getDailyLogByDate(userId, date) {
  const db = getFirestore();
  const normalizedDate = normalizeDate(date);
  const logSnapshot = await db
    .collection(DailyLogModel.collectionName)
    .doc(DailyLogModel.createDocumentId(userId, normalizedDate))
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
