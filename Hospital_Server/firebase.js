const admin = require("firebase-admin");

let serviceAccount;

// Check if the GOOGLE_CREDENTIALS environment variable exists
if (process.env.GOOGLE_CREDENTIALS) {
    try {
        // Parse the JSON string from the environment variable
        serviceAccount = JSON.parse(process.env.GOOGLE_CREDENTIALS);
        console.log("Firebase Admin SDK: Service account loaded from GOOGLE_CREDENTIALS environment variable.");
    } catch (error) {
        console.error("Firebase Admin SDK: Error parsing GOOGLE_CREDENTIALS environment variable:", error);
        // Optionally, you might want to exit the process or throw an error if this is critical
        process.exit(1);
    }
} else {
    // Fallback for local development (if serviceAccountKey.json exists)
    // IMPORTANT: This 'require' should NOT be used in production on Render with the env var setup.
    // It's here purely for local convenience if you test without setting the env var.
    try {
        serviceAccount = require("./serviceAccountKey.json");
        console.warn("Firebase Admin SDK: Using local serviceAccountKey.json. Remember to set GOOGLE_CREDENTIALS in production.");
    } catch (error) {
        console.error("Firebase Admin SDK: serviceAccountKey.json not found and GOOGLE_CREDENTIALS is not set. Cannot initialize Firebase.");
        // Exit or throw if Firebase is essential for your app to run
        process.exit(1);
    }
}

// Initialize Firebase Admin SDK only if serviceAccount was successfully loaded
if (serviceAccount) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
    console.log("Firebase Admin SDK initialized successfully.");
} else {
    console.error("Firebase Admin SDK: Initialization failed. No service account credentials found.");
    process.exit(1); // Exit if Firebase is critical and couldn't be initialized
}


const db = admin.firestore();

module.exports = { db };
