const express = require('express');
const bodyParser = require('body-parser');
const usersRoutes = require('./routes/users');

const app = express();

app.use(bodyParser.json());
app.use('/users', usersRoutes);

const port = 3000;
app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
