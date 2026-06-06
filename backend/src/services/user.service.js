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

const VALID_GOALS = new Set([
  "loss",
  "gain",
  "maintain",
  "lose_weight",
  "gain_weight",
]);

const VALID_ACTIVITY_LEVELS = new Set([
  "sedentary",
  "light",
  "moderate",
  "active",
  "very_active",
]);

const VALID_BOOLEAN_CHOICES = new Set(["yes", "no"]);
const KNOWN_DIET_TYPES = [
  "Balanced",
  "High-Protein",
  "Low-Carb",
  "Low-Fat",
  "Low-Sodium",
  "Diabetic-Friendly",
  "Heart-Healthy",
  "Keto",
  "Vegan",
  "Vegetarian",
  "Pescatarian",
  "Paleo",
  "Mediterranean",
  "Low-FODMAP",
  "Gluten-Free",
  "Dairy-Free",
  "Jain",
  "Halal",
  "Kosher",
  "Intermittent Fasting",
];
const COMMAND_OR_GOAL_PATTERNS = [
  /\btraining\b/i,
  /\bmarathon\b/i,
  /\bcompetition\b/i,
  /\bdaily goals?\b/i,
  /\bset my\b/i,
  /\bwant my\b/i,
  /\bprofile\b/i,
  /\bgoal\b/i,
  /\bactivity\b/i,
  /\bdeadlift\b/i,
];
const COMMON_ALLERGEN_TERMS = new Set([
  "peanut",
  "peanuts",
  "tree nuts",
  "nuts",
  "almonds",
  "cashews",
  "walnuts",
  "milk",
  "dairy",
  "lactose",
  "soy",
  "gluten",
  "wheat",
  "egg",
  "eggs",
  "shellfish",
  "shrimp",
  "prawn",
  "fish",
  "sesame",
]);

function mergeStringLists(...lists) {
  return Array.from(
    new Set(
      lists
        .flat()
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    )
  ).slice(0, 20);
}

function extractDelimitedList(note, patterns) {
  for (const pattern of patterns) {
    const match = note.match(pattern);

    if (!match?.[1]) {
      continue;
    }

    return match[1]
      .split(/,| and /i)
      .map((item) => item.trim().replace(/\.$/, ""))
      .filter(Boolean);
  }

  return [];
}

function mergeConditionStrings(...values) {
  const parts = Array.from(
    new Set(
      values
        .flatMap((value) =>
          String(value || "")
            .split(/,|;/)
            .map((item) => item.trim())
            .filter(Boolean)
        )
    )
  );

  return parts.length ? parts.join(", ") : undefined;
}

function isCommandOrGoalPhrase(value) {
  return COMMAND_OR_GOAL_PATTERNS.some((pattern) => pattern.test(value));
}

function sanitizeProfileListItems(value, kind) {
  if (!Array.isArray(value)) {
    return {
      items: undefined,
      reroutedConditions: [],
    };
  }

  const cleanedItems = [];
  const reroutedConditions = [];

  for (const rawItem of value) {
    const item = String(rawItem || "")
      .trim()
      .replace(/^[,.\s]+|[,.\s]+$/g, "");

    if (!item) {
      continue;
    }

    const lowerItem = item.toLowerCase();

    if (isCommandOrGoalPhrase(lowerItem)) {
      continue;
    }

    if (kind === "allergies" && /\bintolerant\b|\bintolerance\b/.test(lowerItem)) {
      reroutedConditions.push(item);
      continue;
    }

    if (item.length > 40 && !/\bfree\b/.test(lowerItem)) {
      continue;
    }

    cleanedItems.push(item);
  }

  return {
    items: cleanedItems.length ? cleanedItems.slice(0, 20) : undefined,
    reroutedConditions,
  };
}

