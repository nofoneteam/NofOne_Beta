const ApiError = require("../utils/apiError");
const collections = require("../models/collections");
const {
  getFirestore,
  serializeDocument,
} = require("../utils/firestore");

async function upsertHealthProfile(userId, payload) {
  const db = getFirestore();
  const userSnapshot = await db.collection(collections.users).doc(userId).get();
  const user = serializeDocument(userSnapshot);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const profileRef = db.collection(collections.healthProfiles).doc(userId);
  const profilePayload = {
    ...payload,
    userId,
    updatedAt: new Date().toISOString(),
  };

  const existingProfile = await profileRef.get();

  await profileRef.set(
    {
      ...profilePayload,
      createdAt: existingProfile.exists
        ? existingProfile.data().createdAt
        : new Date().toISOString(),
    },
    { merge: true }
  );

  return serializeDocument(await profileRef.get());
}

async function getHealthProfile(userId) {
  const db = getFirestore();
  const profileSnapshot = await db
    .collection(collections.healthProfiles)
    .doc(userId)
    .get();
  const profile = serializeDocument(profileSnapshot);

  if (!profile) {
    throw new ApiError(404, "Health profile not found");
  }

  const userSnapshot = await db.collection(collections.users).doc(userId).get();
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
