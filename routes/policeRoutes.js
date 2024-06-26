// routes/policeRoutes.js
const express = require('express');
const pool = require('../db'); // Assuming this is your configured PostgreSQL connection pool
const policeAuthMiddleware = require('../middlewares/policeAuth');
const adminAuthMiddleware = require('../middlewares/adminAuth');
const admin = require('../middlewares/firebaseAdmin');
const axios = require('axios');
const auth0Config = require('../Auth0Config');
const { getAuth } = require('firebase/auth');

const firebaseAuth = require('../middlewares/firebaseAuthMiddleware');
const jwtCheck = require('../middlewares/jwtCheckMiddleware');
const doubleAuthMiddleware = require('../middlewares/doubleAuthMiddleware');

const isAuthenticated = async (req, res, next) => {
  try {
    const { authorization } = req.headers;

    if (authorization && authorization.startsWith("Bearer ")) {
      const idToken = authorization.split("Bearer ")[1];
      console.log("Verifying ID token...");
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      console.log("ID token is valid:", decodedToken);
      req.userId = decodedToken.uid;
      return next();
    }

    console.log("No authorization token was found");
    res.status(401).json({ error: "Unauthorized" });
  } catch (error) {
    console.error("Error while verifying Firebase ID token:", error);
    res.status(401).json({ error: "Unauthorized" });
  }
};

const router = express.Router();
// Define the PUT endpoint to edit an existing police member (protected route)

// Sanitize input data
const sanitizeInput = (input) => {
  return input.replace(/[^a-zA-Z0-9\s]/g, '');
};

