const admin = require("firebase-admin");
const serviceAccount = require("./webbg-project-firebase-adminsdk-fbsvc-15099ff399.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;
