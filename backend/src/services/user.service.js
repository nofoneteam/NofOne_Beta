const ApiError = require("../utils/apiError");
const HealthProfileModel = require("../models/healthProfile.model");
const UserModel = require("../models/user.model");
const env = require("../config/env");
const {
  getFirestore,
  serializeDocument,
} = require("../utils/firestore");
const { refreshUserContextSummary } = require("./userContext.service");

function getResolvedChatPreferences(user) {
  return {
    ...UserModel.defaultChatPreferences,
    ...(user?.chatPreferences || {}),
  };
}

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
  const userUpdatePayload = {
    onboarded: true,
    updatedAt: new Date().toISOString(),
  };

  if (payload.name) {
    userUpdatePayload.name = payload.name;
  }

  await db.collection(UserModel.collectionName).doc(userId).set(
    userUpdatePayload,
    { merge: true }
  );
  refreshUserContextSummary(userId).catch(() => null);

  return serializeDocument(await profileRef.get());
}

async function getHealthProfile(userId) {
  const db = getFirestore();
  const userSnapshot = await db.collection(UserModel.collectionName).doc(userId).get();
  const user = serializeDocument(userSnapshot);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const profileSnapshot = await db
    .collection(HealthProfileModel.collectionName)
    .doc(userId)
    .get();
  const profile = serializeDocument(profileSnapshot);

  if (!profile) {
    return {
      id: userId,
      userId,
      age: null,
      gender: null,
      height: null,
      weight: null,
      targetWeight: null,
      bmi: null,
      bmiCategory: null,
      location: null,
      city: null,
      ethnicityCuisine: null,
      activityLevel: null,
      goal: null,
      dietType: null,
      diabetes: null,
      hypertension: null,
      cholesterol: null,
      cancerSurvivor: null,
      hrt: null,
      otherConditions: null,
      allergies: [],
      foodDislikes: [],
      aiNotes: [],
      createdAt: null,
      updatedAt: null,
      user,
    };
  }

  return {
    ...profile,
    user,
  };
}

async function getUserChatPreferences(userId) {
  const db = getFirestore();
  const userSnapshot = await db.collection(UserModel.collectionName).doc(userId).get();
  const user = serializeDocument(userSnapshot);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return getResolvedChatPreferences(user);
}

async function updateUserChatPreferences(userId, payload) {
  const db = getFirestore();
  const userRef = db.collection(UserModel.collectionName).doc(userId);
  const userSnapshot = await userRef.get();
  const user = serializeDocument(userSnapshot);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const nextPreferences = {
    ...getResolvedChatPreferences(user),
    ...payload,
  };

  await userRef.set(
    {
      chatPreferences: nextPreferences,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  return nextPreferences;
}

async function generateProfileAiSuggestion(userId, note) {
  const normalizedNote = String(note || "").trim();

  if (!normalizedNote) {
    throw new ApiError(400, "AI note is required")
  }

  if (!env.groq.apiKey) {
    throw new ApiError(503, "GROQ_API_KEY is required for AI profile suggestions");
  }

  const profile = await getHealthProfile(userId);
  const { default: Groq } = await import("groq-sdk");
  const groq = new Groq({
    apiKey: env.groq.apiKey,
  });

  const completion = await groq.chat.completions.create({
    model: env.groq.chatModel,
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          'You extract health profile updates from a user note. Return strict JSON with shape {"summary": string, "updates": object}. Only include keys from this allowlist when directly supported by the note: age, gender, height, weight, targetWeight, location, city, ethnicityCuisine, activityLevel, goal, dietType, diabetes, hypertension, cholesterol, cancerSurvivor, hrt, otherConditions, allergies, foodDislikes. Use arrays for allergies and foodDislikes. Use null or omit unsupported values. Never invent facts.',
      },
      {
        role: "user",
        content: `Current profile snapshot:\n${JSON.stringify(
          {
            age: profile.age,
            gender: profile.gender,
            height: profile.height,
            weight: profile.weight,
            targetWeight: profile.targetWeight,
            location: profile.location,
            city: profile.city,
            ethnicityCuisine: profile.ethnicityCuisine,
            activityLevel: profile.activityLevel,
            goal: profile.goal,
            dietType: profile.dietType,
            diabetes: profile.diabetes,
            hypertension: profile.hypertension,
            cholesterol: profile.cholesterol,
            cancerSurvivor: profile.cancerSurvivor,
            hrt: profile.hrt,
            otherConditions: profile.otherConditions,
            allergies: profile.allergies,
            foodDislikes: profile.foodDislikes,
          },
          null,
          2
        )}\n\nUser note:\n${normalizedNote}`,
      },
    ],
  });

  const content = completion.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new ApiError(502, "AI profile suggestion was empty");
  }

  let parsed;

  try {
    parsed = JSON.parse(content);
  } catch {
    throw new ApiError(502, "AI profile suggestion could not be parsed");
  }

  return {
    summary:
      typeof parsed.summary === "string" && parsed.summary.trim()
        ? parsed.summary.trim()
        : "The assistant found possible profile updates from your note.",
    updates:
      parsed.updates && typeof parsed.updates === "object" ? parsed.updates : {},
  };
}

module.exports = {
  upsertHealthProfile,
  getHealthProfile,
  generateProfileAiSuggestion,
  getUserChatPreferences,
  updateUserChatPreferences,
};
