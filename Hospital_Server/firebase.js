const admin = require("firebase-admin");
const serviceAccount = JSON.parse(process.env.GOOGLE_CREDENTIALS); // Your Firebase Admin SDK JSON file

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

module.exports = { db };
