const express = require('express');
const pool = require('../db');
const { getAuth } = require('firebase/auth');

const router = express.Router();
const admin = require('firebase-admin');

admin.initializeApp({
    credential: admin.credential.cert(require('../adminKey.json')),
  });

  
