const express = require('express');
const router = express.Router();
const { executeAuthQuery, executeAuthQueryOne, executeAuthInsert, executeAuthUpdate, requireAuth } = require('../authDB.js');
const {
  getAllUsers,
  getUserById,
  getUserByCredentials,
  createUser,
  updateUser,
  deleteUser
} = require('../queries.js');

// Get all users
router.get('/', requireAuth, async (req, res) => {
  try {
    const query = getAllUsers();
    const users = await executeAuthQuery(query, [], req.token);
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user by ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const query = getUserById(req.params.id);
    const user = await executeAuthQueryOne(query, [], req.token);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Create new user
router.post('/', requireAuth, async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const query = createUser(username, email, password);
    const userId = await executeAuthInsert(query, [], req.token);

    // Return the created user (without password)
    const createdUser = await executeAuthQueryOne(getUserById(userId), [], req.token);
    res.status(201).json(createdUser);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { username, email } = req.body;
    const userId = req.params.id;

    // Check if user exists
    const existingUser = await executeAuthQueryOne(getUserById(userId), [], req.token);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const query = updateUser(userId, username, email);
    const affectedRows = await executeAuthUpdate(query, [], req.token);

    if (affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return updated user
    const updatedUser = await executeAuthQueryOne(getUserById(userId), [], req.token);
    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.params.id;

    // Check if user exists
    const existingUser = await executeAuthQueryOne(getUserById(userId), [], req.token);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const query = deleteUser(userId);
    const affectedRows = await executeAuthUpdate(query, [], req.token);

    if (affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
