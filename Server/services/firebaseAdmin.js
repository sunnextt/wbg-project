const admin = require("firebase-admin");

// Load environment variables
require('dotenv').config();

// Validate that required environment variables exist
if (!process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
  throw new Error(
    'Missing required Firebase environment variables. ' +
    'Please check that FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY are set in your .env file.'
  );
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: "webbg-project",
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
});

module.exports = admin;