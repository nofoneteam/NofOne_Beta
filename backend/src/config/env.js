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
  refreshTokenSecret:
    process.env.REFRESH_TOKEN_SECRET || "development-refresh-secret",
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "30d",
  clientUrls: rawClientUrls
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
  chatContextLimit: Number(process.env.CHAT_CONTEXT_LIMIT) || 20,
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
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
      : undefined,
  },
};
