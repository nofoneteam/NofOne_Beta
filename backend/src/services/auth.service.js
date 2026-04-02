const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const env = require("../config/env");
const { admin, isFirebaseConfigured } = require("../config/firebase");
const collections = require("../models/collections");
const ApiError = require("../utils/apiError");
const {
  getFirestore,
  serializeDocument,
  serializeQuerySnapshot,
} = require("../utils/firestore");
const { sendOtpEmail } = require("./email.service");
const { sendOtpSms } = require("./sms.service");

function normalizeEmail(email) {
  return email?.trim().toLowerCase();
}

function normalizePhoneNumber(phoneNumber) {
  return phoneNumber?.trim();
}

function getChannel(payload) {
  if (payload.email) {
    return "email";
  }

  if (payload.phoneNumber) {
    return "phone";
  }

  throw new ApiError(400, "Either email or phoneNumber is required");
}

function getIdentifier(payload) {
  const channel = getChannel(payload);

  return channel === "email"
    ? normalizeEmail(payload.email)
    : normalizePhoneNumber(payload.phoneNumber);
}

function generateOtpCode() {
  const min = 10 ** (env.otp.length - 1);
  const max = 10 ** env.otp.length - 1;

  return String(crypto.randomInt(min, max + 1));
}

function hashOtp(identifier, otp) {
  return crypto
    .createHash("sha256")
    .update(`${identifier}:${otp}:${env.jwtSecret}`)
    .digest("hex");
}

function hashToken(token) {
  return crypto
    .createHash("sha256")
    .update(`${token}:${env.refreshTokenSecret}`)
    .digest("hex");
}

function buildUserName(payload, fallbackName) {
  if (payload.name?.trim()) {
    return payload.name.trim();
  }

  if (fallbackName?.trim()) {
    return fallbackName.trim();
  }

  if (payload.email) {
    return normalizeEmail(payload.email).split("@")[0];
  }

  return "User";
}

function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      tokenType: "access",
      authProvider: user.authProvider,
      email: user.email || null,
      phoneNumber: user.phoneNumber || null,
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

function signRefreshToken(user, sessionId) {
  return jwt.sign(
    {
      sub: user.id,
      sessionId,
      tokenType: "refresh",
    },
    env.refreshTokenSecret,
    { expiresIn: env.refreshTokenExpiresIn }
  );
}

function getExpiryDateFromToken(token, secret) {
  const decoded = jwt.verify(token, secret);
  return new Date(decoded.exp * 1000).toISOString();
}

async function findUserById(userId) {
  const db = getFirestore();
  const userSnapshot = await db.collection(collections.users).doc(userId).get();
  return serializeDocument(userSnapshot);
}

async function findUserByEmail(email) {
  const db = getFirestore();
  const snapshot = await db
    .collection(collections.users)
    .where("email", "==", email)
    .limit(1)
    .get();

  return serializeQuerySnapshot(snapshot)[0] || null;
}

async function findUserByPhoneNumber(phoneNumber) {
  const db = getFirestore();
  const snapshot = await db
    .collection(collections.users)
    .where("phoneNumber", "==", phoneNumber)
    .limit(1)
    .get();

  return serializeQuerySnapshot(snapshot)[0] || null;
}

async function findUserByFirebaseUid(firebaseUid) {
  const db = getFirestore();
  const snapshot = await db
    .collection(collections.users)
    .where("firebaseUid", "==", firebaseUid)
    .limit(1)
    .get();

  return serializeQuerySnapshot(snapshot)[0] || null;
}

