// middlewares/firebaseAuthMiddleware.js
const admin = require('./firebaseAdmin');

const firebaseAuthMiddleware = async (req, res, next) => {
  // Log headers for debugging
  console.log('HEADERS (firebaseAuthMiddleware):', req.headers);
  
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).send('Authorization (Bearer ) header missing');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying Firebase token:', error);
    res.status(401).send('Invalid token');
  }
};

module.exports = firebaseAuthMiddleware;
