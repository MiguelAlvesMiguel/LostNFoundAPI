// middlewares/policeAuth.js
const pool = require('../db');
const admin = require('./firebaseAdmin');

// Middleware to check if user is a police member
const policeAuthMiddleware = async (req, res, next) => {
  // Log headers for debugging
  console.log('HEADERS (policeAuthMiddleware):', req.headers);

  const idToken = req.headers.authorization?.split('Bearer ')[1];
  console.log("Bearer:", idToken);  // Debug log

  if (!idToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const firebaseUid = decodedToken.uid;

    // Check if the user is a police member
    const { rows } = await pool.query(
      'SELECT * FROM MembroPolicia WHERE ID = (SELECT ID FROM Utilizador WHERE firebase_uid = $1)',
      [firebaseUid]
    );

    if (rows.length === 0) {
      return res.status(403).json({ error: 'Forbidden: Access restricted to police members only' });
    }

    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying police member:', error);
    res.status(401).json({ error: 'Unauthorized' });
  }
};

module.exports = policeAuthMiddleware;
