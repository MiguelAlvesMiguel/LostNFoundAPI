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

// Edit user account details
router.put('/:userId', async (req, res) => {
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
router.delete('/:userId', async (req, res) => {
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
router.get('/:userId/notifications', async (req, res) => {
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
router.post('/:userId/notifications', async (req, res) => {
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
router.put('/:userId/status', async (req, res) => {
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
