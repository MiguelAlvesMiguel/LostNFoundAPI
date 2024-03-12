// routes/users.js
const express = require('express');
const router = express.Router();

// Placeholder for database operations
const db = {
  users: [],
  findUserByEmail: function(email) {
    return this.users.find(user => user.email === email);
  },
  findUserById: function(id) {
    return this.users.find(user => user.id === id);
  },
  addUser: function(user) {
    this.users.push(user);
    return user;
  },
  updateUser: function(id, updatedUser) {
    const index = this.users.findIndex(user => user.id === id);
    if (index !== -1) {
      this.users[index] = { ...this.users[index], ...updatedUser };
      return this.users[index];
    }
    return null;
  },
  deleteUser: function(id) {
    const index = this.users.findIndex(user => user.id === id);
    if (index !== -1) {
      return this.users.splice(index, 1)[0];
    }
    return null;
  },
  addNotification: function(userId, notification) {
    const user = this.findUserById(userId);
    if (user) {
      if (!user.notifications) user.notifications = [];
      user.notifications.push(notification);
      return notification;
    }
    return null;
  },
  getNotifications: function(userId) {
    const user = this.findUserById(userId);
    if (user && user.notifications) {
      return user.notifications;
    }
    return [];
  }
};

// Register a new user
router.post('/', (req, res) => {
  const user = req.body;
  if (!user.email || !user.password) {
    return res.status(400).send({ message: 'Invalid input' });
  }

  // Check if user already exists
  if (db.findUserByEmail(user.email)) {
    return res.status(400).send({ message: 'User already exists' });
  }

  const newUser = db.addUser(user);
  res.status(201).send(newUser);
});

// User login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.findUserByEmail(email);
  if (!user || user.password !== password) {
    return res.status(401).send({ message: 'Authentication failed' });
  }
  res.status(200).send({ message: 'Login successful', user });
});

// Edit user account details
router.put('/:userId', (req, res) => {
  const { userId } = req.params;
  const updatedUser = req.body;

  const user = db.updateUser(userId, updatedUser);
  if (!user) {
    return res.status(404).send({ message: 'User not found' });
  }
  res.status(200).send(user);
});

// Remove a user account
router.delete('/:userId', (req, res) => {
  const { userId } = req.params;

  const user = db.deleteUser(userId);
  if (!user) {
    return res.status(404).send({ message: 'User not found' });
  }
  res.status(204).send();
});

// Get notifications for a user
router.get('/:userId/notifications', (req, res) => {
  const { userId } = req.params;

  const notifications = db.getNotifications(userId);
  res.status(200).send(notifications);
});

// Send a notification to a user
router.post('/:userId/notifications', (req, res) => {
  const { userId } = req.params;
  const { message } = req.body;

  const notification = db.addNotification(userId, { message, date: new Date().toISOString() });
  if (!notification) {
    return res.status(404).send({ message: 'User not found' });
  }
  res.status(201).send({ message: 'Notification sent successfully', notification });
});

// Update user account status (deactivate/reactivate)
router.put('/:userId/status', (req, res) => {
  const { userId } = req.params;
  const { status } = req.body;

  const user = db.updateUser(userId, { status });
  if (!user) {
    return res.status(404).send({ message: 'User not found' });
  }
  res.status(200).send({ message: 'User account status updated', user });
});

// Logout user
router.post('/logout', (req, res) => {
  // Logout logic, usually involves clearing session/cookies
  res.status(200).send({ message: 'Logout successful' });
});

module.exports = router;
