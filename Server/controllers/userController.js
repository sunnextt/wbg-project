const User = require("../models/User");
const admin = require("../services/firebaseAdmin");

const getOrCreateUser = async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split("Bearer ")[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    const { uid, email } = decodedToken;

    let user = await User.findOne({ firebaseUID: uid });
    console.log("User found:", user);

    if (!user) {
      user = await User.create({ firebaseUID: uid, email });
      console.log("User created:", user);
    }

    res.json(user);

  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = { getOrCreateUser };
