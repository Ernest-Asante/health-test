const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json"); // Your Firebase Admin SDK JSON file

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

module.exports = { db };
