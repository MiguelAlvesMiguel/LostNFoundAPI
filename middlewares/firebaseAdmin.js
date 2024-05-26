// middlewares/auth.js
const admin = require('firebase-admin');

// Initialize Firebase Admin with your project credentials
const serviceAccount = require('../adminKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

module.exports = admin;