//sanitize url
const sanitizeURL = (url) => {
  try {
    const parsedUrl = new URL(url);
    const sanitizedUrl = `${parsedUrl.protocol}//${parsedUrl.hostname}${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
    return sanitizedUrl.replace(/[^a-zA-Z0-9/:.?&=_-]/g, ''); // Further sanitize the URL
  } catch (e) {
    console.error('Invalid URL provided:', url);
    return null;
  }
};

router.put('/members/:firebaseUid', adminAuthMiddleware,doubleAuthMiddleware, async (req, res) => {
  const { firebaseUid } = req.params;
  const { posto_policia, historico_policia } = req.body;

  const sanitizeInput2 = (input) => {
    if (typeof input === 'string') {
      return input.replace(/[^a-zA-Z0-9\s]/g, '');
    } else if (typeof input === 'object' && input !== null) {
      const sanitizedObject = {};
      for (const key in input) {
        sanitizedObject[key] = sanitizeInput2(input[key]);
      }
      return sanitizedObject;
    }
    return input;
  };

  const sanitizedFirebaseUid = sanitizeInput2(firebaseUid);
  const sanitizedPosto = posto_policia ? parseInt(sanitizeInput2(posto_policia)) : null;
  let sanitizedHistorico = null;

  if (historico_policia) {
    sanitizedHistorico = JSON.stringify(sanitizeInput2(historico_policia));
  }

  try {
    // Check if the user exists in the Utilizador table and is active
    const userCheckQuery = 'SELECT firebase_uid FROM Utilizador WHERE firebase_uid = $1 AND ativo = TRUE';
    const userCheckResult = await pool.query(userCheckQuery, [sanitizedFirebaseUid]);

    if (userCheckResult.rowCount === 0) {
      return res.status(404).json({ error: 'User not found or inactive.' });
    }

    const userId = userCheckResult.rows[0].firebase_uid;

    console.log('userId:', userId);

    // Check if the police member exists in the MembroPolicia table
    const checkQuery = 'SELECT posto_policia FROM MembroPolicia WHERE utilizador_id = $1';
    const checkResult = await pool.query(checkQuery, [userId]);

    console.log('checkResult:', checkResult.rows);

    if (checkResult.rowCount === 0) {
      return res.status(404).json({ error: 'Police member not found.' });
    }

    const currentPosto = checkResult.rows[0].posto_policia;

    // Prepare the SQL query to update the police member
    const updateQuery = `
      UPDATE MembroPolicia
      SET posto_policia = COALESCE($1, posto_policia), historico_policia = COALESCE($2::jsonb, historico_policia)
      WHERE utilizador_id = $3
    `;
    const values = [sanitizedPosto, sanitizedHistorico, userId];

    // Execute the query with parameterized values to prevent SQL injection
    await pool.query(updateQuery, values);

    // Return a 200 response to indicate successful update
    res.status(200).json({ message: 'Police member updated successfully' });

  } catch (error) {
    console.error('Error updating police member:', error);
    res.status(500).json({ error: 'Server error while updating police member.' });
  }
});

// Define the DELETE endpoint to remove a police member (protected route)
router.delete('/members/:firebase_uid', adminAuthMiddleware, doubleAuthMiddleware, async (req, res) => {
  const { firebase_uid } = req.params;

  try {
    // Check if the police member exists in the MembroPolicia table
    const checkQuery = 'SELECT id FROM MembroPolicia WHERE utilizador_id = $1';
    const checkResult = await pool.query(checkQuery, [firebase_uid]);

    if (checkResult.rowCount === 0) {
      return res.status(404).json({ error: 'Police member not found.' });
    }

    const policeMemberId = checkResult.rows[0].id;

    // Select a default police member ID (ensure there is a default police member in your database)
    const defaultPoliceMemberQuery = 'SELECT id FROM MembroPolicia LIMIT 1';
    const defaultPoliceMemberResult = await pool.query(defaultPoliceMemberQuery);

    if (defaultPoliceMemberResult.rowCount === 0) {
      return res.status(500).json({ error: 'No default police member found.' });
    }

    const defaultPoliceMemberId = defaultPoliceMemberResult.rows[0].id;

    // Update references to the default police member
    const updateObjetoAchadoQuery = 'UPDATE ObjetoAchado SET policial_id = $1 WHERE policial_id = $2';
    await pool.query(updateObjetoAchadoQuery, [defaultPoliceMemberId, policeMemberId]);

    // Prepare the SQL query to delete the police member
    const deletePoliceMemberQuery = 'DELETE FROM MembroPolicia WHERE utilizador_id = $1';
    await pool.query(deletePoliceMemberQuery, [firebase_uid]);

    // Prepare the SQL query to delete the user from Utilizador table
    const deleteUserQuery = 'DELETE FROM Utilizador WHERE firebase_uid = $1';
    await pool.query(deleteUserQuery, [firebase_uid]);

    // Return a 200 response to indicate successful deletion
    res.status(200).json({ message: 'Police member and associated user deleted successfully' });

  } catch (error) {
    console.error('Error deleting police member:', error);
    res.status(500).json({ error: 'Server error while deleting police member.' });
  }
});


router.put('/items/:itemId/claim', policeAuthMiddleware, doubleAuthMiddleware, doubleAuthMiddleware, async (req, res) => {
  const itemId = parseInt(req.params.itemId);
  const claimantId = req.query.claimantId;

  if (isNaN(itemId)) {
    return res.status(400).json({ error: 'Invalid itemId, must be integer' });
  }

  if (!claimantId) {
    return res.status(400).json({ error: 'claimantId missing' });
  }

  const sanitizedClaimantId = sanitizeInput(claimantId);
  const currentDate = new Date().toISOString().split('T')[0];

  try {
    await pool.query('BEGIN');

    if (sanitizedClaimantId === '0') {
      await pool.query('UPDATE ObjetoAchado SET ativo = true, claimant_id = NULL, data_claimed = NULL WHERE ID = $1', [itemId]);
      await pool.query('COMMIT');
      return res.json({ message: 'Item activated and owner removed' });
    }

    const checkClaimant = await pool.query('SELECT firebase_uid FROM Utilizador WHERE firebase_uid = $1', [sanitizedClaimantId]);
    if (checkClaimant.rowCount === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ error: 'Claimant not found' });
    }

    const checkItem = await pool.query('SELECT ativo, data_limite FROM ObjetoAchado WHERE ID = $1', [itemId]);
    if (checkItem.rowCount === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ error: 'Item not found' });
    }

    const dataLimite = checkItem.rows[0].data_limite;
    if (currentDate > dataLimite) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ error: 'Cannot claim item past the claimable date' });
    }

    await pool.query('UPDATE ObjetoAchado SET ativo = false, claimant_id = $1, data_claimed = $2 WHERE ID = $3', [sanitizedClaimantId, currentDate, itemId]);
    await pool.query('COMMIT');

    res.json({ message: 'Item claimed successfully' });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Query Error', error);
    res.status(500).json({ error: 'Server error while claiming item' });
  }
});



// Get all found items 
router.get('/items/found', policeAuthMiddleware, doubleAuthMiddleware, async (req, res) => {
  
  try {
    const { rows } = await pool.query('SELECT * FROM ObjetoAchado');
    //log successful query if no error is thrown
    if (rows.length === 0) {
      return res.status(404).json({ error: 'No found items available' });
    }
    else console.log('Get all found items Query successful');
    res.json(rows);

  } catch (error) {
    console.error('Error executing query', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// Server Side
// Define the POST endpoint to register a found item and if there is a correspondent lost item, set ativo (on lost item table) to false (protected route)
router.post('/items/found/register', policeAuthMiddleware, doubleAuthMiddleware, isAuthenticated, async (req, res) => {
  // Extract details from the request body
  const { titulo, descricao_curta, descricao, categoria, data_achado, localizacao_achado, data_limite, valor_monetario, imageURL } = req.body;
  const userID = req.userId;
  // Validate required fields to ensure no critical data is missing
  if (!titulo || !descricao_curta || !descricao || !categoria || !data_achado || !localizacao_achado || !data_limite || !imageURL) {
    return res.status(400).json({ error: 'Invalid input: required fields are missing.' });
  }

  //Log userID
  console.log('User ID:', userID);

  const sanitizedTitulo = sanitizeInput(titulo);
  const sanitizedDescricaoCurta = sanitizeInput(descricao_curta);
  const sanitizedDescricao = sanitizeInput(descricao);
  const sanitizedCategoria = sanitizeInput(categoria);
  const sanitizedDataAchado = new Date(data_achado);
  const sanitizedImageURL = sanitizeURL(imageURL);

  if (!sanitizedImageURL) {
    return res.status(400).json({ error: 'Invalid URL provided' });
  }

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

  try {
    // Buscar o ID do policial usando o firebase_uid do req.userId
    const resultPolicial = await pool.query('SELECT id FROM MembroPolicia WHERE utilizador_id = $1', [userID]);
    if (resultPolicial.rowCount === 0) {
      return res.status(404).json({ error: 'Policial não encontrado' });
    }
    const sanitizedPolicialId = resultPolicial.rows[0].id;

    // Insert the new found item into the ObjetoAchado table
    const insertQuery = `
      INSERT INTO ObjetoAchado (titulo, descricao_curta, descricao, categoria, data_achado, localizacao_achado, data_limite, ativo, valor_monetario, policial_id, imageURL)
      VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, $9, $10)
      RETURNING ID;
    `;
    const values = [sanitizedTitulo, sanitizedDescricaoCurta, sanitizedDescricao, sanitizedCategoria, sanitizedDataAchado, JSON.stringify(sanitizedLocalizacaoAchado), sanitizedDataLimite, sanitizedValorMonetario || null, sanitizedPolicialId, sanitizedImageURL];

    // Execute the query
    const result = await pool.query(insertQuery, values);

    // Retrieve the ID of the newly inserted item
    const newItemId = result.rows[0].id;

    // Check for matches in the ObjetoPerdido table
    const matchQuery = `
      SELECT id
      FROM ObjetoPerdido
      WHERE LOWER(descricao_curta) = LOWER($1)
        AND LOWER(categoria) = LOWER($2)
        AND (localizacao_perdido->>'latitude')::float = $3
        AND (localizacao_perdido->>'longitude')::float = $4
        AND ativo = true;
    `;
    const matchValues = [sanitizedDescricaoCurta, sanitizedCategoria, sanitizedLocalizacaoAchado.latitude, sanitizedLocalizacaoAchado.longitude];
    const matchResult = await pool.query(matchQuery, matchValues);

    if (matchResult.rows.length > 0) {
      const lostItemId = matchResult.rows[0].id;

      // Update the matched lost item to set ativo to false
      const updateLostItemQuery = `
        UPDATE ObjetoPerdido
        SET ativo = false
        WHERE id = $1;
      `;
      await pool.query(updateLostItemQuery, [lostItemId]);
    }

    // Return a success message with the new item ID
    res.status(201).json({ message: 'Found item registered successfully', id: newItemId });

  } catch (error) {
    console.error('Error registering found item:', error);
    res.status(500).json({ error: 'Server error while registering the found item.' });
  }
});



// Define the POST endpoint to register a new police member (protected route)
router.post('/members', adminAuthMiddleware,doubleAuthMiddleware, async (req, res) => {
  const { email, password, nome, genero, data_nasc, morada, telemovel, posto_policia, historico_policia } = req.body;

  const sanitizeInput2 = (input) => {
    if (typeof input === 'string') {
      return input.replace(/[^a-zA-Z0-9\s@.]/g, ''); // Allow email characters
    } else if (typeof input === 'object' && input !== null) {
      const sanitizedObject = {};
      for (const key in input) {
        sanitizedObject[key] = sanitizeInput2(input[key]);
      }
      return sanitizedObject;
    }
    return input;
  };

  const sanitizedEmail = sanitizeInput2(email);
  const sanitizedPassword = sanitizeInput2(password);
  const sanitizedNome = sanitizeInput2(nome);
  const sanitizedGenero = sanitizeInput2(genero);
  const sanitizedDataNasc = sanitizeInput2(data_nasc);
  const sanitizedMorada = sanitizeInput2(morada);
  const sanitizedTelemovel = sanitizeInput2(telemovel);
  const sanitizedPosto = parseInt(sanitizeInput2(posto_policia));
  const sanitizedHistorico = historico_policia ? JSON.stringify(sanitizeInput2(historico_policia)) : null;

  // Validate the required fields
  if (!sanitizedNome || isNaN(sanitizedPosto)) {
    return res.status(400).json({ error: 'Invalid input: missing required fields "nome" or "posto_policia".' });
  }

  try {
    const userCredential = await admin.auth().createUser({ email: sanitizedEmail, password: sanitizedPassword });
    const user = userCredential.uid;

    await pool.query(
      'INSERT INTO Utilizador (firebase_uid, nome, genero, data_nasc, morada, email, telemovel, ativo, isCop) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      [user, sanitizedNome, sanitizedGenero, sanitizedDataNasc, sanitizedMorada, sanitizedEmail, sanitizedTelemovel, true, true]
    );

    // Prepare the SQL query to insert a new police member
    const insertQuery = `
      INSERT INTO MembroPolicia (utilizador_id, posto_policia, historico_policia)
      VALUES ($1, $2, $3::jsonb)
      RETURNING ID;
    `;
    const values = [user, sanitizedPosto, sanitizedHistorico];

    // Execute the query with parameterized values to prevent SQL injection
    const result = await pool.query(insertQuery, values);

    // Retrieve the ID of the newly inserted member from the query result
    const newMemberId = result.rows[0].id;

    // Get an access token from Auth0 for API authentication
    const tokenResponse = await axios.post(`https://${auth0Config.domain}/oauth/token`, {
      grant_type: 'client_credentials',
      client_id: auth0Config.clientId,
      client_secret: auth0Config.clientSecret,
      audience: auth0Config.audience
    });

    const accessToken = tokenResponse.data.access_token;

    // Return a 201 response to indicate successful registration
    res.status(201).json({ message: 'Police member registered successfully', id: newMemberId, accessToken });

  } catch (error) {
    console.error('Error registering police member:', error);
    res.status(500).json({ error: 'Server error while registering police member.' });
  }
});






