const { Resend } = require("resend");

const env = require("../config/env");
const ApiError = require("../utils/apiError");

const resend = env.resend.apiKey ? new Resend(env.resend.apiKey) : null;

async function sendOtpEmail({ to, otp, expiresInMinutes }) {
  if (!resend || !env.resend.fromEmail) {
    if (env.nodeEnv !== "production" && env.otp.allowDevFallback) {
      console.log(`[DEV OTP][email] ${to}: ${otp}`);
      return {
        provider: "development",
        preview: "OTP logged to server console",
      };
    }

    throw new ApiError(
      503,
      "Email OTP service is not configured. Add RESEND_API_KEY and RESEND_FROM_EMAIL"
    );
  }

  const { data, error } = await resend.emails.send({
    from: env.resend.fromEmail,
    to: [to],
    subject: "Your login OTP",
    replyTo: env.resend.fromEmail,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>Your login code</h2>
        <p>Use the OTP below to sign in to your health tracker app.</p>
        <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">${otp}</p>
        <p>This code expires in ${expiresInMinutes} minutes.</p>
      </div>
    `,
  });

  if (error) {
    throw new ApiError(502, `Resend failed to send email: ${error.message}`);
  }

  return {
    provider: "resend",
    messageId: data?.id,
  };
}

async function sendReferralUsedEmail({ to, referrerName, referredUserName, referredUserEmail, referredUserPhoneNumber }) {
  if (!resend || !env.resend.fromEmail) {
    if (env.nodeEnv !== "production" && env.otp.allowDevFallback) {
      console.log(
        `[DEV REFERRAL][email] ${to}: ${referredUserName || "A new user"} signed up using ${referrerName || "your"} referral code.`
      );
      return {
        provider: "development",
        preview: "Referral notification logged to server console",
      };
    }

    throw new ApiError(
      503,
      "Referral email service is not configured. Add RESEND_API_KEY and RESEND_FROM_EMAIL"
    );
  }

  const contactLine = referredUserEmail
    ? `<p><strong>Email:</strong> ${referredUserEmail}</p>`
    : referredUserPhoneNumber
      ? `<p><strong>Phone:</strong> ${referredUserPhoneNumber}</p>`
      : "";

  const { data, error } = await resend.emails.send({
    from: env.resend.fromEmail,
    to: [to],
    subject: "Your referral code was used",
    replyTo: env.resend.fromEmail,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>Your referral was used</h2>
        <p>Hi ${referrerName || "there"},</p>
        <p>${referredUserName || "A new user"} just signed up using your referral link.</p>
        ${contactLine}
        <p>You can open Nofone to see your updated referral activity.</p>
      </div>
    `,
  });

  if (error) {
    throw new ApiError(502, `Resend failed to send email: ${error.message}`);
  }

  return {
    provider: "resend",
    messageId: data?.id,
  };
}

module.exports = {
  sendOtpEmail,
  sendReferralUsedEmail,
};
