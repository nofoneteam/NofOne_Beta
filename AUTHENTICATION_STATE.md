# Authentication State Snapshot

Last updated: 2026-05-12

This file describes the current authentication setup only, so the auth flow can be restored to this state later if needed.

## Frontend

- Entry UI: `frontend/none/components/auth/auth-landing.tsx`
- Firebase client setup: `frontend/none/lib/firebase/client.ts`
- Auth API client: `frontend/none/lib/api/auth.ts`
- Token storage: `frontend/none/lib/auth/session.ts`

### Enabled sign-in methods in the current UI

- Google sign-in with Firebase popup
- Phone sign-in with Firebase phone auth + OTP

### Current frontend behavior

- Google sign-in uses Firebase `signInWithPopup(...)`
- After Google popup success, the frontend sends the Firebase `idToken` to `POST /api/auth/google`
- Phone sign-in uses Firebase `signInWithPhoneNumber(...)`
- After phone OTP verification, the frontend sends the Firebase `idToken` to `POST /api/auth/phone`
- Successful auth stores the backend access token in frontend storage and navigates to `/home`
- Referral code is carried into signup requests and cleared after successful signup

### Frontend environment expected

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` optional
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` optional
- `NEXT_PUBLIC_FIREBASE_RECAPTCHA_SITE_KEY` optional in code, but useful when local reCAPTCHA/App Check is expected

## Backend

- Routes: `backend/src/routes/auth.routes.js`
- Controllers: `backend/src/controllers/auth.controller.js`
- Auth service: `backend/src/services/auth.service.js`
- Firebase Admin config: `backend/src/config/firebase.js`

### Active auth endpoints

- `POST /api/auth/signup/request-otp`
- `POST /api/auth/signup/verify-otp`
- `POST /api/auth/login/request-otp`
- `POST /api/auth/login/verify-otp`
- `POST /api/auth/google`
- `POST /api/auth/phone`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Current backend behavior

- Google login verifies Firebase ID tokens and requires `sign_in_provider === "google.com"`
- Phone login verifies Firebase ID tokens and requires `sign_in_provider === "phone"`
- Phone signup blocks existing accounts
- Phone login blocks unknown accounts
- Google login links to an existing user by Firebase UID first, then by email
- Phone login links to an existing user by Firebase UID first, then by phone number
- Backend creates the app session tokens after successful Firebase verification

## Known localhost notes

- Local phone auth may fail with Firebase `auth/invalid-app-credential` if host/domain verification is not accepted by Firebase
- For local testing, use `127.0.0.1` as well as `localhost` in Firebase authorized domains when needed
- Production deployment already works with the current Firebase setup
