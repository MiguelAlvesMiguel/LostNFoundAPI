  const express = require('express');
  const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } = require('firebase/auth');
  const pool = require('../db');
  const auth0Config = require('../Auth0Config');

  const { auth } = require('express-oauth2-jwt-bearer');
  const jwksRsa = require('jwks-rsa');
  const axios = require('axios');
  const router = express.Router();

  const jwtCheck = auth({
    audience: 'http://localhost:3003',
    issuerBaseURL: 'https://dev-wtrodgpp1u52blif.us.auth0.com/',
    tokenSigningAlg: 'RS256'
  });


  router.post('/register', async (req, res) => {
    const { email, password, nome, genero, data_nasc, morada, telemovel } = req.body;

    try {
      const auth = getAuth();  // Get the auth instance at request time
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Insert the new user into the Utilizador table
      await pool.query(
        'INSERT INTO Utilizador (ID, nome, genero, data_nasc, morada, email, telemovel, ativo) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [user.uid, nome, genero, data_nasc, morada, email, telemovel, true]
      );

      // Issue an Auth0 access token
      const tokenResponse = await axios.post(`https://${auth0Config.domain}/oauth/token`, {
        grant_type: 'client_credentials',
        client_id: auth0Config.clientId,
        client_secret: auth0Config.clientSecret,
        audience: auth0Config.audience
      });

      const accessToken = tokenResponse.data.access_token;

      res.status(201).json({ message: 'User registered successfully!', user, accessToken });

    } catch (error) {
      console.error('Error registering user:', error);
      res.status(400).json({ error: error.message });
    }
  });

  // User login endpoint (no change needed if already registered)
  router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
      const auth = getAuth();  // Get the auth instance at request time
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Issue an Auth0 access token
      const tokenResponse = await axios.post(`https://${auth0Config.domain}/oauth/token`, {
        grant_type: 'client_credentials',
        client_id: auth0Config.clientId,
        client_secret: auth0Config.clientSecret,
        audience: auth0Config.audience
      });

      const accessToken = tokenResponse.data.access_token;

      res.status(200).json({ message: 'User logged in successfully', user, accessToken });

    } catch (error) {
      console.error('Error logging in user:', error);
      res.status(401).json({ error: error.message });
    }
  });

// Google sign-in endpoint
router.post('/google-signin', async (req, res) => {
  try {
    const auth = getAuth();  // Get the auth instance at request time
    const provider = new GoogleAuthProvider();

    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Check if this user is already in the database
    const { rows } = await pool.query('SELECT * FROM Utilizador WHERE ID = $1', [user.uid]);
    if (rows.length === 0) {
      // Insert the new user into the Utilizador table
      await pool.query(
        'INSERT INTO Utilizador (ID, nome, email, ativo) VALUES ($1, $2, $3, $4)',
        [user.uid, user.displayName || 'Anonymous', user.email, true]
      );
    }

    res.status(200).json({ message: 'User signed in with Google successfully', user });
  } catch (error) {
    console.error('Error signing in with Google:', error);
    res.status(401).json({ error: error.message });
  }
});


// Edit user account details
router.put('/:userId', jwtCheck, async (req, res) => {
  const { userId } = req.params;
  const { nome, genero, data_nasc, morada, telemovel, historico, ativo } = req.body;

  try {
    const result = await pool.query(
      'UPDATE Utilizador SET nome = $1, genero = $2, data_nasc = $3, morada = $4, telemovel = $5, historico = $6, ativo = $7 WHERE ID = $8',
      [nome, genero, data_nasc, morada, telemovel, historico, ativo, userId]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'User not found' });
    } else {
      res.status(200).json({ message: 'User details updated' });
    }
  } catch (error) {
    console.error('Error updating user details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove a user account
router.delete('/:userId', jwtCheck, async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await pool.query('DELETE FROM Utilizador WHERE ID = $1', [userId]);

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'User not found' });
    } else {
      res.status(204).end();
    }
  } catch (error) {
    console.error('Error removing user account:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get notifications for a user
router.get('/:userId/notifications', jwtCheck, async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await pool.query(
      'SELECT ID as notificationId, mensagem as message, data as date FROM Notificacao WHERE utilizador_id = $1',
      [userId]
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error retrieving user notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send a notification to a user
router.post('/:userId/notifications', jwtCheck, async (req, res) => {
  const { userId } = req.params;
  const { message } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO Notificacao (utilizador_id, mensagem, data) VALUES ($1, $2, NOW()) RETURNING ID',
      [userId, message]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'User not found' });
    } else {
      res.status(201).json({ message: 'Notification sent successfully' });
    }
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user account status
router.put('/:userId/status', jwtCheck, async (req, res) => {
  const { userId } = req.params;
  const { status } = req.body;

  try {
    const result = await pool.query(
      'UPDATE Utilizador SET ativo = $1 WHERE ID = $2',
      [status === 'active', userId]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'User not found' });
    } else {
      res.status(200).json({ message: 'User account status updated' });
    }
  } catch (error) {
    console.error('Error updating user account status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout user with firebase
router.post('/logout', async (req, res) => {
  const auth = getAuth();  // Get the auth instance at request time
  await auth.signOut();

  // Return a success message if the sign-out was successful
  if (auth.currentUser) {
    return res.status(500).json({ error: 'Error logging out' });
  }

  res.status(200).json({ message: 'Logout successful' });
});

module.exports = router;
