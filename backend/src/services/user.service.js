const ApiError = require("../utils/apiError");
const HealthProfileModel = require("../models/healthProfile.model");
const UserModel = require("../models/user.model");
const {
  getFirestore,
  serializeDocument,
} = require("../utils/firestore");

async function upsertHealthProfile(userId, payload) {
  const db = getFirestore();
  const userSnapshot = await db.collection(UserModel.collectionName).doc(userId).get();
  const user = serializeDocument(userSnapshot);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const profileRef = db.collection(HealthProfileModel.collectionName).doc(userId);
  const existingProfile = await profileRef.get();
  const profilePayload = HealthProfileModel.createPayload(
    userId,
    payload,
    existingProfile.exists ? existingProfile.data() : null
  );

  await profileRef.set(profilePayload, { merge: true });
  // Once the user has saved their health profile, the frontend can treat onboarding as complete.
  await db.collection(UserModel.collectionName).doc(userId).set(
    {
      onboarded: true,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  return serializeDocument(await profileRef.get());
}

async function getHealthProfile(userId) {
  const db = getFirestore();
  const profileSnapshot = await db
    .collection(HealthProfileModel.collectionName)
    .doc(userId)
    .get();
  const profile = serializeDocument(profileSnapshot);

  if (!profile) {
    throw new ApiError(404, "Health profile not found");
  }

  const userSnapshot = await db.collection(UserModel.collectionName).doc(userId).get();
  const user = serializeDocument(userSnapshot);

  return {
    ...profile,
    user,
  };
}

module.exports = {
  upsertHealthProfile,
  getHealthProfile,
};
