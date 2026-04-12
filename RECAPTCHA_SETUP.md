# Firebase Invisible reCAPTCHA v3 Setup Guide

This guide provides step-by-step instructions to set up Firebase's invisible reCAPTCHA v3 for bot protection on your authentication flows.

## What is reCAPTCHA v3?

reCAPTCHA v3 is Google's newest reCAPTCHA technology that:
- **Invisible**: No user interaction required (no checkboxes or puzzles)
- **Detects bots**: Uses advanced AI to identify suspicious activity
- **Score-based**: Returns a confidence score (0.0 to 1.0) instead of pass/fail
- **Seamless**: Users never see a reCAPTCHA challenge

## Setup Steps

### 1. Get reCAPTCHA v3 Keys from Google

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the reCAPTCHA API:
   - Go to "APIs & Services" → "Library"
   - Search for "reCAPTCHA Enterprise API"
   - Click "Enable"
4. Create reCAPTCHA v3 keys:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "API Key"
   - This gives you your **API Key** (used in backend)
5. Set up reCAPTCHA in your project:
   - Go to [reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
   - Click "Create" or "+" to add a new site
   - Fill in:
     - **Label**: Your application name
     - **reCAPTCHA type**: reCAPTCHA v3
     - **Domains**: Add your domains (e.g., `localhost`, `yourdomain.com`)
   - Accept terms and submit
6. Copy your keys:
   - **Site Key**: Public key used in frontend JavaScript
   - **Secret Key**: Private key used in backend verification

### 2. Configure Frontend Environment

Add to your `.env.local` file:

```env
# Firebase reCAPTCHA v3
NEXT_PUBLIC_FIREBASE_RECAPTCHA_SITE_KEY=YOUR_SITE_KEY_HERE
```

### 3. Configure Backend Environment

Add to your `.env` file:

```env
# reCAPTCHA Configuration
RECAPTCHA_SITE_KEY=YOUR_SITE_KEY_HERE
RECAPTCHA_SECRET_KEY=YOUR_SECRET_KEY_HERE
```

### 4. Frontend Integration

The reCAPTCHA is automatically initialized in `app/layout.tsx`. It will:
1. Load the reCAPTCHA script from Google
2. Initialize reCAPTCHA on page load
3. Automatically generate tokens for protected actions

#### Using reCAPTCHA in API Calls

Use the new `apiPost` helper with the `action` parameter:

```typescript
import { apiPost } from "@/lib/api/client-with-recaptcha";

// Sign up with reCAPTCHA
const response = await apiPost(
  "/api/auth/signup",
  {
    email: "user@example.com",
    password: "password123",
  },
  { action: "signup" }
);

// Login with reCAPTCHA
const response = await apiPost(
  "/api/auth/login",
  {
    email: "user@example.com",
  },
  { action: "login" }
);

// Verify OTP with reCAPTCHA
const response = await apiPost(
  "/api/auth/verify-otp",
  {
    email: "user@example.com",
    otp: "123456",
  },
  { action: "verify_otp" }
);
```

#### Manual reCAPTCHA Token Generation

If you need to manually get a reCAPTCHA token:

```typescript
import { executeRecaptcha } from "@/lib/recaptcha";

// Get token for an action
const token = await executeRecaptcha("login");

// Send token to your API
const response = await fetch("/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "user@example.com",
    recaptchaToken: token,
  }),
});
```

### 5. Backend Integration

The backend is already set up to verify reCAPTCHA tokens. The `/src/services/recaptcha.service.js` provides:

#### Verify reCAPTCHA Token

```javascript
const { verifyRecaptchaToken } = require("./services/recaptcha.service");

// Verify with required token
try {
  const result = await verifyRecaptchaToken(token, "login", 0.5);
  console.log("Verified:", result.success);
  console.log("Score:", result.score);
} catch (error) {
  // Handle verification failure
}
```

#### Middleware Protection

```javascript
const { createRecaptchaMiddleware } = require("./services/recaptcha.service");

// Protect a route
app.post(
  "/api/auth/login",
  createRecaptchaMiddleware({ 
    required: false,  // Optional - allow fallback in development
    minScore: 0.5,   // Minimum confidence score
    actionName: "login"
  }),
  loginController
);
```

### 6. Authentication Routes

The `/src/services/auth.service.js` automatically verifies reCAPTCHA tokens in:
- `requestSignupOtp()` - Sign-up OTP requests
- `requestLoginOtp()` - Login OTP requests
- `verifySignupOtp()` - OTP verification for signup
- `verifyLoginOtp()` - OTP verification for login
- `loginWithGoogle()` - Google sign-in
- `loginWithPhone()` - Phone authentication

No changes needed in authentication controllers - verification happens automatically.

## Testing reCAPTCHA

### Development Mode

If reCAPTCHA is not configured or fails in development:
- Frontend: Gracefully falls back - requests work without tokens
- Backend: Verification is skipped in development mode
- No disruption to development workflow

### Production Mode

In production:
- reCAPTCHA verification is required
- Invalid tokens are rejected with HTTP 403
- Missing secret key returns 503 Service Unavailable

### Testing with Minimum Scores

To test bot detection, you can temporarily lower the score threshold in `recaptcha.service.js`:

```javascript
// Test with lower threshold
const result = await verifyRecaptchaToken(token, "login", 0.1);
```

## Score Interpretation

reCAPTCHA v3 returns scores from 0.0 to 1.0:

- **1.0**: Very likely legitimate human
- **0.5**: Uncertain - could be human or bot
- **0.0**: Very likely bot

Recommended thresholds:
- **Signup**: 0.5 (stricter - preventing fake accounts)
- **Login**: 0.7 (more lenient - less friction)
- **Sensitive actions**: 0.9 (very strict)

## Troubleshooting

### "reCAPTCHA token is missing"
- Ensure `NEXT_PUBLIC_FIREBASE_RECAPTCHA_SITE_KEY` is set in frontend `.env.local`
- Check that the domain is added to reCAPTCHA console
- Verify reCAPTCHA script loaded in browser console

### "reCAPTCHA validation failed"
- Check backend has `RECAPTCHA_SECRET_KEY` configured
- Verify token hasn't expired (tokens expire after ~2 minutes)
- Check that action name matches (signup, login, etc.)
- Review score threshold - may be too strict

### "reCAPTCHA not configured"
- Development: This is normal and allowed
- Production: Add both keys to environment variables

## Security Best Practices

1. **Never expose Secret Key**: Keep `RECAPTCHA_SECRET_KEY` in backend only
2. **Use HTTPS**: reCAPTCHA requires secure connections in production
3. **Implement Rate Limiting**: Combine reCAPTCHA with rate limiting
4. **Monitor Scores**: Track reCAPTCHA scores to adjust thresholds
5. **Refresh Tokens**: Tokens expire - regenerate for long-running operations

## Files Modified

- **Frontend**:
  - `lib/recaptcha.ts` - reCAPTCHA token generation utilities
  - `lib/api/client-with-recaptcha.ts` - API client with automatic token injection
  - `lib/config/env.ts` - Environment configuration
  - `app/layout.tsx` - reCAPTCHA script initialization

- **Backend**:
  - `src/services/recaptcha.service.js` - Token verification service
  - `src/services/auth.service.js` - Integrated reCAPTCHA into OTP requests
  - `src/config/env.js` - Environment configuration

## References

- [Google reCAPTCHA v3 Docs](https://developers.google.com/recaptcha/docs/v3)
- [Firebase App Check](https://firebase.google.com/docs/app-check)
- [reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
