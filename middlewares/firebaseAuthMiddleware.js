// middlewares/firebaseAuthMiddleware.js
const admin = require('./firebaseAdmin');

const firebaseAuthMiddleware = async (req, res, next) => {
  // Log headers for debugging
  console.log('HEADERS (firebaseAuthMiddleware):', req.headers);
  
  const idToken = req.headers.authorization?.split('Bearer ')[1];
  if (!idToken) {
    return res.status(401).json({ error: 'Unauthorized! MISSING BEARER TOKEN' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
};

module.exports = firebaseAuthMiddleware;
