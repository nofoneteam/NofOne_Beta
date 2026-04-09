const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const env = require("../config/env");
const { admin, isFirebaseConfigured } = require("../config/firebase");
const OtpCodeModel = require("../models/otpCode.model");
const SessionModel = require("../models/session.model");
const UserModel = require("../models/user.model");
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
      role: user.role || "user",
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
  const userSnapshot = await db.collection(UserModel.collectionName).doc(userId).get();
  return serializeDocument(userSnapshot);
}

async function findUserByEmail(email) {
  const db = getFirestore();
  const snapshot = await db
    .collection(UserModel.collectionName)
    .where("email", "==", email)
    .limit(1)
    .get();

  return serializeQuerySnapshot(snapshot)[0] || null;
}

async function findUserByPhoneNumber(phoneNumber) {
  const db = getFirestore();
  const snapshot = await db
    .collection(UserModel.collectionName)
    .where("phoneNumber", "==", phoneNumber)
    .limit(1)
    .get();

  return serializeQuerySnapshot(snapshot)[0] || null;
}

async function findUserByFirebaseUid(firebaseUid) {
  const db = getFirestore();
  const snapshot = await db
    .collection(UserModel.collectionName)
    .where("firebaseUid", "==", firebaseUid)
    .limit(1)
    .get();

  return serializeQuerySnapshot(snapshot)[0] || null;
}

async function findUserByContact(channel, identifier) {
  return channel === "email"
    ? findUserByEmail(identifier)
    : findUserByPhoneNumber(identifier);
}

async function upsertUser({ id, email, phoneNumber, firebaseUid, authProvider, name }) {
  const db = getFirestore();
  const userRef = id
    ? db.collection(UserModel.collectionName).doc(id)
    : db.collection(UserModel.collectionName).doc();
  const existingUser = await userRef.get();
  const payload = UserModel.createPayload(
    { name, email, phoneNumber, firebaseUid, authProvider },
    existingUser.exists ? existingUser.data() : null
  );

  await userRef.set(payload, { merge: true });
  return serializeDocument(await userRef.get());
}

async function createOtpRequest(payload, purpose) {
  const db = getFirestore();
  const channel = getChannel(payload);
  const identifier = getIdentifier(payload);
  const existingUser = await findUserByContact(channel, identifier);

  if (purpose === "signup" && existingUser) {
    throw new ApiError(409, "Account already exists. Please login instead");
  }

  if (purpose === "login" && !existingUser) {
    throw new ApiError(404, "Account not found. Please sign up first");
  }

  const otp = generateOtpCode();
  const otpHash = hashOtp(identifier, otp);
  const expiresAt = new Date(
    Date.now() + env.otp.expiresInMinutes * 60 * 1000
  ).toISOString();
  const otpRef = db
    .collection(OtpCodeModel.collectionName)
    .doc(OtpCodeModel.createDocumentId(channel, identifier, purpose));
  await otpRef.set(
    OtpCodeModel.createPayload({
      channel,
      identifier,
      otpHash,
      purpose,
      expiresAt,
      attempts: 0,
      verifiedAt: null,
      metadata: {
        name: payload.name?.trim() || null,
      },
    })
  );

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
    purpose,
    expiresAt,
    delivery,
  };
}

async function requestSignupOtp(payload) {
  return createOtpRequest(payload, "signup");
}

async function requestLoginOtp(payload) {
  return createOtpRequest(payload, "login");
}

async function createSessionTokens(user, meta = {}) {
  const db = getFirestore();
  const sessionRef = db.collection(SessionModel.collectionName).doc();
  const refreshToken = signRefreshToken(user, sessionRef.id);
  const refreshTokenHash = hashToken(refreshToken);

  await sessionRef.set(
    SessionModel.createPayload({
      userId: user.id,
      refreshTokenHash,
      userAgent: meta.userAgent || null,
      ipAddress: meta.ipAddress || null,
      revokedAt: null,
      replacedByTokenHash: null,
      expiresAt: getExpiryDateFromToken(refreshToken, env.refreshTokenSecret),
    })
  );

  return {
    accessToken: signAccessToken(user),
    refreshToken,
    user,
  };
}