function extractShorthandProfileUpdates(note) {
  const segments = String(note || "")
    .split(/,|\n/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (!segments.length) {
    return {};
  }

  const nextUpdates = {};
  const shorthandAllergies = [];
  const shorthandConditions = [];

  for (const segment of segments) {
    const lowerSegment = segment.toLowerCase();

    if (isCommandOrGoalPhrase(lowerSegment)) {
      continue;
    }

    if (/\bintolerant\b|\bintolerance\b/.test(lowerSegment)) {
      shorthandConditions.push(segment);
      continue;
    }

    if (COMMON_ALLERGEN_TERMS.has(lowerSegment)) {
      shorthandAllergies.push(segment);
    }
  }

  if (shorthandAllergies.length) {
    nextUpdates.allergies = shorthandAllergies;
  }

  if (shorthandConditions.length) {
    nextUpdates.otherConditions = shorthandConditions.join(", ");
  }

  return nextUpdates;
}

function normalizeGoalValue(value, note = "") {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (VALID_GOALS.has(normalized)) {
    return normalized;
  }

  if (
    normalized.includes("lose") ||
    normalized.includes("fat_loss") ||
    normalized.includes("weight_loss") ||
    normalized.includes("cut")
  ) {
    return "lose_weight";
  }

  if (
    normalized.includes("gain") ||
    normalized.includes("bulk") ||
    normalized.includes("muscle")
  ) {
    return "gain_weight";
  }

  if (normalized.includes("maint") || /marathon|race|endurance|training/i.test(note)) {
    return "maintain";
  }

  return undefined;
}

function normalizeActivityLevelValue(value, note = "") {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  const combined = `${normalized} ${String(note || "").toLowerCase()}`;

  if (VALID_ACTIVITY_LEVELS.has(normalized)) {
    return normalized;
  }

  if (/desk|office|sedentary/.test(normalized)) {
    return "sedentary";
  }

  if (/walk|walking|light/.test(normalized)) {
    return "light";
  }

  if (/gym|workout|exercise|moderate/.test(normalized)) {
    return "moderate";
  }

  if (/marathon|runner|running|endurance|triathlon|active/.test(combined)) {
    return "active";
  }

  if (/athlete|twice_a_day|intense|competitive/.test(combined)) {
    return "very_active";
  }

  return undefined;
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 20);
}

function normalizePositiveNumber(value) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }

  return Number(parsed.toFixed(1));
}

