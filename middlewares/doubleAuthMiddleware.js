const firebaseAuthMiddleware = require('./firebaseAuthMiddleware');
const jwtCheckMiddleware = require('./jwtCheckMiddleware');

const doubleAuthMiddleware = async (req, res, next) => {
  try {
    await new Promise((resolve, reject) => {
      firebaseAuthMiddleware(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

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
