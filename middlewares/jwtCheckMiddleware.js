// middlewares/jwtCheckMiddleware.js
const { auth } = require('express-oauth2-jwt-bearer');

const jwtCheck = auth({
  audience: 'http://localhost:3003',
  issuerBaseURL: 'https://dev-wtrodgpp1u52blif.us.auth0.com/',
  tokenSigningAlg: 'RS256'
});

const jwtCheckMiddleware = async (req, res, next) => {
  const token = req.headers['x-auth0-token'];
  //log token
  console.log(token);
  if (!token) return res.status(401).send('Unauthorized! Missing JWT token!');

  req.headers.authorization = `Bearer ${token}`; // Temporarily set token for middleware processing

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
  }
};


module.exports = jwtCheckMiddleware;
