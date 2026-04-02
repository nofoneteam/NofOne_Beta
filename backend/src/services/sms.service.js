const twilio = require("twilio");

const env = require("../config/env");
const ApiError = require("../utils/apiError");

const twilioClient =
  env.twilio.accountSid && env.twilio.authToken
    ? twilio(env.twilio.accountSid, env.twilio.authToken)
    : null;

async function sendOtpSms({ to, otp, expiresInMinutes }) {
  if (!twilioClient || !env.twilio.phoneNumber) {
    if (env.nodeEnv !== "production" && env.otp.allowDevFallback) {
      console.log(`[DEV OTP][sms] ${to}: ${otp}`);
      return {
        provider: "development",
        preview: "OTP logged to server console",
      };
    }

    throw new ApiError(
      503,
      "SMS OTP service is not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER"
    );
  }

  const response = await twilioClient.messages.create({
    body: `Your login OTP is ${otp}. It expires in ${expiresInMinutes} minutes.`,
    from: env.twilio.phoneNumber,
    to,
  });

  return {
    provider: "twilio",
    messageId: response.sid,
  };
}

module.exports = {
  sendOtpSms,
};
