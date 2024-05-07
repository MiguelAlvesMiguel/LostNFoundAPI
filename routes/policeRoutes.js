const express = require('express');
const pool = require('../db'); // Assuming this is your configured PostgreSQL connection pool
const admin = require('firebase-admin');
const { getAuth } = require('firebase/auth');

// Initialize Firebase Admin with credentials from a local file
admin.initializeApp({
    credential: admin.credential.cert(require('../adminKey.json')),
});

const router = express.Router();

// Define the PUT endpoint to claim a found item
router.put('/police/items/:itemId/claim', async (req, res) => {
  const itemId = parseInt(req.params.itemId);
  const claimantId = req.body.claimantId;

  // Validate that itemId and claimantId are valid integers
  if (isNaN(itemId) || isNaN(claimantId)) {
    return res.status(400).send({ error: 'Invalid itemId or claimantId, must be integers' });
  }

  try {
    // Begin transaction
    await pool.query('BEGIN');

     // Check if the item is active and not already claimed
     const checkItem = await pool.query('SELECT ativo FROM ObjetoAchado WHERE ID = $1 AND ativo = true', [itemId]);

     if (checkItem.rowCount === 0) {
         return res.status(404).send('Item not found or already claimed');
     }

     // Update the item to be claimed
     const updateItem = await pool.query('UPDATE ObjetoAchado SET ativo = false WHERE ID = $1', [itemId]);

    // Commit transaction
    await pool.query('COMMIT');

    res.send('Item claimed successfully');

    } catch (error) {
      // Rollback in case of error
      await pool.query('ROLLBACK');
      console.error('Query Error', error);
      res.status(500).send('Server error while claiming item');
  }

});