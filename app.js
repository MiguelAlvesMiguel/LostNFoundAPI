const express = require('express');
const bodyParser = require('body-parser');

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
    res.status(200).send('Welcome to ReClaim API!');
});

const port = 3000;
app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