async function upsertUser({ id, email, phoneNumber, firebaseUid, authProvider, name }) {
  const db = getFirestore();
  const userRef = id
    ? db.collection(collections.users).doc(id)
    : db.collection(collections.users).doc();
  const existingUser = await userRef.get();

  const payload = {
    name: name || "User",
    email: email || null,
    phoneNumber: phoneNumber || null,
    firebaseUid: firebaseUid || null,
    authProvider,
    createdAt: existingUser.exists
      ? existingUser.data().createdAt
      : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await userRef.set(payload, { merge: true });
  return serializeDocument(await userRef.get());
}

async function deleteActiveOtps(channel, identifier) {
  const db = getFirestore();
  const snapshot = await db
    .collection(collections.otpCodes)
    .where("channel", "==", channel)
    .where("identifier", "==", identifier)
    .where("purpose", "==", "login")
    .where("verifiedAt", "==", null)
    .get();

  if (snapshot.empty) {
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}

async function requestOtp(payload) {
  const db = getFirestore();
  const channel = getChannel(payload);
  const identifier = getIdentifier(payload);
  const otp = generateOtpCode();
  const otpHash = hashOtp(identifier, otp);
  const expiresAt = new Date(
    Date.now() + env.otp.expiresInMinutes * 60 * 1000
  ).toISOString();

  await deleteActiveOtps(channel, identifier);

  const otpRef = db.collection(collections.otpCodes).doc();
  await otpRef.set({
    channel,
    identifier,
    otpHash,
    purpose: "login",
    expiresAt,
    attempts: 0,
    verifiedAt: null,
    metadata: {
      name: payload.name?.trim() || null,
    },
    createdAt: new Date().toISOString(),
  });

  const delivery =
    channel === "email"
      ? await sendOtpEmail({
          to: identifier,
          otp,
          expiresInMinutes: env.otp.expiresInMinutes,
        })
      : await sendOtpSms({
          to: identifier,
          otp,
          expiresInMinutes: env.otp.expiresInMinutes,
        });

  return {
    channel,
    identifier,
    expiresAt,
    delivery,
  };
}

async function createSessionTokens(user, meta = {}) {
  const db = getFirestore();
  const sessionRef = db.collection(collections.sessions).doc();
  const refreshToken = signRefreshToken(user, sessionRef.id);
  const refreshTokenHash = hashToken(refreshToken);

  await sessionRef.set({
    userId: user.id,
    refreshTokenHash,
    userAgent: meta.userAgent || null,
    ipAddress: meta.ipAddress || null,
    revokedAt: null,
    replacedByTokenHash: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    expiresAt: getExpiryDateFromToken(refreshToken, env.refreshTokenSecret),
  });

  return {
    accessToken: signAccessToken(user),
    refreshToken,
    user,
  };
}

async function verifyOtpAndLogin(payload, meta = {}) {
  const db = getFirestore();
  const channel = getChannel(payload);
  const identifier = getIdentifier(payload);
  const otpHash = hashOtp(identifier, payload.otp);

  const otpSnapshot = await db
    .collection(collections.otpCodes)
    .where("channel", "==", channel)
    .where("identifier", "==", identifier)
    .where("purpose", "==", "login")
    .where("verifiedAt", "==", null)
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();
  const otpRecord = serializeQuerySnapshot(otpSnapshot)[0];

  if (!otpRecord) {
    throw new ApiError(400, "No active OTP found for this user");
  }

  if (new Date(otpRecord.expiresAt).getTime() < Date.now()) {
    throw new ApiError(400, "OTP has expired");
  }

  if (otpRecord.attempts >= env.otp.maxAttempts) {
    throw new ApiError(
      429,
      "Maximum OTP attempts reached. Please request a new code"
    );
  }

  const otpRef = db.collection(collections.otpCodes).doc(otpRecord.id);

  if (otpRecord.otpHash !== otpHash) {
    await otpRef.set(
      {
        attempts: otpRecord.attempts + 1,
      },
      { merge: true }
    );
    throw new ApiError(400, "Invalid OTP");
  }

  await otpRef.set(
    {
      attempts: otpRecord.attempts + 1,
      verifiedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  const user =
    channel === "email"
      ? await findUserByEmail(identifier)
      : await findUserByPhoneNumber(identifier);

  const savedUser = await upsertUser({
    id: user?.id,
    email: channel === "email" ? identifier : user?.email,
    phoneNumber: channel === "phone" ? identifier : user?.phoneNumber,
    firebaseUid: user?.firebaseUid,
    authProvider: channel,
    name: buildUserName(payload, otpRecord.metadata?.name),
  });

  return createSessionTokens(savedUser, meta);
}

async function loginWithGoogle(payload, meta = {}) {
  if (!isFirebaseConfigured) {
    throw new ApiError(
      503,
      "Firebase Google authentication is not configured on the server"
    );
  }

  const decodedToken = await admin.auth().verifyIdToken(payload.idToken);

  if (decodedToken.firebase?.sign_in_provider !== "google.com") {
    throw new ApiError(400, "The provided Firebase token is not from Google sign-in");
  }

  const email = normalizeEmail(decodedToken.email);

  if (!email) {
    throw new ApiError(400, "Google account email is required");
  }

  const matchedUser =
    (await findUserByFirebaseUid(decodedToken.uid)) ||
    (await findUserByEmail(email));

  const user = await upsertUser({
    id: matchedUser?.id,
    email,
    phoneNumber: matchedUser?.phoneNumber || null,
    firebaseUid: decodedToken.uid,
    authProvider: "google",
    name: payload.name?.trim() || decodedToken.name || email.split("@")[0],
  });

  return createSessionTokens(user, meta);
}

async function findActiveSession(sessionId, userId, refreshTokenHash) {
  const db = getFirestore();
  const sessionSnapshot = await db
    .collection(collections.sessions)
    .doc(sessionId)
    .get();
  const session = serializeDocument(sessionSnapshot);

  if (!session) {
    return null;
  }

  if (
    session.userId !== userId ||
    session.refreshTokenHash !== refreshTokenHash ||
    session.revokedAt
  ) {
    return null;
  }

  return session;
}

async function rotateRefreshToken(refreshToken, meta = {}) {
  let decodedToken;

  try {
    decodedToken = jwt.verify(refreshToken, env.refreshTokenSecret);
  } catch (error) {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  if (decodedToken.tokenType !== "refresh") {
    throw new ApiError(401, "Invalid refresh token type");
  }

  const session = await findActiveSession(
    decodedToken.sessionId,
    decodedToken.sub,
    hashToken(refreshToken)
  );

  if (!session) {
    throw new ApiError(401, "Refresh session is invalid or has been revoked");
  }

  if (new Date(session.expiresAt).getTime() < Date.now()) {
    throw new ApiError(401, "Refresh session has expired");
  }

  const user = await findUserById(decodedToken.sub);

  if (!user) {
    throw new ApiError(401, "User not found for this refresh session");
  }

  const db = getFirestore();
  const newRefreshToken = signRefreshToken(user, session.id);
  await db
    .collection(collections.sessions)
    .doc(session.id)
    .set(
      {
        refreshTokenHash: hashToken(newRefreshToken),
        replacedByTokenHash: hashToken(newRefreshToken),
        userAgent: meta.userAgent || session.userAgent || null,
        ipAddress: meta.ipAddress || session.ipAddress || null,
        updatedAt: new Date().toISOString(),
        expiresAt: getExpiryDateFromToken(
          newRefreshToken,
          env.refreshTokenSecret
        ),
      },
      { merge: true }
    );

  return {
    accessToken: signAccessToken(user),
    refreshToken: newRefreshToken,
    user,
  };
}

async function revokeRefreshSession(refreshToken) {
  let decodedToken;

  try {
    decodedToken = jwt.verify(refreshToken, env.refreshTokenSecret);
  } catch (error) {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  const session = await findActiveSession(
    decodedToken.sessionId,
    decodedToken.sub,
    hashToken(refreshToken)
  );

  if (!session) {
    throw new ApiError(404, "Refresh session not found");
  }

  const db = getFirestore();
  await db.collection(collections.sessions).doc(session.id).set(
    {
      revokedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

async function getUserById(userId) {
  const user = await findUserById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return user;
}

module.exports = {
  requestOtp,
  verifyOtpAndLogin,
  loginWithGoogle,
  rotateRefreshToken,
  revokeRefreshSession,
  getUserById,
};
