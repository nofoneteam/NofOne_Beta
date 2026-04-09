const requiredInProduction = [
  "JWT_SECRET",
  "REFRESH_TOKEN_SECRET",
];

requiredInProduction.forEach((key) => {
  if (process.env.NODE_ENV === "production" && !process.env[key]) {
    throw new Error(`${key} is required in production`);
  }
});

const rawClientUrls = process.env.CLIENT_URL || "";

module.exports = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  jwtSecret: process.env.JWT_SECRET || "development-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  adminBootstrapSecret: process.env.ADMIN_BOOTSTRAP_SECRET,
  reportShareSecret:
    process.env.REPORT_SHARE_SECRET || process.env.JWT_SECRET || "development-secret",
  refreshTokenSecret:
    process.env.REFRESH_TOKEN_SECRET || "development-refresh-secret",
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "30d",
  cookie: {
    accessTokenName: process.env.ACCESS_TOKEN_COOKIE_NAME || "accessToken",
    refreshTokenName: process.env.REFRESH_TOKEN_COOKIE_NAME || "refreshToken",
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  },
  clientUrls: rawClientUrls
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
  chatContextLimit: Number(process.env.CHAT_CONTEXT_LIMIT) || 20,
  chatMemory: {
    recentMessageWindow: Number(process.env.CHAT_RECENT_WINDOW) || 6,
    semanticRecallLimit: Number(process.env.CHAT_SEMANTIC_RECALL_LIMIT) || 4,
    maxPreferenceFacts: Number(process.env.CHAT_MAX_PREFERENCE_FACTS) || 6,
    maxMemoryRecords: Number(process.env.CHAT_MAX_MEMORY_RECORDS) || 120,
    embeddingDimensions: Number(process.env.CHAT_EMBEDDING_DIMENSIONS) || 128,
    minSimilarityScore: Number(process.env.CHAT_MIN_SIMILARITY_SCORE) || 0.2,
    promptRecentTurns: Number(process.env.CHAT_PROMPT_RECENT_TURNS) || 2,
    promptMemoryItems: Number(process.env.CHAT_PROMPT_MEMORY_ITEMS) || 2,
    promptSnippetChars: Number(process.env.CHAT_PROMPT_SNIPPET_CHARS) || 140,
  },
  chatCache: {
    enabled: process.env.CHAT_CACHE_ENABLED !== "false",
    ttlSeconds: Number(process.env.CHAT_CACHE_TTL_SECONDS) || 3600,
    minPromptLength: Number(process.env.CHAT_CACHE_MIN_PROMPT_LENGTH) || 12,
    preferenceSignatureLimit:
      Number(process.env.CHAT_CACHE_PREFERENCE_SIGNATURE_LIMIT) || 3,
    includeDebugResponse: process.env.CHAT_INCLUDE_DEBUG_RESPONSE === "true",
  },
  chatConfig: {
    inMemoryTtlMs: Number(process.env.CHAT_CONFIG_MEMORY_TTL_MS) || 30000,
    redisTtlSeconds: Number(process.env.CHAT_CONFIG_REDIS_TTL_SECONDS) || 300,
  },
  chatContext: {
    redisTtlSeconds: Number(process.env.CHAT_USER_CONTEXT_REDIS_TTL_SECONDS) || 300,
    userLogLimit: Number(process.env.CHAT_USER_LOG_LIMIT) || 3,
    userLogLookbackDays: Number(process.env.CHAT_USER_LOG_LOOKBACK_DAYS) || 14,
  },
  otp: {
    length: Number(process.env.OTP_LENGTH) || 6,
    expiresInMinutes: Number(process.env.OTP_EXPIRES_MINUTES) || 10,
    maxAttempts: Number(process.env.OTP_MAX_ATTEMPTS) || 5,
    allowDevFallback: process.env.OTP_ALLOW_DEV_FALLBACK === "true",
  },
  resend: {
    apiKey: process.env.RESEND_API_KEY,
    fromEmail: process.env.RESEND_FROM_EMAIL,
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
  },
  groq: {
    apiKey: process.env.GROQ_API_KEY,
    chatModel: process.env.HEALTH_CHAT_MODEL || "llama-3.3-70b-versatile",
    visionModel:
      process.env.HEALTH_VISION_MODEL ||
      "meta-llama/llama-4-scout-17b-16e-instruct",
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    chatImageFolder: process.env.CLOUDINARY_CHAT_IMAGE_FOLDER || "nofone/chat",
    medicalReportFolder:
      process.env.CLOUDINARY_MEDICAL_REPORT_FOLDER || "nofone/medical-reports",
    maxUploadBytes: Number(process.env.CLOUDINARY_MAX_UPLOAD_BYTES) || 8 * 1024 * 1024,
  },
  redis: {
    enabled: process.env.REDIS_ENABLED !== "false",
    url: process.env.REDIS_URL,
    keyPrefix: process.env.REDIS_KEY_PREFIX || "nofone",
    connectTimeoutMs: Number(process.env.REDIS_CONNECT_TIMEOUT_MS) || 300,
  },
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
      : undefined,
  },
};
