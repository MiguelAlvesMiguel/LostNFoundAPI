// middlewares/adminAuth.js
const pool = require('../db'); // Assuming this is your configured PostgreSQL connection pool
const admin = require('../middlewares/firebaseAdmin');

// Middleware to check if user is an admin
const adminAuthMiddleware = async (req, res, next) => {
  const idToken = req.headers.authorization?.split('Bearer ')[1];
  if (!idToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const firebaseUid = decodedToken.uid;

    // Check if the user is an admin
    const { rows } = await pool.query(
      'SELECT * FROM Admin WHERE utilizador_id = $1',
      [firebaseUid]
    );

    if (rows.length === 0) {
      return res.status(403).json({ error: 'Forbidden: Access restricted to admin users only' });
    }

    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying admin user:', error);
    res.status(401).json({ error: 'Unauthorized' });
  }
};

module.exports = adminAuthMiddleware;
