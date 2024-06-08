const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const os = require('os');
const app = express();

app.use(cors({
  origin: 'http://localhost:5173'
}));

app.use(bodyParser.json());

// Import routes
const userRoutes = require('./routes/userRoutes');
const itemRoutes = require('./routes/itemRoutes');
const auctionRoutes = require('./routes/auctionRoutes');
const policeRoutes = require('./routes/policeRoutes');
const reportsRoutes = require('./routes/reportsRoutes');
const stripeRoutes = require('./routes/stripeRoutes');

// Prefix all routes with /v1/
app.use('/v1/users', userRoutes);
app.use('/v1/items', itemRoutes);
app.use('/v1/auctions', auctionRoutes);
app.use('/v1/police', policeRoutes);
app.use('/v1/reports', reportsRoutes);
app.use('/v1/stripe', stripeRoutes);

const port = process.env.PORT || 3995;

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
