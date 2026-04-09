# Nofone Backend

Production-ready Node.js + Express backend for an AI-powered health and calorie tracker.

This backend currently uses:

- Firebase Admin SDK for authentication verification and Firestore storage
- OTP authentication with email via Resend
- OTP authentication with phone via Twilio
- Google sign-in via Firebase ID token verification
- JWT access tokens and refresh-session handling
- Firestore for users, health profiles, logs, chat history, OTP records, and sessions

## Features

- Email OTP login/signup
- Phone OTP login/signup
- Google OAuth login through Firebase
- Access token + refresh token flow
- Session refresh and logout
- Health profile APIs
- Daily nutrition and exercise logs
- User-scoped chat history for future LLM context
- Request validation
- Rate limiting
- Request logging
- Centralized error handling

## Tech Stack

- Node.js
- Express.js
- Firebase Admin SDK
- Firestore
- JWT
- Resend
- Twilio

## Project Structure

```text
.
├── src/
│   ├── config/
│   ├── controllers/
│   ├── middlewares/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── validations/
│   └── app.js
├── server.js
├── serviceAccountKey.json
├── package.json
└── README.md
```

## Installation

```bash
npm install
```

## Running The Server

Development:

```bash
npm run dev
```

Production:

```bash
npm start
```

Sanity check:

```bash
npm run check
```

Default health endpoint:

```http
GET /health
```

## Environment Variables

Create a `.env` file in the backend root.

Use placeholders like this:

