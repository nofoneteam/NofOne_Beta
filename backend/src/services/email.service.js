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

async function sendAdminPromotionEmail({ to, promotedUserName, grantedByName }) {
  if (!resend || !env.resend.fromEmail) {
    if (env.nodeEnv !== "production" && env.otp.allowDevFallback) {
      console.log(
        `[DEV ADMIN PROMOTION][email] ${to}: ${promotedUserName || "A user"} was granted admin access by ${grantedByName || "the Nofone team"}.`
      );
      return {
        provider: "development",
        preview: "Admin promotion notification logged to server console",
      };
    }

    throw new ApiError(
      503,
      "Admin email service is not configured. Add RESEND_API_KEY and RESEND_FROM_EMAIL"
    );
  }

  const firstName = promotedUserName?.trim()?.split(/\s+/)[0] || "there";
  const granter = grantedByName?.trim() || "the Nofone team";

  const { data, error } = await resend.emails.send({
    from: env.resend.fromEmail,
    to: [to],
    subject: "You now have admin access to Nofone",
    replyTo: env.resend.fromEmail,
    html: `
      <div style="margin:0;padding:0;background:#f4f7f2;">
        <div style="max-width:680px;margin:0 auto;padding:32px 18px;font-family:Arial,Helvetica,sans-serif;color:#163127;">
          <div style="overflow:hidden;border:1px solid #d7e8da;border-radius:28px;background:#ffffff;box-shadow:0 24px 60px rgba(9,30,18,0.10);">
            <div style="position:relative;padding:40px 40px 28px;background:linear-gradient(135deg,#0f5b34 0%,#4bb06d 52%,#dff4e4 100%);color:#ffffff;">
              <div style="display:inline-block;padding:8px 14px;border-radius:999px;background:rgba(255,255,255,0.16);font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;">Nofone Admin Access</div>
              <h1 style="margin:18px 0 10px;font-size:34px;line-height:1.08;font-weight:800;">You’ve been promoted to admin</h1>
              <p style="margin:0;max-width:440px;font-size:16px;line-height:1.6;color:rgba(255,255,255,0.92);">Your account can now manage the Nofone admin dashboard, team access, and assistant prompt settings.</p>
              <svg width="180" height="180" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg" style="position:absolute;right:-18px;top:-4px;opacity:0.22">
                <circle cx="90" cy="90" r="72" stroke="white" stroke-width="2"/>
                <circle cx="90" cy="90" r="48" stroke="white" stroke-width="2"/>
                <path d="M90 40L102.5 74.5H139L109.5 95.5L121 130L90 109L59 130L70.5 95.5L41 74.5H77.5L90 40Z" fill="white"/>
              </svg>
            </div>
            <div style="padding:34px 40px 40px;">
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#234032;">Hi ${firstName},</p>
              <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#426052;">${granter} granted you admin access in Nofone. You can now switch into the admin app from the sidebar and manage analytics, prompts, and admin access.</p>
              <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:24px 0;">
                <div style="border:1px solid #e2efe4;border-radius:20px;padding:16px;background:#f8fcf8;">
                  <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#62806d;">Analytics</div>
                  <div style="margin-top:8px;font-size:14px;line-height:1.6;color:#234032;">Track signup growth, referral activity, and recent user events.</div>
                </div>
                <div style="border:1px solid #e2efe4;border-radius:20px;padding:16px;background:#f8fcf8;">
                  <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#62806d;">Admins</div>
                  <div style="margin-top:8px;font-size:14px;line-height:1.6;color:#234032;">Grant or revoke admin access for trusted team members.</div>
                </div>
                <div style="border:1px solid #e2efe4;border-radius:20px;padding:16px;background:#f8fcf8;">
                  <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#62806d;">Prompts</div>
                  <div style="margin-top:8px;font-size:14px;line-height:1.6;color:#234032;">Adjust the text and image prompts used by the chatbot.</div>
                </div>
              </div>
              <div style="border-radius:24px;background:linear-gradient(180deg,#f7fbf7 0%,#edf6ef 100%);padding:20px 22px;border:1px solid #deebdf;">
                <p style="margin:0;font-size:13px;line-height:1.7;color:#4b6757;">If you weren’t expecting this change, contact your Nofone team lead immediately so access can be reviewed.</p>
              </div>
            </div>
          </div>
        </div>
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
  sendAdminPromotionEmail,
};
