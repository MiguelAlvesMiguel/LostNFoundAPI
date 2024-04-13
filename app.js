const os = require('os');
const express = require('express');
const bodyParser = require('body-parser');
const { initializeApp } = require('firebase/app');
const { getAuth } = require('firebase/auth');
const firebaseConfig = require('./FirebaseConfig');
const pool = require('./db');
const userRoutes = require('./routes/userRoutes.js');

const app = express();

app.use(bodyParser.json());

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);

app.use('/users', userRoutes);
app.use('/items', itemRoutes);


app.get('/lost-objects', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM ObjetoPerdido');
    res.json(rows);
  } catch (error) {
    console.error('Error executing query', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Root route
app.get('/', (req, res) => {
  res.status(200).send(`Welcome to ReClaim API from server ${os.hostname()}!`);
});

// Health check endpoint
app.get('/health', (req, res) => {
  // Here you could add checks for your app's dependencies or other services
  // For now, we're just sending back a 200 status code
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

const port = 3000;
app.listen(port, () => console.log(`Server running on http://localhost:${port}`));