```env
PORT=8080
NODE_ENV=development
CLIENT_URL=http://localhost:3000

JWT_SECRET=replace-with-a-strong-secret
JWT_EXPIRES_IN=7d
ADMIN_BOOTSTRAP_SECRET=replace-with-a-long-random-secret
REPORT_SHARE_SECRET=replace-with-a-long-random-secret
REFRESH_TOKEN_SECRET=replace-with-another-strong-secret
REFRESH_TOKEN_EXPIRES_IN=30d

CHAT_CONTEXT_LIMIT=20
CHAT_RECENT_WINDOW=6
CHAT_SEMANTIC_RECALL_LIMIT=4
CHAT_MAX_PREFERENCE_FACTS=6
CHAT_MAX_MEMORY_RECORDS=120
CHAT_EMBEDDING_DIMENSIONS=128
CHAT_MIN_SIMILARITY_SCORE=0.2
CHAT_PROMPT_RECENT_TURNS=2
CHAT_PROMPT_MEMORY_ITEMS=2
CHAT_PROMPT_SNIPPET_CHARS=140
CHAT_CACHE_ENABLED=true
CHAT_CACHE_TTL_SECONDS=3600
CHAT_CACHE_MIN_PROMPT_LENGTH=12
CHAT_CACHE_PREFERENCE_SIGNATURE_LIMIT=3
CHAT_INCLUDE_DEBUG_RESPONSE=false
CHAT_CONFIG_MEMORY_TTL_MS=30000
CHAT_CONFIG_REDIS_TTL_SECONDS=300
CHAT_USER_CONTEXT_REDIS_TTL_SECONDS=300
CHAT_USER_LOG_LIMIT=3

REDIS_ENABLED=true
REDIS_URL=redis://127.0.0.1:6379
REDIS_KEY_PREFIX=nofone
REDIS_CONNECT_TIMEOUT_MS=300

CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
CLOUDINARY_CHAT_IMAGE_FOLDER=nofone/chat
CLOUDINARY_MAX_UPLOAD_BYTES=8388608

OTP_LENGTH=6
OTP_EXPIRES_MINUTES=10
OTP_MAX_ATTEMPTS=5
OTP_ALLOW_DEV_FALLBACK=true

RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=Acme <onboarding@resend.dev>

TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

Important:

- Do not commit `.env`
- Do not commit `serviceAccountKey.json`
- Rotate any secrets that were exposed during testing

## Firebase Setup

This backend is configured to load Firebase Admin credentials from:

```text
serviceAccountKey.json
```

Place the Firebase service account JSON file in the backend root:

```text
/backend/serviceAccountKey.json
```

The Firebase Admin initialization is handled in [src/config/firebase.js](/Users/anubhavmishra/Documents/2026_Projects/nofone/backend/src/config/firebase.js).

### Steps

1. Open [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to `Project settings`
4. Open `Service accounts`
5. Click `Generate new private key`
6. Save the downloaded JSON as `serviceAccountKey.json` in the backend root

## Firestore Setup

Firestore must be enabled for your Firebase project.

### Steps

1. Open [Google Cloud Firestore API](https://console.developers.google.com/apis/api/firestore.googleapis.com/overview)
2. Select your Firebase project
3. Click `Enable`
4. Open Firebase Console
5. Go to `Build` -> `Firestore Database`
6. Click `Create database`
7. Choose a mode and region
8. Wait a few minutes for propagation

## Authentication Flows

### 1. Email OTP Login / Signup

1. Client calls `POST /api/auth/request-otp`
2. Backend stores OTP metadata in Firestore
3. Backend sends OTP through Resend
4. Client calls `POST /api/auth/verify-otp`
5. Backend creates or updates the user
6. Backend creates a refresh session
7. Backend returns `accessToken`, `refreshToken`, and `user`

### 2. Phone OTP Login / Signup

1. Client calls `POST /api/auth/request-otp`
2. Backend stores OTP metadata in Firestore
3. Backend sends OTP through Twilio
4. Client calls `POST /api/auth/verify-otp`
5. Backend creates or updates the user
6. Backend creates a refresh session
7. Backend returns `accessToken`, `refreshToken`, and `user`

### 3. Google Login

1. Frontend authenticates the user with Firebase client SDK
2. User completes the Google popup OAuth flow in the browser
3. Frontend gets Firebase ID token from the signed-in Firebase user
4. Frontend sends `idToken` to `POST /api/auth/google`
5. Backend verifies the Firebase ID token
6. Backend creates or updates the user
7. Backend creates a refresh session
8. Backend returns `accessToken`, `refreshToken`, and `user`

### 4. Refresh Session

1. Client sends `refreshToken` to `POST /api/auth/refresh`
2. Backend validates the refresh session
3. Backend rotates the refresh token
4. Backend returns a new `accessToken` and `refreshToken`

### 5. Logout

1. Client sends `refreshToken` to `POST /api/auth/logout`
2. Backend revokes the refresh session

## API Endpoints

### Auth

- `POST /api/auth/request-otp`
- `POST /api/auth/verify-otp`
- `POST /api/auth/google`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### User

- `POST /api/user/profile`
- `GET /api/user/profile`

### Logs

- `POST /api/logs`
- `GET /api/logs/:date`
- `GET /api/logs/dashboard`
- `GET /api/logs/weight-tracker`
- `GET /api/logs/weekly-summary`
- `GET /api/logs/weekly-report`
- `POST /api/logs/share-report`
- `GET /api/logs/shared/:token`

### Chat

- `POST /api/chat`

### Admin

- `POST /api/admin/bootstrap`
- `PATCH /api/admin/users/:userId/role`
- `GET /api/admin/chat-config`
- `PUT /api/admin/chat-config`

Sample authenticated chat request:

```http
POST /api/chat
Authorization: Bearer <access-token>
Content-Type: application/json
```

```json
{
  "type": "text",
  "message": "I am vegetarian and prefer short answers. Suggest a high-protein breakfast."
}
```

Caching notes:

- Same-user repeated prompts can return from the recent session cache path
- Cross-user repeated text prompts can return from Redis when `REDIS_URL` is configured
- Debug context is omitted by default to reduce latency and payload size
- User profile and recent logs are compacted into a cached user-context summary for personalization with low token cost

Chat image upload:

- `POST /api/chat` also accepts `multipart/form-data`
- File field name: `image`
- Allowed types: `jpg`, `jpeg`, `png`, `webp`, `avif`
- The backend uploads the file to Cloudinary via Multer and stores the resulting URL in chat metadata

Firestore chat prompt config:

- Collection: `appConfig`
- Document id: `chatAssistant`
- Fields:

```json
{
  "systemPrompt": "Your health assistant system prompt for text chat.",
  "imageSystemPrompt": "Your health assistant system prompt for image chat."
}
```

If this document is missing, the backend falls back to its built-in default prompts.

Admin bootstrap flow:

1. Log in as a normal user
2. Call `POST /api/admin/bootstrap` with your auth cookie or bearer token
3. Send:

```json
{
  "bootstrapSecret": "your-admin-bootstrap-secret"
}
```

4. After that, the same user is treated as `role=admin`

Admin prompt update request:

```http
PUT /api/admin/chat-config
Content-Type: application/json
```

```json
{
  "systemPrompt": "You are Nofone's health assistant. Be concise and practical. Do not mention consulting professionals unless there is an emergency.",
  "imageSystemPrompt": "You are Nofone's health assistant for meal and fitness images. Use the image tool, be concise and practical, and do not mention consulting professionals unless there is an emergency."
}
```

## Request Examples

### Request Email OTP

```http
POST /api/auth/request-otp
Content-Type: application/json
```

```json
{
  "email": "user@example.com",
  "name": "Anubhav"
}
```

### Verify Email OTP

```http
POST /api/auth/verify-otp
Content-Type: application/json
```

```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

