// middlewares/doubleAuthMiddleware.js
const firebaseAuthMiddleware = require('./firebaseAuthMiddleware');
const jwtCheckMiddleware = require('./jwtCheckMiddleware');

const doubleAuthMiddleware = async (req, res, next) => {
  try {
    // Log headers for debugging
    console.log('HEADERS (doubleAuthMiddleware):', req.headers);

    // Handle Firebase token verification
    await new Promise((resolve, reject) => {
      firebaseAuthMiddleware(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log('Firebase token verified:', req.user);

    // Handle Auth0 token verification
    await new Promise((resolve, reject) => {
      jwtCheckMiddleware(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    next();
  } catch (error) {
    console.error('Authentication failed:', error);
    res.status(401).send('Unauthorized');
  }
};

module.exports = doubleAuthMiddleware;
