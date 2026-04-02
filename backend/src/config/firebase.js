const admin = require("firebase-admin");
const path = require("path");

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

if (serviceAccount && admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

module.exports = {
  admin,
  db: serviceAccount ? admin.firestore() : null,
  isFirebaseConfigured: Boolean(serviceAccount),
};
