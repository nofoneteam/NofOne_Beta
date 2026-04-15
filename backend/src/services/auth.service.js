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
const { sendOtpEmail, sendReferralUsedEmail } = require("./email.service");
const { sendOtpSms } = require("./sms.service");
const { verifyRecaptchaTokenOptional } = require("./recaptcha.service");

function normalizeEmail(email) {
  return email?.trim().toLowerCase();
}

function normalizePhoneNumber(phoneNumber) {
  return phoneNumber?.trim();
}

function normalizeReferralCode(referralCode) {
  return referralCode?.trim().toUpperCase() || null;
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

  return null;
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

async function findUserByReferralCode(referralCode) {
  const normalizedCode = normalizeReferralCode(referralCode);

  if (!normalizedCode) {
    return null;
  }

  const db = getFirestore();
  const snapshot = await db
    .collection(UserModel.collectionName)
    .where("referralCode", "==", normalizedCode)
    .limit(1)
    .get();

  return serializeQuerySnapshot(snapshot)[0] || null;
}

async function findUserByContact(channel, identifier) {
  return channel === "email"
    ? findUserByEmail(identifier)
    : findUserByPhoneNumber(identifier);
}

function generateReferralCodeCandidate() {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

async function generateUniqueReferralCode() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = generateReferralCodeCandidate();
    const existingUser = await findUserByReferralCode(candidate);

    if (!existingUser) {
      return candidate;
    }
  }

  throw new ApiError(500, "Unable to generate a unique referral code");
}

async function ensureUserReferralCode(user) {
  if (!user) {
    return null;
  }

  if (user.referralCode) {
    return user;
  }

  const db = getFirestore();
  const referralCode = await generateUniqueReferralCode();
  const userRef = db.collection(UserModel.collectionName).doc(user.id);

  await userRef.set(
    {
      referralCode,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  return serializeDocument(await userRef.get());
}

async function notifyReferrerOfSignup(referrer, referredUser) {
  if (!referrer?.email) {
    return;
  }

  try {
    await sendReferralUsedEmail({
      to: referrer.email,
      referrerName: referrer.name,
      referredUserName: referredUser.name,
      referredUserEmail: referredUser.email,
      referredUserPhoneNumber: referredUser.phoneNumber,
    });
  } catch (error) {
    console.error("Failed to send referral notification email", error);
  }
}

async function applyReferralToUser(user, referralCode) {
  const normalizedCode = normalizeReferralCode(referralCode);

  if (!normalizedCode) {
    return user;
  }

  const currentUser = await ensureUserReferralCode(user);

  if (currentUser.referredByUserId) {
    return currentUser;
  }

  const referrer = await findUserByReferralCode(normalizedCode);

  if (!referrer) {
    throw new ApiError(400, "Invalid referral code");
  }

  if (referrer.id === currentUser.id) {
    throw new ApiError(400, "You cannot use your own referral code");
  }

  const db = getFirestore();
  const userRef = db.collection(UserModel.collectionName).doc(currentUser.id);
  const referrerRef = db.collection(UserModel.collectionName).doc(referrer.id);

  await Promise.all([
    userRef.set(
      {
        referredByUserId: referrer.id,
        referredByCode: normalizedCode,
        referredAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    ),
    referrerRef.set(
      {
        referralCount: admin.firestore.FieldValue.increment(1),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    ),
  ]);

  const updatedUser = serializeDocument(await userRef.get());
  await notifyReferrerOfSignup(referrer, updatedUser);

  return updatedUser;
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
  return ensureUserReferralCode(serializeDocument(await userRef.get()));
}

async function createOtpRequest(payload, purpose) {
  const db = getFirestore();
  
  // Verify reCAPTCHA token for bot protection
  if (payload.recaptchaToken) {
    await verifyRecaptchaTokenOptional(
      payload.recaptchaToken,
      purpose === "signup" ? "signup" : "login",
      0.5 // Minimum score threshold
    );
  }
  
  const channel = getChannel(payload);
  const identifier = getIdentifier(payload);
  const existingUser = await findUserByContact(channel, identifier);
  const referralCode = normalizeReferralCode(payload.referralCode);

  if (purpose === "signup" && existingUser) {
    throw new ApiError(409, "Account already exists. Please login instead");
  }

  if (purpose === "login" && !existingUser) {
    throw new ApiError(404, "Account not found. Please sign up first");
  }

  if (purpose === "signup" && referralCode) {
    const referrer = await findUserByReferralCode(referralCode);

    if (!referrer) {
      throw new ApiError(400, "Invalid referral code");
    }
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
        referralCode,
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
  const referralCode =
    normalizeReferralCode(payload.referralCode) ||
    normalizeReferralCode(otpRecord.metadata?.referralCode);

  if (purpose === "signup" && user) {
    throw new ApiError(409, "Account already exists. Please login instead");
  }

  if (purpose === "login" && !user) {
    throw new ApiError(404, "Account not found. Please sign up first");
  }

  let savedUser =
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

  if (purpose === "signup" && referralCode) {
    savedUser = await applyReferralToUser(savedUser, referralCode);
  }

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
  let user = await upsertUser({
    id: matchedUser?.id,
    email,
    phoneNumber: matchedUser?.phoneNumber || null,
    firebaseUid: decodedToken.uid,
    authProvider: matchedUser?.authProvider || "google",
    name: payload.name?.trim() || decodedToken.name || null,
  });

  if (!matchedUser && payload.referralCode) {
    user = await applyReferralToUser(user, payload.referralCode);
  }

  return createSessionTokens(user, meta);
}

async function loginWithPhone(payload, meta = {}) {
  if (!isFirebaseConfigured) {
    throw new ApiError(
      503,
      "Firebase phone authentication is not configured on the server"
    );
  }

  const decodedToken = await admin.auth().verifyIdToken(payload.idToken);

  if (decodedToken.firebase?.sign_in_provider !== "phone") {
    throw new ApiError(400, "The provided Firebase token is not from phone sign-in");
  }

  const phoneNumber = normalizePhoneNumber(decodedToken.phone_number);

  if (!phoneNumber) {
    throw new ApiError(400, "Phone number is required for phone sign-in");
  }

  const matchedUser =
    (await findUserByFirebaseUid(decodedToken.uid)) ||
    (await findUserByPhoneNumber(phoneNumber));

  if (payload.mode === "signup" && matchedUser) {
    throw new ApiError(409, "Account already exists. Please login instead");
  }

  if (payload.mode === "login" && !matchedUser) {
    throw new ApiError(404, "Account not found. Please sign up first");
  }

  let user = await upsertUser({
    id: matchedUser?.id,
    email: matchedUser?.email || null,
    phoneNumber,
    firebaseUid: decodedToken.uid,
    authProvider: matchedUser?.authProvider || "phone",
    name:
      payload.name?.trim() ||
      matchedUser?.name ||
      null,
  });

  if (payload.mode === "signup" && payload.referralCode) {
    user = await applyReferralToUser(user, payload.referralCode);
  }

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
  const user = await ensureUserReferralCode(await findUserById(userId));

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
  loginWithPhone,
  rotateRefreshToken,
  revokeRefreshSession,
  getUserById,
  bootstrapAdmin,
  setUserRole,
};