### Request Phone OTP

```json
{
  "phoneNumber": "+919999999999",
  "name": "Anubhav"
}
```

### Verify Phone OTP

```json
{
  "phoneNumber": "+919999999999",
  "otp": "123456"
}
```

### Google Login

```json
{
  "idToken": "firebase-id-token-from-client"
}
```

### Refresh Session

```json
{
  "refreshToken": "your-refresh-token"
}
```

### Logout

```json
{
  "refreshToken": "your-refresh-token"
}
```

## Using Protected Routes

Send the access token in the `Authorization` header:

```http
Authorization: Bearer <accessToken>
```

## Firestore Collections

This backend uses these Firestore collections:

- `users`
- `healthProfiles`
- `dailyLogs`
- `chatMessages`
- `otpCodes`
- `sessions`

## Chat Context Behavior

Chat history is stored per authenticated user and fetched in chronological order before generating the mock AI reply.

This makes it ready for real LLM integration later, because previous user-specific messages can be passed as prompt context.

Main chat logic lives in [src/services/chat.service.js](/Users/anubhavmishra/Documents/2026_Projects/nofone/backend/src/services/chat.service.js).

## Email Delivery Notes

For Resend sandbox testing, use:

```env
RESEND_FROM_EMAIL=Acme <onboarding@resend.dev>
```

Recommended sandbox delivery test target:

```text
delivered@resend.dev
```

For real email delivery, configure and verify your own sending domain in Resend.

## Phone Delivery Notes

Use E.164 phone format for Twilio:

```text
+919999999999
```

## Development Notes

- If `OTP_ALLOW_DEV_FALLBACK=true`, the app can log OTPs to the console when email or SMS is not fully configured
- Firestore must be enabled before the backend can read or write user data
- Google login testing is easiest from a frontend app, because Firebase ID tokens are normally generated client-side

## Postman Test Flow

Suggested variables:

- `baseUrl`
- `email`
- `phoneNumber`
- `accessToken`
- `refreshToken`
- `firebaseIdToken`

Suggested sequence:

1. `POST /api/auth/request-otp`
2. `POST /api/auth/verify-otp`
3. `GET /api/auth/me`
4. `POST /api/auth/refresh`
5. `POST /api/auth/logout`

## Security Notes

- Never expose Twilio, Resend, JWT, or Firebase secrets publicly
- Rotate any secrets that were accidentally shared
- Keep `serviceAccountKey.json` private
- Prefer strong random values for JWT secrets in production

## Scripts

- `npm run dev` starts the server with nodemon
- `npm start` starts the server in normal mode
- `npm run check` loads the app module to catch wiring errors quickly
