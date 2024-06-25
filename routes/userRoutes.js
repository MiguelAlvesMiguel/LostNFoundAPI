// routes/userRoutes.js
const express = require('express');
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } = require('firebase/auth');
const firebaseApp = require('../FirebaseConfig'); // Correct path to your firebaseClient.js
const pool = require('../db');
const auth0Config = require('../Auth0Config');
const axios = require('axios');
const router = express.Router();
const { body, validationResult } = require('express-validator');

const doubleAuthMiddleware = require('../middlewares/doubleAuthMiddleware');
const jwtCheck = require('../middlewares/jwtCheckMiddleware');


const auth = getAuth(firebaseApp); // Get the Auth instance using the initialized Firebase App
const admin = require('../middlewares/firebaseAdmin'); // Use the initialized Firebase Admin
const { sendPasswordResetEmail } = require('firebase/auth');
const policeAuthMiddleware = require('../middlewares/policeAuth');


router.get('/', (req, res) => {
  console.log('GET /v1/users');
  res.status(200).json({ message: 'Users endpoint working!' });
});

// routes/userRoutes.js
router.get('/users', policeAuthMiddleware,doubleAuthMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT firebase_uid, nome, email FROM Utilizador');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error retrieving users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/register',
  [
    body('email').isEmail().withMessage('Invalid email').normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long').trim().escape(),
    body('nome').isLength({ min: 1 }).withMessage('Name is required').trim().escape(),
    body('genero').isIn(['Masculino', 'Feminino', 'Outro']).withMessage('Invalid gender').trim().escape(),
    body('data_nasc').isDate().withMessage('Invalid date of birth').toDate(),
    body('morada').isLength({ min: 1 }).withMessage('Address is required').trim().escape(),
    body('telemovel').isMobilePhone().withMessage('Invalid phone number').trim().escape(), // Allow any locale
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, nome, genero, data_nasc, morada, telemovel } = req.body;

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await pool.query(
        'INSERT INTO Utilizador (firebase_uid, nome, genero, data_nasc, morada, email, telemovel, ativo) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [user.uid, nome, genero, data_nasc, morada, email, telemovel, true]
      );

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
  }
);
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Retrieve user details including roles from the database
    const userQuery = await pool.query('SELECT isCop, isAdmin FROM Utilizador WHERE email = $1', [email]);
    const userType = userQuery.rows[0];

    const tokenResponse = await axios.post(`https://${auth0Config.domain}/oauth/token`, {
      grant_type: 'client_credentials',
      client_id: auth0Config.clientId,
      client_secret: auth0Config.clientSecret,
      audience: auth0Config.audience
    });

    const accessToken = tokenResponse.data.access_token;
    console.log('User logged in successfully:', user);
    res.status(200).json({ message: 'User logged in successfully', user, accessToken, userType });
  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(401).json({ error: error.message });
  }
});

router.post('/google-signin', async (req, res) => {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    const { rows } = await pool.query('SELECT * FROM Utilizador WHERE ID = $1', [user.uid]);
    if (rows.length === 0) {
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

// Use doubleAuthMiddleware for Firebase tokens
router.get('/me', doubleAuthMiddleware, async (req, res) => {
  const firebase_uid = req.user.uid;

  try {
    const result = await pool.query('SELECT * FROM Utilizador WHERE firebase_uid = $1', [firebase_uid]);

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'User not found' });
    } else {
      res.status(200).json(result.rows[0]);
    }
  } catch (error) {
    console.error('Error retrieving user details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Example route using Auth0 JWT Check Middleware
router.get('/auth0-example', jwtCheck, async (req, res) => {
  res.status(200).json({ message: 'Auth0 token is valid' });
});

router.put('/me', doubleAuthMiddleware, async (req, res) => {
  const { nome, genero, data_nasc, morada, telemovel, historico, ativo } = req.body;
  const firebase_uid = req.user.uid;

  try {
    const result = await pool.query(
      'UPDATE Utilizador SET nome = $1, genero = $2, data_nasc = $3, morada = $4, telemovel = $5, historico = $6, ativo = $7 WHERE firebase_uid = $8',
      [nome, genero, data_nasc, morada, telemovel, historico, ativo, firebase_uid]
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

router.delete('/me', doubleAuthMiddleware, async (req, res) => {
  const firebase_uid = req.user.uid;

  try {
    const result = await pool.query('DELETE FROM Utilizador WHERE firebase_uid = $1', [firebase_uid]);

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

router.get('/me/notifications', doubleAuthMiddleware, async (req, res) => {
  const firebase_uid = req.user.uid;

  try {
    const result = await pool.query(
      'SELECT ID as notificationId, mensagem as message, data as date FROM Notificacao WHERE utilizador_id = $1',
      [firebase_uid]
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error retrieving user notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/me/notifications', doubleAuthMiddleware, async (req, res) => {
  const firebase_uid = req.user.uid;
  const { message } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO Notificacao (utilizador_id, mensagem, data) VALUES ($1, $2, NOW()) RETURNING ID',
      [firebase_uid, message]
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

router.put('/me/status', doubleAuthMiddleware, async (req, res) => {
  const firebase_uid = req.user.uid;
  const { status } = req.body;

  try {
    const result = await pool.query(
      'UPDATE Utilizador SET ativo = $1 WHERE firebase_uid = $2',
      [status === 'active', firebase_uid]
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

router.post('/logout',doubleAuthMiddleware, async (req, res) => {
  await auth.signOut();

  if (auth.currentUser) {
    return res.status(500).json({ error: 'Error logging out' });
  }

  res.status(200).json({ message: 'Logout successful' });
});


router.get('/mylostitems', doubleAuthMiddleware, async (req, res) => {
  const firebase_uid = req.user.uid;

  try {
    const result = await pool.query(`
      SELECT *
      FROM ObjetoPerdido
      WHERE utilizador_id = $1
    `, [firebase_uid]);

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'No lost items found for this user' });
    } else {
      res.status(200).json(result.rows);
    }
  } catch (error) {
    console.error('Error retrieving lost items:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to deactivate user account
router.put('/me/deactivate', doubleAuthMiddleware, async (req, res) => {
  const firebase_uid = req.user.uid;

  try {
    const result = await pool.query(
      'UPDATE Utilizador SET ativo = FALSE WHERE firebase_uid = $1',
      [firebase_uid]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'User not found' });
    } else {
      res.status(200).json({ message: 'User account deactivated' });
    }
  } catch (error) {
    console.error('Error deactivating user account:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to activate user account
router.put('/me/activate', doubleAuthMiddleware, async (req, res) => {
  const firebase_uid = req.user.uid;

  try {
    const result = await pool.query(
      'UPDATE Utilizador SET ativo = TRUE WHERE firebase_uid = $1',
      [firebase_uid]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'User not found' });
    } else {
      res.status(200).json({ message: 'User account activated' });
    }
  } catch (error) {
    console.error('Error activating user account:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


//Password reset stuff
// Endpoint to send reset password email
router.post('/reset-password-email', 
  [
    body('email').isEmail().withMessage('Invalid email').normalizeEmail(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    try {
      await sendPasswordResetEmail(auth, email);
      res.status(200).json({ message: 'Password reset email sent successfully.' });
    } catch (error) {
      console.error('Error sending password reset email:', error);
      res.status(400).json({ error: 'Error sending password reset email. Please try again.' });
    }
  }
);


module.exports = router;