async function verifyOtp(payload, purpose, meta = {}) {
  const db = getFirestore();
  const channel = getChannel(payload);
  const identifier = getIdentifier(payload);
  const otpHash = hashOtp(identifier, payload.otp);
  const otpSnapshot = await db
    .collection(OtpCodeModel.collectionName)
    .doc(OtpCodeModel.createDocumentId(channel, identifier, purpose))
    .get();
  const otpRecord = serializeDocument(otpSnapshot);

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

  const otpRef = db.collection(OtpCodeModel.collectionName).doc(otpRecord.id);

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
    await findUserByContact(channel, identifier);

  if (purpose === "signup" && user) {
    throw new ApiError(409, "Account already exists. Please login instead");
  }

  if (purpose === "login" && !user) {
    throw new ApiError(404, "Account not found. Please sign up first");
  }

  const savedUser =
    purpose === "signup"
      ? await upsertUser({
          id: null,
          email: channel === "email" ? identifier : null,
          phoneNumber: channel === "phone" ? identifier : null,
          firebaseUid: null,
          authProvider: channel,
          name: buildUserName(payload, otpRecord.metadata?.name),
        })
      : await upsertUser({
          id: user.id,
          email: channel === "email" ? identifier : user.email,
          phoneNumber: channel === "phone" ? identifier : user.phoneNumber,
          firebaseUid: user.firebaseUid,
          authProvider: user.authProvider || channel,
          name: buildUserName(payload, user.name || otpRecord.metadata?.name),
        });

  return createSessionTokens(savedUser, meta);
}

async function verifySignupOtp(payload, meta = {}) {
  return verifyOtp(payload, "signup", meta);
}

async function verifyLoginOtp(payload, meta = {}) {
  return verifyOtp(payload, "login", meta);
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

  // If the email already belongs to a user, Google sign-in links into that same account instead of creating a duplicate.
  const user = await upsertUser({
    id: matchedUser?.id,
    email,
    phoneNumber: matchedUser?.phoneNumber || null,
    firebaseUid: decodedToken.uid,
    authProvider: matchedUser?.authProvider || "google",
    name: payload.name?.trim() || decodedToken.name || email.split("@")[0],
  });

  return createSessionTokens(user, meta);
}

async function findActiveSession(sessionId, userId, refreshTokenHash) {
  const db = getFirestore();
  const sessionSnapshot = await db
    .collection(SessionModel.collectionName)
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
    .collection(SessionModel.collectionName)
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
  await db.collection(SessionModel.collectionName).doc(session.id).set(
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

async function setUserRole(userId, role) {
  const db = getFirestore();
  const userRef = db.collection(UserModel.collectionName).doc(userId);
  const snapshot = await userRef.get();

  if (!snapshot.exists) {
    throw new ApiError(404, "User not found");
  }

  await userRef.set(
    {
      role,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  return serializeDocument(await userRef.get());
}

async function bootstrapAdmin(currentUserId, bootstrapSecret) {
  if (!env.adminBootstrapSecret) {
    throw new ApiError(503, "ADMIN_BOOTSTRAP_SECRET is not configured");
  }

  if (bootstrapSecret !== env.adminBootstrapSecret) {
    throw new ApiError(403, "Invalid admin bootstrap secret");
  }

  return setUserRole(currentUserId, "admin");
}

module.exports = {
  requestSignupOtp,
  requestLoginOtp,
  verifySignupOtp,
  verifyLoginOtp,
  loginWithGoogle,
  rotateRefreshToken,
  revokeRefreshSession,
  getUserById,
  bootstrapAdmin,
  setUserRole,
};
