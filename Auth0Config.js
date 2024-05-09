
const { auth } = require('express-oauth2-jwt-bearer');

const auth0Config = {
  domain: 'dev-wtrodgpp1u52blif.us.auth0.com',
  audience: 'http://localhost:3003',
  clientId: 'q9CnOEAbb0MJAZY6jPsaL1WjJoRNlkw3',
  clientSecret: 'O5yR8GXqah8JU4mZ9EuAUTqTt89s2w0xuGGCObjUaDhGfv3-ie10O6slAoB_6FPJ'
};

module.exports = auth0Config;