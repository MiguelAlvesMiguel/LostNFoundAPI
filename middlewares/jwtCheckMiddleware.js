// middlewares/jwtCheckMiddleware.js
const { auth } = require('express-oauth2-jwt-bearer');

const jwtCheck = auth({
  audience: 'http://localhost:3003',
  issuerBaseURL: 'https://dev-wtrodgpp1u52blif.us.auth0.com/',
  tokenSigningAlg: 'RS256'
});

module.exports = jwtCheck;
