// middlewares/auth.js
const admin = require('firebase-admin');

// Initialize Firebase Admin with your project credentials
const serviceAccount = require('../path/to/your-firebase-adminsdk.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Middleware to validate Firebase ID tokens
const checkAuth = async (req, res, next) => {
  const idToken = req.headers.authorization;
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    res.status(401).send({ message: 'Unauthorized' });
  }
};

module.exports = { checkAuth };
