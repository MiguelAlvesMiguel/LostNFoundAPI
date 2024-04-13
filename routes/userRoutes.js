const express = require('express');
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } = require('firebase/auth');

const router = express.Router();

// User registration endpoint
router.post('/register', async (req, res) => {
  const auth = getAuth();  // Get the auth instance at request time
  const { email, password } = req.body;

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    res.status(201).json({ message: 'User registered successfully', user });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(400).json({ error: error.message });
  }
});

// User login endpoint
router.post('/login', async (req, res) => {
  const auth = getAuth();  // Get the auth instance at request time
  const { email, password } = req.body;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    res.status(200).json({ message: 'User logged in successfully', user });
  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(401).json({ error: error.message });
  }
});

// Google sign-in endpoint
router.post('/google-signin', async (req, res) => {
  const auth = getAuth();  // Get the auth instance at request time
  const provider = new GoogleAuthProvider();

  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    res.status(200).json({ message: 'User signed in with Google successfully', user });
  } catch (error) {
    console.error('Error signing in with Google:', error);
    res.status(401).json({ error: error.message });
  }
});

module.exports = router;
