const express = require('express');
const bodyParser = require('body-parser');
const os = require('os');

const app = express();

app.use(bodyParser.json());

// Mock users data
const users = [
    { id: 1, name: 'John Doe' },
    { id: 2, name: 'Jane Doe' }
];

// Users route
app.get('/users', (req, res) => {
    res.status(200).json(users);
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
})
const port = 3000;
app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
