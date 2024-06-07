// middlewares/jwtCheckMiddleware.js
const { auth } = require('express-oauth2-jwt-bearer');

const jwtCheck = auth({
  audience: 'http://localhost:3003',
  issuerBaseURL: 'https://dev-wtrodgpp1u52blif.us.auth0.com/',
  tokenSigningAlg: 'RS256'
});

const jwtCheckMiddleware = async (req, res, next) => {
  // Log headers for debugging
  console.log('HEADERS (jwtCheckMiddleware):', req.headers);

  const token = req.headers['x-auth0-token'];
  if (!token) return res.status(401).send('Unauthorized! Missing JWT token!');

  // Temporarily set the authorization header for the middleware processing
  const originalAuthorization = req.headers.authorization;
  req.headers.authorization = `Bearer ${token}`;

  try {
    await new Promise((resolve, reject) => {
      jwtCheck(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    req.auth0User = req.user; // Store decoded Auth0 token
    next();
  } catch (error) {
    console.error('Error verifying Auth0 token:', error);
    res.status(401).send('Unauthorized');
  } finally {
    // Restore the original authorization header
    req.headers.authorization = originalAuthorization;
  }
};

module.exports = jwtCheckMiddleware;
