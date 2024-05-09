const express = require('express');
const pool = require('../db'); // Assuming this is your configured PostgreSQL connection pool
const { getAuth } = require('firebase/auth');



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

// Define the POST endpoint to register a found item
router.post('/police/items/found/register', async (req, res) => {
  // Extract details from the request body
  const { descricao, categoria, data_achado, localizacao_achado, data_limite, valor_monetario, policial_id } = req.body;

   // Validate required fields to ensure no critical data is missing
   if (!descricao || !categoria || !data_achado || !localizacao_achado || !data_limite || !policial_id) {
    return res.status(400).json({ error: 'Invalid input: required fields are missing.' });
  }

  try {
    // Insert the new found item into the ObjetoAchado table
    const insertQuery = `
      INSERT INTO ObjetoAchado (descricao, categoria, data_achado, localizacao_achado, data_limite, ativo, valor_monetario, policial_id)
      VALUES ($1, $2, $3, $4, $5, true, $6, $7)
      RETURNING ID;
    `;
    const values = [descricao, categoria, data_achado, localizacao_achado, data_limite, valor_monetario || null, policial_id];

      // Execute the query
      const result = await pool.query(insertQuery, values);

      // Retrieve the ID of the newly inserted item
      const newItemId = result.rows[0].id;
  
      // Return a success message with the new item ID
      res.status(201).json({ message: 'Found item registered successfully', id: newItemId });
  
    } catch (error) {
      console.error('Error registering found item:', error);
      res.status(500).json({ error: 'Server error while registering the found item.' });
    }
  });

// Define the POST endpoint to register a new police member
router.post('/police/members', async (req, res) => {
  // Extract the relevant fields from the request body
  const { nome, posto_policia, historico_policia } = req.body;

  // Validate the required fields
  if (!nome || !posto_policia) {
    return res.status(400).json({ error: 'Invalid input: missing required fields "nome" or "posto_policia".' });
  }

  try {
    // Prepare the SQL query to insert a new police member
    const insertQuery = `
      INSERT INTO MembroPolicia (nome, posto_policia, historico_policia)
      VALUES ($1, $2, $3)
      RETURNING ID;
    `;
    const values = [nome, posto_policia, historico_policia || null];

    // Execute the query with parameterized values to prevent SQL injection
    const result = await pool.query(insertQuery, values);

    // Retrieve the ID of the newly inserted member from the query result
    const newMemberId = result.rows[0].id;

    // Return a 201 response to indicate successful registration
    res.status(201).json({ message: 'Police member registered successfully', id: newMemberId });

  } catch (error) {
    console.error('Error registering police member:', error);
    res.status(500).json({ error: 'Server error while registering police member.' });
  }
});

// Define the POST endpoint to register a new police post
router.post('/police/posts', async (req, res) => {
  // Extract the relevant field from the request body
  const { morada } = req.body;

  // Validate that the required field "morada" is present
  if (!morada || typeof morada !== 'string') {
    return res.status(400).json({ error: 'Invalid input: "morada" is required and must be a string.' });
  }
  try {
    // Prepare the SQL query to insert a new police post
    const insertQuery = `
      INSERT INTO PostoPolicia (morada)
      VALUES ($1)
      RETURNING ID;
    `;
    const values = [morada];

    // Execute the query with parameterized values to prevent SQL injection
    const result = await pool.query(insertQuery, values);

    // Retrieve the ID of the newly inserted post from the query result
    const newPostId = result.rows[0].id;

    // Return a 201 response to indicate successful registration
    res.status(201).json({ message: 'Police post created successfully', id: newPostId });

  } catch (error) {
    console.error('Error creating police post:', error);
    res.status(500).json({ error: 'Server error while creating police post.' });
  }
});
  

module.exports = router;
