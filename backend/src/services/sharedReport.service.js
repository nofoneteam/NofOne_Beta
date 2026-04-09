const crypto = require("crypto");

const env = require("../config/env");
const SharedReportModel = require("../models/sharedReport.model");
const { getFirestore, serializeDocument } = require("../utils/firestore");

function getEncryptionKey() {
  return crypto
    .createHash("sha256")
    .update(String(env.reportShareSecret))
    .digest();
}

function encryptJson(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return {
    encryptedPayload: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  };
}

function decryptJson(payload) {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(payload.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.encryptedPayload, "base64")),
    decipher.final(),
  ]);

  return JSON.parse(decrypted.toString("utf8"));
}

async function createSharedReportRecord({
  userId,
  period,
  startDate,
  endDate,
  report,
}) {
  const db = getFirestore();
  const token = crypto.randomBytes(24).toString("hex");
  const ref = db.collection(SharedReportModel.collectionName).doc();
  // The share token is opaque; the report body itself is encrypted before storage.
  const encrypted = encryptJson(report);
  const payload = SharedReportModel.createPayload(ref.id, {
    userId,
    token,
    period,
    startDate,
    endDate,
    ...encrypted,
  });

  await ref.set(payload);

  return {
    token,
    report,
    encryptedReport: encrypted.encryptedPayload,
    iv: encrypted.iv,
    tag: encrypted.tag,
  };
}

async function getSharedReportByToken(token) {
  const db = getFirestore();
  const snapshot = await db
    .collection(SharedReportModel.collectionName)
    .where("token", "==", token)
    .limit(1)
    .get();
  const record = snapshot.docs.map(serializeDocument)[0] || null;

  if (!record) {
    return null;
  }

  return {
    token: record.token,
    period: record.period,
    startDate: record.startDate,
    endDate: record.endDate,
    createdAt: record.createdAt,
    report: decryptJson(record),
  };
}

module.exports = {
  createSharedReportRecord,
  getSharedReportByToken,
};
