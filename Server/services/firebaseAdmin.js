const admin = require("firebase-admin");
const serviceAccount = require("./webbg-project-firebase-adminsdk-fbsvc-1ebffefdca.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;
