const { db, isFirebaseConfigured } = require("../config/firebase");
const ApiError = require("./apiError");

function getFirestore() {
  if (!isFirebaseConfigured || !db) {
    throw new ApiError(
      503,
      "Firebase is not configured on the server. Add Firebase Admin credentials in the environment."
    );
  }

  return db;
}

function serializeDocument(documentSnapshot) {
  if (!documentSnapshot || !documentSnapshot.exists) {
    return null;
  }

  const data = documentSnapshot.data();

  return {
    id: documentSnapshot.id,
    ...data,
  };
}

function serializeQuerySnapshot(querySnapshot) {
  return querySnapshot.docs.map(serializeDocument);
}

module.exports = {
  getFirestore,
  serializeDocument,
  serializeQuerySnapshot,
};
