const os = require('os');
const express = require('express');
const bodyParser = require('body-parser');
const { initializeApp } = require('firebase/app');
const { getAuth } = require('firebase/auth');
const firebaseConfig = require('./FirebaseConfig');
const pool = require('./db.js');
const userRoutes = require('./routes/userRoutes.js');
const itemRoutes = require('./routes/itemRoutes.js');

const app = express();

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);

app.use(bodyParser.json());
app.use('/users', userRoutes);
app.use('/items', itemRoutes);
app.use('/auctions', auctionRoutes);

const port = process.env.PORT || 3003;

const server = app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});


//Só para testar
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
  //TODO: Implement database connection check
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});


//app.listen(port, () => console.log(`Server running on http://localhost:${port}`));

module.exports = server;