function extractRuleBasedProfileUpdates(note) {
  const normalizedNote = String(note || "").trim();
  const lowerNote = normalizedNote.toLowerCase();

  if (!lowerNote) {
    return {};
  }

  const nextUpdates = {};

  if (/\b(i am|i'm|im)\s+diabetic\b|\bdiabetes\b/.test(lowerNote) &&
      !/\bno diabetes\b|\bnot diabetic\b|\bnon-diabetic\b/.test(lowerNote)) {
    nextUpdates.diabetes = "yes";
  }

  if (/\bhypertension\b|\bhigh blood pressure\b/.test(lowerNote) &&
      !/\bno hypertension\b|\bno high blood pressure\b/.test(lowerNote)) {
    nextUpdates.hypertension = "yes";
  }

  if (/\bcancer survivor\b/.test(lowerNote)) {
    nextUpdates.cancerSurvivor = "yes";
  }

  if (/\bhrt\b|\bhormone replacement therapy\b/.test(lowerNote)) {
    nextUpdates.hrt = "yes";
  }

  const explicitAllergies = extractDelimitedList(normalizedNote, [
    /\ballergic to\s+(.+?)(?:[.!?]|$)/i,
    /\ballergies?\s*:\s*(.+?)(?:[.!?]|$)/i,
  ]);

  if (explicitAllergies.length) {
    nextUpdates.allergies = explicitAllergies;
  }

  const explicitDislikes = extractDelimitedList(normalizedNote, [
    /\bfood dislikes?\s*:\s*(.+?)(?:[.!?]|$)/i,
    /\bi dislike\s+(.+?)(?:[.!?]|$)/i,
    /\bi do not like\s+(.+?)(?:[.!?]|$)/i,
  ]);

  if (explicitDislikes.length) {
    nextUpdates.foodDislikes = explicitDislikes;
  }

  const matchedDietType = KNOWN_DIET_TYPES.find((dietType) =>
    lowerNote.includes(dietType.toLowerCase())
  );

  if (matchedDietType) {
    nextUpdates.dietType = matchedDietType;
  }

  if (/\bdeadlift\b|\bpowerlifting\b|\bstrength competition\b/.test(lowerNote)) {
    nextUpdates.activityLevel = "very_active";
    nextUpdates.goal = "gain_weight";
  } else if (/\bmarathon\b|\btriathlon\b|\brunning race\b|\bendurance event\b/.test(lowerNote)) {
    nextUpdates.activityLevel = "active";
    nextUpdates.goal = "maintain";
  }

  const shorthandUpdates = extractShorthandProfileUpdates(normalizedNote);

  if (shorthandUpdates.allergies?.length) {
    nextUpdates.allergies = mergeStringLists(
      nextUpdates.allergies,
      shorthandUpdates.allergies
    );
  }

  if (shorthandUpdates.otherConditions) {
    nextUpdates.otherConditions = mergeConditionStrings(
      nextUpdates.otherConditions,
      shorthandUpdates.otherConditions
    );
  }

  return nextUpdates;
}

function sanitizeProfileAiUpdates(updates, note) {
  if (!updates || typeof updates !== "object") {
    return {};
  }

  const nextUpdates = {};

  const age = Number(updates.age);
  if (Number.isInteger(age) && age > 0) {
    nextUpdates.age = age;
  }

  const height = normalizePositiveNumber(updates.height);
  if (height !== undefined) {
    nextUpdates.height = height;
  }

  const weight = normalizePositiveNumber(updates.weight);
  if (weight !== undefined) {
    nextUpdates.weight = weight;
  }

  const targetCalories = normalizePositiveNumber(updates.targetCalories);
  if (targetCalories !== undefined) {
    nextUpdates.targetCalories = targetCalories;
  }

  const targetBurn = normalizePositiveNumber(updates.targetBurn);
  if (targetBurn !== undefined) {
    nextUpdates.targetBurn = targetBurn;
  }

  const targetCarbs = normalizePositiveNumber(updates.targetCarbs);
  if (targetCarbs !== undefined) {
    nextUpdates.targetCarbs = targetCarbs;
  }

  const targetProtein = normalizePositiveNumber(updates.targetProtein);
  if (targetProtein !== undefined) {
    nextUpdates.targetProtein = targetProtein;
  }

  const targetFat = normalizePositiveNumber(updates.targetFat);
  if (targetFat !== undefined) {
    nextUpdates.targetFat = targetFat;
  }

  const goal = normalizeGoalValue(updates.goal, note);
  if (goal) {
    nextUpdates.goal = goal;
  }

  const activityLevel = normalizeActivityLevelValue(updates.activityLevel, note);
  if (activityLevel) {
    nextUpdates.activityLevel = activityLevel;
  }

  for (const key of [
    "gender",
    "location",
    "city",
    "ethnicityCuisine",
    "dietType",
    "cholesterol",
    "otherConditions",
  ]) {
    if (typeof updates[key] === "string" && updates[key].trim()) {
      nextUpdates[key] = updates[key].trim();
    }
  }

  for (const key of ["diabetes", "hypertension", "cancerSurvivor", "hrt"]) {
    const normalized = String(updates[key] || "").trim().toLowerCase();
    if (VALID_BOOLEAN_CHOICES.has(normalized)) {
      nextUpdates[key] = normalized;
    }
  }

  const allergyResult = sanitizeProfileListItems(updates.allergies, "allergies");
  if (allergyResult.items !== undefined) {
    nextUpdates.allergies = allergyResult.items;
  }

  const dislikeResult = sanitizeProfileListItems(updates.foodDislikes, "foodDislikes");
  if (dislikeResult.items !== undefined) {
    nextUpdates.foodDislikes = dislikeResult.items;
  }

  const reroutedConditions = mergeConditionStrings(
    nextUpdates.otherConditions,
    allergyResult.reroutedConditions,
    dislikeResult.reroutedConditions
  );
  if (reroutedConditions) {
    nextUpdates.otherConditions = reroutedConditions;
  }

  return nextUpdates;
}

async function upsertHealthProfile(userId, payload) {
  console.log(`[Profile Update] Starting profile update for user: ${userId}`);
  console.log(`[Profile Update] Incoming payload:`, JSON.stringify(payload, null, 2));

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

  console.log(`[Profile Update] Computed DB payload:`, JSON.stringify(profilePayload, null, 2));

  await profileRef.set(profilePayload, { merge: true });
  console.log(`[Profile Update] Successfully saved profile for user: ${userId}`);
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
      targetCalories: null,
      targetBurn: null,
      targetCarbs: null,
      targetProtein: null,
      targetFat: null,
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
          'You are an expert nutritionist extracting and generating health profile updates from a user note for a wellness app. Return strict JSON with shape {"summary": string, "updates": object}. Only include keys from this allowlist: age, gender, height, weight, targetCalories, targetBurn, targetCarbs, targetProtein, targetFat, location, city, ethnicityCuisine, activityLevel, goal, dietType, diabetes, hypertension, cholesterol, cancerSurvivor, hrt, otherConditions, allergies, foodDislikes. Use arrays for allergies and foodDislikes. Use null or omit unsupported values.\n\nYour job is to:\n1. Extract explicit profile schema facts from the note.\n2. INFER missing fitness direction (e.g., "marathon training" implies an "active" routine and "maintain" goal).\n3. EXPLICITLY CALCULATE AND GENERATE daily goal targets (`targetCalories`, `targetBurn`, `targetCarbs`, `targetProtein`, `targetFat`) if the user shares a goal, activity, or explicitly asks for targets (e.g. "preparing for a hackathon", "set my daily goals"). Act as a nutritionist: calculate these targets based on their provided weight, height, age, gender, and inferred activity level. DO NOT leave them null if you have enough context to generate a tailored recommendation.\n\nIn the summary, briefly state what was captured, and explicitly mention the daily macro targets you generated for them.',
      },
      {
        role: "user",
        content: `Current profile snapshot:\n${JSON.stringify(
          {
            age: profile.age,
            gender: profile.gender,
            height: profile.height,
            weight: profile.weight,
            targetCalories: profile.targetCalories,
            targetBurn: profile.targetBurn,
            targetCarbs: profile.targetCarbs,
            targetProtein: profile.targetProtein,
            targetFat: profile.targetFat,
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

  const sanitizedAiUpdates = sanitizeProfileAiUpdates(parsed.updates, normalizedNote);
  const ruleBasedUpdates = sanitizeProfileAiUpdates(
    extractRuleBasedProfileUpdates(normalizedNote),
    normalizedNote
  );

  return {
    summary:
      typeof parsed.summary === "string" && parsed.summary.trim()
        ? parsed.summary.trim()
        : "The assistant found possible profile updates from your note.",
    updates: {
      ...sanitizedAiUpdates,
      ...ruleBasedUpdates,
      allergies: mergeStringLists(sanitizedAiUpdates.allergies, ruleBasedUpdates.allergies),
      foodDislikes: mergeStringLists(
        sanitizedAiUpdates.foodDislikes,
        ruleBasedUpdates.foodDislikes
      ),
    },
  };
}

module.exports = {
  upsertHealthProfile,
  getHealthProfile,
  generateProfileAiSuggestion,
  getUserChatPreferences,
  updateUserChatPreferences,
};
