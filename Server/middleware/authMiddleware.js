const admin = require('../services/firebaseAdmin')

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = await admin.auth().verifyIdToken(token)
    req.user = decoded 
    next()
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' })
  }
}

module.exports = protect
