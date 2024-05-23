const express = require('express');
const pool = require('../db'); // Assuming this is your configured PostgreSQL connection pool
const admin = require('firebase-admin');
const { getAuth } = require('firebase/auth');


const router = express.Router();

// Sanitize input data
const sanitizeInput = (input) => {
  return input.replace(/[^a-zA-Z0-9\s]/g, '');
};

// Define the PUT endpoint to claim a found item
router.put('/items/:itemId/claim', async (req, res) => {
  const itemId = parseInt(req.params.itemId);
  const claimantId = req.query.claimantId;

  // Validate that itemId and claimantId are valid integers
  if (isNaN(itemId)) {
    return res.status(400).send({ error: 'Invalid itemId, must be integer' });
  }

  if (!claimantId) {
    return res.status(400).send({ error: 'claimantId missing' });
  }
  
  const sanitizedClaimantId = sanitizeInput(claimantId);

  try {
    // Begin transaction
    await pool.query('BEGIN');

    // Check if the claimant exists
    const checkClaimant = await pool.query('SELECT firebase_uid FROM utilizador WHERE firebase_uid = $1', [sanitizedClaimantId]);
    if (checkClaimant.rowCount === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).send('Claimant not found');
    }

    // Check if the item is active and not already claimed
    const checkItem = await pool.query('SELECT ativo FROM ObjetoAchado WHERE ID = $1 AND ativo = true', [itemId]);
    if (checkItem.rowCount === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).send('Item not found or already claimed');
    }

    // Update the item to be claimed
    await pool.query('UPDATE ObjetoAchado SET ativo = false WHERE ID = $1', [itemId]);

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
router.post('/items/found/register', async (req, res) => {
  // Extract details from the request body
  const { titulo, descricao_curta, descricao, categoria, data_achado, localizacao_achado, data_limite, valor_monetario, policial_id } = req.body;

  // Validate required fields to ensure no critical data is missing
  if (!titulo || !descricao_curta || !descricao || !categoria || !data_achado || !localizacao_achado || !data_limite || !policial_id) {
    return res.status(400).json({ error: 'Invalid input: required fields are missing.' });
  }

  const sanitizedTitulo = sanitizeInput(titulo);
  const sanitizedDescricaoCurta = sanitizeInput(descricao_curta);
  const sanitizedDescricao = sanitizeInput(descricao);
  const sanitizedCategoria = sanitizeInput(categoria);
  const sanitizedDataAchado = new Date(data_achado);

  let sanitizedLocalizacaoAchado;
  try {
    const parsedLocalizacao = JSON.parse(localizacao_achado);
    sanitizedLocalizacaoAchado = {
      latitude: parseFloat(parsedLocalizacao.latitude),
      longitude: parseFloat(parsedLocalizacao.longitude)
    };
    if (isNaN(sanitizedLocalizacaoAchado.latitude) || isNaN(sanitizedLocalizacaoAchado.longitude)) {
      throw new Error('Invalid latitude or longitude');
    }
  } catch (error) {
    return res.status(400).json({ error: 'Invalid input: localizacao_achado must be a valid JSON object with numeric latitude and longitude.' });
  }

  const sanitizedDataLimite = new Date(data_limite);
  const sanitizedValorMonetario = parseFloat(valor_monetario);
  const sanitizedPolicialId = parseInt(policial_id);

  try {
    // Insert the new found item into the ObjetoAchado table
    const insertQuery = `
      INSERT INTO ObjetoAchado (titulo, descricao_curta, descricao, categoria, data_achado, localizacao_achado, data_limite, ativo, valor_monetario, policial_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, $9)
      RETURNING ID;
    `;
    const values = [sanitizedTitulo, sanitizedDescricaoCurta, sanitizedDescricao, sanitizedCategoria, sanitizedDataAchado, sanitizedLocalizacaoAchado, sanitizedDataLimite, sanitizedValorMonetario || null, sanitizedPolicialId];

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
router.post('/members', async (req, res) => {
  // Extract the relevant fields from the request body
  const { nome, posto_policia, historico_policia } = req.body;

  const sanitizeInput2 = (input) => {
    if (typeof input === 'string') {
      return input.replace(/[^a-zA-Z0-9\s]/g, '');
    } else if (typeof input === 'object' && input !== null) {
      const sanitizedObject = {};
      for (const key in input) {
        sanitizedObject[key] = sanitizeInput2 (input[key]);
      }
      return sanitizedObject;
    }
    return input;
  };
  

  const sanitizedNome = sanitizeInput2(nome);
  const sanitizedPosto = parseInt(posto_policia);
  const sanitizedHistorico = sanitizeInput2(historico_policia);

  // Validate the required fields
  if (!nome || !posto_policia) {
    return res.status(400).json({ error: 'Invalid input: missing required fields "nome" or "posto_policia".' });
  }

  try {
    // Prepare the SQL query to insert a new police member
    const insertQuery = `
      INSERT INTO MembroPolicia (nome, posto_policia, historico_policia)
      VALUES ($1, $2, $3::jsonb)
      RETURNING ID;
    `;
    const values = [sanitizedNome, sanitizedPosto, historico_policia];

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
router.post('/posts', async (req, res) => {
  // Extract the relevant field from the request body
  const { morada } = req.body;

  // Validate that the required field "morada" is present
  if (!morada || typeof morada !== 'string') {
    return res.status(400).json({ error: 'Invalid input: "morada" is required and must be a string.' });
  }

  const sanitizedMorada = sanitizeInput(morada);

  try {
    // Prepare the SQL query to insert a new police post
    const insertQuery = `
      INSERT INTO PostoPolicia (morada)
      VALUES ($1)
      RETURNING ID;
    `;
    const values = [sanitizedMorada];

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
