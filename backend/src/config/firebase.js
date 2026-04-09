const admin = require("firebase-admin");
const path = require("path");
const env = require("./env");

const serviceAccountPath = path.resolve(
  __dirname,
  "../../serviceAccountKey.json"
);

let serviceAccount = null;

try {
  // This follows the local service-account-file setup you asked for.
  serviceAccount = require(serviceAccountPath);
} catch (error) {
  serviceAccount = null;
}

const envServiceAccount =
  env.firebase.projectId &&
  env.firebase.clientEmail &&
  env.firebase.privateKey
    ? {
        projectId: env.firebase.projectId,
        clientEmail: env.firebase.clientEmail,
        privateKey: env.firebase.privateKey,
      }
    : null;

const firebaseCredentials = envServiceAccount || serviceAccount;

if (firebaseCredentials && admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(firebaseCredentials),
  });
}

module.exports = {
  admin,
  db: firebaseCredentials ? admin.firestore() : null,
  isFirebaseConfigured: Boolean(firebaseCredentials),
};
