const express = require('express');
const bodyParser = require('body-parser');
const { initializeApp } = require('firebase/app');
const { getAuth } = require('firebase/auth');
const firebaseConfig = require('./FirebaseConfig');
const pool = require('./db.js');
const cors = require('cors');  // Ensure CORS is required at the top.

const app = express();

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);

// Apply CORS before any other route or middleware
app.use(cors({
  origin: 'http://localhost:5173'  // This will allow only your React app to make requests
}));

app.use(bodyParser.json());

// Define routes after the CORS middleware
const userRoutes = require('./routes/userRoutes.js');
const itemRoutes = require('./routes/itemRoutes.js');
const auctionRoutes = require('./routes/auctionRoutes.js');

app.use('/users', userRoutes);
app.use('/items', itemRoutes);
app.use('/auctions', auctionRoutes);

const port = process.env.PORT || 4243;

app.get('/', (req, res) => {
  res.status(200).send(`Welcome to ReClaim API from server ${os.hostname()}!`);
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

const server = app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

module.exports = server;