// Define the POST endpoint to register a new police post (protected route)
router.post('/posts', adminAuthMiddleware,doubleAuthMiddleware,async (req, res) => {
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
  

// Define the PUT endpoint to edit an existing police post (protected route)
router.delete('/posts/:postId', adminAuthMiddleware, doubleAuthMiddleware, async (req, res) => {
  const postId = parseInt(req.params.postId, 10);

  if (isNaN(postId)) {
    return res.status(400).json({ error: 'Invalid postId. It must be a number.' });
  }

  try {
    // Check if the police post exists
    const checkQuery = 'SELECT 1 FROM PostoPolicia WHERE ID = $1';
    const checkResult = await pool.query(checkQuery, [postId]);

    if (checkResult.rowCount === 0) {
      return res.status(404).json({ error: 'Police post not found.' });
    }

    // Check if the "Sem-Abrigo" post exists
    const semAbrigoCheckQuery = 'SELECT ID FROM PostoPolicia WHERE morada = $1';
    const semAbrigoCheckResult = await pool.query(semAbrigoCheckQuery, ['Sem-Abrigo']);

    let semAbrigoId;
    if (semAbrigoCheckResult.rowCount === 0) {
      // Create the "Sem-Abrigo" post if it doesn't exist
      const createSemAbrigoQuery = 'INSERT INTO PostoPolicia (morada) VALUES ($1) RETURNING ID';
      const createSemAbrigoResult = await pool.query(createSemAbrigoQuery, ['Sem-Abrigo']);
      semAbrigoId = createSemAbrigoResult.rows[0].id;
    } else {
      semAbrigoId = semAbrigoCheckResult.rows[0].id;
    }

    // Update affected cops to the "Sem-Abrigo" post
    const updateCopsQuery = 'UPDATE MembroPolicia SET posto_policia = $1 WHERE posto_policia = $2';
    await pool.query(updateCopsQuery, [semAbrigoId, postId]);

    // Prepare the SQL query to delete the police post
    const deleteQuery = 'DELETE FROM PostoPolicia WHERE ID = $1';
    await pool.query(deleteQuery, [postId]);

    // Return a 200 response to indicate successful deletion
    res.status(200).json({ message: 'Police post deleted successfully' });

  } catch (error) {
    console.error('Error deleting police post:', error);
    res.status(500).json({ error: 'Server error while deleting police post.' });
  }
});


router.delete('/posts/:postId', adminAuthMiddleware, doubleAuthMiddleware, async (req, res) => {
  const postId = parseInt(req.params.postId, 10);

  if (isNaN(postId)) {
    return res.status(400).json({ error: 'Invalid postId. It must be a number.' });
  }

  try {
    // Check if the police post exists
    const checkQuery = 'SELECT 1 FROM PostoPolicia WHERE ID = $1';
    const checkResult = await pool.query(checkQuery, [postId]);

    if (checkResult.rowCount === 0) {
      return res.status(404).json({ error: 'Police post not found.' });
    }

    // Check if the "Sem-Abrigo" post exists or create it
    const semAbrigoQuery = `
      INSERT INTO PostoPolicia (morada)
      VALUES ('Sem-Abrigo')
      ON CONFLICT (morada) DO NOTHING
      RETURNING ID
    `;
    const semAbrigoResult = await pool.query(semAbrigoQuery);

    let semAbrigoId;
    if (semAbrigoResult.rowCount === 0) {
      const fetchSemAbrigoIdQuery = 'SELECT ID FROM PostoPolicia WHERE morada = $1';
      const fetchSemAbrigoIdResult = await pool.query(fetchSemAbrigoIdQuery, ['Sem-Abrigo']);
      semAbrigoId = fetchSemAbrigoIdResult.rows[0].id;
    } else {
      semAbrigoId = semAbrigoResult.rows[0].id;
    }

    // Update affected cops to the "Sem-Abrigo" post
    const updateCopsQuery = 'UPDATE MembroPolicia SET posto_policia = $1 WHERE posto_policia = $2';
    await pool.query(updateCopsQuery, [semAbrigoId, postId]);

    // Prepare the SQL query to delete the police post
    const deleteQuery = 'DELETE FROM PostoPolicia WHERE ID = $1';
    await pool.query(deleteQuery, [postId]);

    // Return a 200 response to indicate successful deletion
    res.status(200).json({ message: 'Police post deleted successfully' });

  } catch (error) {
    console.error('Error deleting police post:', error);
    res.status(500).json({ error: 'Server error while deleting police post.' });
  }
});



// Define the GET endpoint to retrieve all police posts (protected route)
router.get('/posts', adminAuthMiddleware,doubleAuthMiddleware, async (req, res) => {
  try {
    // Query to retrieve all police posts
    const policePostsQuery = `
      SELECT *
      FROM PostoPolicia
    `;
    const policePostsResult = await pool.query(policePostsQuery);

    // Return the police posts
    res.status(200).json(policePostsResult.rows);
  } catch (error) {
    console.error('Error retrieving police posts:', error);
    res.status(500).json({ error: 'Server error while retrieving police posts.' });
  }
});

// Define the GET endpoint to retrieve all police members (protected route)
router.get('/members', adminAuthMiddleware,doubleAuthMiddleware, async (req, res) => {
  try {
    // Query to retrieve all police members
    const policeMembersQuery = `
      SELECT mp.id,mp.utilizador_id, mp.posto_policia, mp.historico_policia, u.nome, u.genero, u.data_nasc, u.morada, u.email, u.telemovel
      FROM MembroPolicia mp
      JOIN Utilizador u ON mp.utilizador_id = u.firebase_uid
      ORDER BY mp.id
    `;
    const policeMembersResult = await pool.query(policeMembersQuery);

    // Return the police members
    res.status(200).json(policeMembersResult.rows);
  } catch (error) {
    console.error('Error retrieving police members:', error);
    res.status(500).json({ error: 'Server error while retrieving police members.' });
  }
});

//get a list of users so the police member can choose the reports to see.
// cuz in the reports we have some endpoints that receive user id and the police member needs to know the id of the user
//the police member is the only one that can see the reports of the users

// Get a list of users for police members (protected route)
router.get('/users', policeAuthMiddleware, doubleAuthMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM Utilizador WHERE ativo = TRUE');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

 // Definir um endpoint GET para buscar todos os leilões do past, active and future(protected route)
 router.get('/auctions', policeAuthMiddleware, doubleAuthMiddleware, async (req, res) => {
  const { type } = req.query;
  
  let query = '';
  let queryParams = [];
  
  if (type === 'past') {
    query = 'SELECT * FROM Leilao WHERE data_fim < NOW()';
  } else if (type === 'active') {
    query = 'SELECT * FROM Leilao WHERE data_inicio <= NOW() AND data_fim >= NOW()';
  } else if (type === 'future') {
    query = 'SELECT * FROM Leilao WHERE data_inicio > NOW()';
  } else {
    return res.status(400).json({ error: 'Invalid type parameter. Valid values are: past, active, future' });
  }

  try {
    const { rows } = await pool.query(query, queryParams);
    res.json(rows);
  } catch (error) {
    console.error('Error executing query', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Edit details of a found item
router.put('/items/found/:itemId', doubleAuthMiddleware,policeAuthMiddleware, doubleAuthMiddleware, async (req, res) => {
  const { itemId } = req.params;
  const { descricao_curta, descricao, categoria, data_achado, localizacao_achado, ativo, data_limite, valor_monetario } = req.body;
 

  // Input validation and sanitization
  if (isNaN(parseInt(itemId))) {
      console.log('Invalid Item ID!');
      return res.status(400).json({ error: 'Invalid Item ID!' });
  }

  const sanitizedDescricaoCurta = sanitizeInput(descricao_curta);
  const sanitizedDescricao = sanitizeInput(descricao);
  const sanitizedCategoria = sanitizeInput(categoria);
  const sanitizedLocalizacao = {
      latitude: sanitizeInput(localizacao_achado.latitude.toString()),
      longitude: sanitizeInput(localizacao_achado.longitude.toString())
  };

  try {
      const result = await pool.query(
          `UPDATE ObjetoAchado 
           SET descricao_curta = $1, descricao = $2, categoria = $3, data_achado = $4, localizacao_achado = $5, ativo = $6, data_limite = $7, valor_monetario = $8 
           WHERE id = $9 `,
          [
              sanitizedDescricaoCurta,
              sanitizedDescricao,
              sanitizedCategoria,
              data_achado,
              sanitizedLocalizacao,
              ativo,
              data_limite,
              valor_monetario,
              itemId
             
          ]
      );

      if (result.rowCount === 0) {
          console.log('Found item not found or not authorized');
          res.status(404).json({ error: 'Item not found or not authorized' });
      } else {
          console.log('Found item details updated successfully');
          res.status(200).json({ message: 'Found item details updated' });
      }
  } catch (error) {
      console.error('Error updating found item details:', error);
      res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a found item
router.delete("/items/found/:itemId", doubleAuthMiddleware, policeAuthMiddleware, doubleAuthMiddleware, async (req, res) => {
  const { itemId } = req.params;


  // Input validation
  if (isNaN(parseInt(itemId))) {
      console.log("Invalid Item ID!");
      return res.status(400).json({ error: "Invalid Item ID!" });
  }

  try {
      const result = await pool.query(
          "DELETE FROM ObjetoAchado WHERE ID = $1",
          [itemId]
      );

      if (result.rowCount === 0) {
          console.log("Found item not found or not authorized");
          res.status(404).json({ error: "Item not found or not authorized" });
      } else {
          console.log("Found item deleted successfully");
          res.status(200).json({ message: "Found item deleted" });
      }
  } catch (error) {
      console.error("Error deleting found item:", error);
      res.status(500).json({ error: "Internal server error" });
  }
});



module.exports = router;
