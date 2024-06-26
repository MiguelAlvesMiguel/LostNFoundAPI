const express = require('express');
const pool = require('../db');
const { getAuth } = require('firebase/auth');
const router = express.Router();
const admin = require('firebase-admin');
const firebaseAuth = require('../middlewares/firebaseAuthMiddleware');
const jwtCheck = require('../middlewares/jwtCheckMiddleware');
const policeAuthMiddleware = require('../middlewares/policeAuth');
const doubleAuthMiddleware = require('../middlewares/doubleAuthMiddleware');
const db = require('../db'); // Adjust the path as necessary

const isAuthenticated = async (req, res, next) => {
  try {
    const { authorization } = req.headers;

    if (authorization && authorization.startsWith('Bearer ')) {
      const idToken = authorization.split('Bearer ')[1];
      console.log('Verifying ID token...');
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      console.log('ID token is valid:', decodedToken);
      req.userId = decodedToken.uid;
      return next();
    }

    console.log('No authorization token was found');
    res.status(401).json({ error: 'Unauthorized' });
  } catch (error) {
    console.error('Error while verifying Firebase ID token:', error);
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// Sanitize input data
const sanitizeInput = (input) => {
  return input.replace(/[^a-zA-Z0-9\s]/g, '');
};
//Test endpoint to test middlewares 

router.get('/test', doubleAuthMiddleware  , async (req, res) => {
  res.status(200).json({ message: 'Test endpoint with firebase+auth0 working!' });
});

// Create a new auction if it doesn't already exist
router.post('/auctions',doubleAuthMiddleware, policeAuthMiddleware, isAuthenticated, async (req, res) => {
  const { objeto_achado_id, data_inicio, data_fim, localizacao, valor_base } = req.body;
  
  try {
      // Check if an auction already exists for this object
      const existingAuction = await db.query(
          'SELECT * FROM Leilao WHERE objeto_achado_id = $1',
          [objeto_achado_id]
      );

      if (existingAuction.rows.length > 0) {
          return res.status(400).json({ message: 'Auction already exists for this item' });
      }

      // Create a new auction
      const newAuction = await db.query(
          'INSERT INTO Leilao (objeto_achado_id, data_inicio, data_fim, localizacao, valor_base, ativo) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
          [objeto_achado_id, data_inicio, data_fim, localizacao, valor_base, true]
      );

      res.status(201).json(newAuction.rows[0]);
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
  }
});
function sanitizeeInput(input) {
  if (typeof input === 'string') {
    return input.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  return input;
}

router.put('/auctions/:auctionId', isAuthenticated,doubleAuthMiddleware, policeAuthMiddleware, async (req, res) => {
  const { auctionId } = req.params;
  const { dataInicio, dataFim, localizacao, ativo } = req.body;

  //Log all params
  console.log('auctionId:', auctionId);
  console.log('dataInicio:', dataInicio);
  console.log('dataFim:', dataFim);
  console.log('localizacao:', localizacao);
  console.log('ativo:', ativo);
  

  // Input validation and sanitization
  if (isNaN(parseInt(auctionId))) {
    console.log('Invalid auction ID');
    return res.status(400).json({ error: 'Invalid auction ID' });
  }

  const sanitizedLocalizacao = sanitizeeInput(localizacao);
  const sanitizedDataInicio = sanitizeeInput(dataInicio);
  const sanitizedDataFim = sanitizeeInput(dataFim);

  //Log all sanitized params
  console.log('sanitizedDataInicio:', sanitizedDataInicio);
  console.log('sanitizedDataFim:', sanitizedDataFim);
  console.log('sanitizedLocalizacao:', sanitizedLocalizacao);
  console.log('ativo:', ativo);

  try {
    const result = await pool.query(
      'UPDATE Leilao SET data_inicio = $1, data_fim = $2, localizacao = $3, ativo = $4 WHERE ID = $5',
      [sanitizedDataInicio, sanitizedDataFim, sanitizedLocalizacao, ativo, auctionId]
    );

    if (result.rowCount === 0) {
      console.log('Auction not found');
      res.status(404).json({ error: 'Auction not found' });
    } else {
      console.log('Auction details updated successfully');
      res.status(200).json({ message: 'Auction details updated' });
    }
  } catch (error) {
    console.error('Error updating auction details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/auctions/:auctionId', doubleAuthMiddleware, policeAuthMiddleware,   async (req, res) => {
  const { auctionId } = req.params;

  // Input validation
  if (isNaN(parseInt(auctionId))) {
    console.log('Invalid auction ID');
    return res.status(400).json({ error: 'Invalid auction ID' });
  }

  try {
    const result = await pool.query('DELETE FROM Leilao WHERE ID = $1', [auctionId]);

    if (result.rowCount === 0) {
      console.log('Auction not found');
      res.status(404).json({ error: 'Auction not found' });
    } else {
      console.log('Auction removed successfully');
      res.status(204).end();
    }
  } catch (error) {
    console.error('Error removing auction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/auctions', async (req, res) => {
  const { status } = req.query;

  try {
    let query = `
      SELECT le.*, oa.descricao, oa.imageurl, oa.titulo, le.valor_base
      FROM Leilao le
      JOIN ObjetoAchado oa ON le.objeto_achado_id = oa.id
    `;
    const values = [];

    if (status) {
      if (status === 'active') {
        query += ' WHERE le.data_inicio <= CURRENT_DATE AND le.data_fim >= CURRENT_DATE';
      } else if (status === 'upcoming') {
        query += ' WHERE le.data_inicio > CURRENT_DATE';
      } else if (status === 'past') {
        query += ' WHERE le.data_fim < CURRENT_DATE';
      } else {
        console.log('Invalid status parameter');
        return res.status(400).json({ error: 'Invalid status parameter' });
      }
    }

    const result = await pool.query(query, values);
    
    const auctions = await Promise.all(result.rows.map(async auction => {
      const bids = await pool.query('SELECT * FROM Licitacao WHERE leilao_id = $1 ORDER BY valor_licitacao DESC', [auction.id]);
      return { ...auction, bids: bids.rows, valor_base: parseFloat(auction.valor_base) };
    }));
    
    console.log('Auctions retrieved successfully');
    res.status(200).json(auctions);
  } catch (error) {
    console.error('Error retrieving auctions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Subscribe and cancel notifications about an auction (RF-20)
router.post('/auctions/:auctionId/notify', doubleAuthMiddleware, async (req, res) => {
  const { auctionId } = req.params;
  const { userId } = req.body;

  // Input validation
  if (isNaN(parseInt(auctionId)) || isNaN(parseInt(userId))) {
    console.log('Invalid auction or user ID');
    return res.status(400).json({ error: 'Invalid auction or user ID' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO Notificacao (utilizador_id, mensagem, data) VALUES ($1, $2, CURRENT_TIMESTAMP)',
      [userId, `Subscribed to notifications for auction ${auctionId}`]
    );

    console.log('Subscription to auction notifications successful');
    res.status(200).json({ message: 'Successfully subscribed to notifications' });
  } catch (error) {
    console.error('Error subscribing to auction notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/auctions/:auctionId/notify/cancel', doubleAuthMiddleware, async (req, res) => {
  const { auctionId } = req.params;
  const { userId } = req.body;

  // Input validation
  if (isNaN(parseInt(auctionId)) || isNaN(parseInt(userId))) {
    console.log('Invalid auction or user ID');
    return res.status(400).json({ error: 'Invalid auction or user ID' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO Notificacao (utilizador_id, mensagem, data) VALUES ($1, $2, CURRENT_TIMESTAMP)',
      [userId, `Cancelled notifications for auction ${auctionId}`]
    );

    console.log('Cancellation of auction notifications successful');
    res.status(200).json({ message: 'Successfully cancelled notifications' });
  } catch (error) {
    console.error('Error cancelling auction notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start and end an auction (RF-22)
router.post('/auctions/:auctionId/start', doubleAuthMiddleware, policeAuthMiddleware, isAuthenticated, async (req, res) => {
  const { auctionId } = req.params;

  // Input validation
  if (isNaN(parseInt(auctionId))) {
    console.log('Invalid auction ID');
    return res.status(400).json({ error: 'Invalid auction ID' });
  }

  try {
    const result = await pool.query('UPDATE Leilao SET ativo = true WHERE ID = $1', [auctionId]);

    if (result.rowCount === 0) {
      console.log('Auction not found');
      res.status(404).json({ error: 'Auction not found' });
    } else {
      console.log('Auction started successfully');
      res.status(200).json({ message: 'Auction started successfully' });
    }
  } catch (error) {
    console.error('Error starting auction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/auctions/:auctionId/end', isAuthenticated, policeAuthMiddleware, async (req, res) => {
  const { auctionId } = req.params;

  // Input validation
  if (isNaN(parseInt(auctionId))) {
    console.log('Invalid auction ID');
    return res.status(400).json({ error: 'Invalid auction ID' });
  }

  try {
    const result = await pool.query(
      'UPDATE Leilao SET ativo = false, data_fim = NOW() WHERE ID = $1',
      [auctionId]
    );

    if (result.rowCount === 0) {
      console.log('Auction not found');
      res.status(404).json({ error: 'Auction not found' });
    } else {
      console.log('Auction ended successfully');
      res.status(200).json({ message: 'Auction ended successfully' });
    }
  } catch (error) {
    console.error('Error ending auction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// View bidding history in an auction (RF-23)
router.get('/auctions/:auctionId/bids', doubleAuthMiddleware, async (req, res) => {
  const { auctionId } = req.params;

  // Input validation
  if (isNaN(parseInt(auctionId))) {
    console.log('Invalid auction ID');
    return res.status(400).json({ error: 'Invalid auction ID' });
  }

  try {
    const result = await pool.query('SELECT * FROM Licitacao WHERE leilao_id = $1', [auctionId]);
    console.log('Bidding history retrieved successfully');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error retrieving bidding history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bid on an object in an auction (RF-24)
router.post('/auctions/:auctionId/bid', doubleAuthMiddleware, isAuthenticated, async (req, res) => {
  const { auctionId } = req.params;
  const { valorLicitacao } = req.body; // Remove utilizadorId from body

  // Input validation
  if (isNaN(parseInt(auctionId)) || isNaN(parseFloat(valorLicitacao))) {
    console.log('Invalid auction ID or bid value');
    return res.status(400).json({ error: 'Invalid auction ID or bid value' });
  }

  try {
    const utilizadorId = req.userId; // Get userId from req object

    // Check the highest bid or the base value of the auction
    const auctionResult = await pool.query(
      'SELECT valor_base FROM Leilao WHERE id = $1',
      [auctionId]
    );

    if (auctionResult.rowCount === 0) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    const highestBidResult = await pool.query(
      'SELECT MAX(valor_licitacao) AS highest_bid FROM Licitacao WHERE leilao_id = $1',
      [auctionId]
    );

    const highestBid = highestBidResult.rows[0].highest_bid || auctionResult.rows[0].valor_base;

    if (parseFloat(valorLicitacao) <= highestBid) {
      return res.status(400).json({ error: 'Bid value must be higher than the current highest bid or base value' });
    }

    // Insert the new bid
    const result = await pool.query(
      'INSERT INTO Licitacao (leilao_id, utilizador_id, valor_licitacao) VALUES ($1, $2, $3)',
      [auctionId, utilizadorId, valorLicitacao]
    );

    console.log('Bid placed successfully');
    res.status(201).json({ message: 'Bid placed successfully' });
  } catch (error) {
    console.error('Error placing bid:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Process payment for a bidded object (RF-25)
router.post('/auctions/:auctionId/pay', doubleAuthMiddleware, async (req, res) => {
  const { auctionId } = req.params;
  const { bidderId, amount } = req.body;

  // Input validation
  if (isNaN(parseInt(auctionId)) || isNaN(parseInt(bidderId)) || isNaN(parseFloat(amount))) {
    console.log('Invalid auction ID, bidder ID, or payment amount');
    return res.status(400).json({ error: 'Invalid auction ID, bidder ID, or payment amount' });
  }

  try {
    // TODO: Implement payment processing logic

    console.log('Payment processed successfully');
    res.status(200).json({ message: 'Payment processed successfully' });
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// View history of objects bought at auction (RF-26)
router.get('/auctions/history', doubleAuthMiddleware, async (req, res) => {
  const { userId } = req.query;

  // Input validation
  if (!userId || isNaN(parseInt(userId))) {
    console.log('Invalid or missing user ID');
    return res.status(400).json({ error: 'Invalid or missing user ID' });
  }

  try {
    const result = await pool.query(
      'SELECT l.leilao_id, l.valor_licitacao, o.descricao ' +
      'FROM Licitacao l ' +
      'JOIN Leilao le ON l.leilao_id = le.id ' +
      'JOIN ObjetoAchado o ON le.objeto_achado_id = o.id ' +
      'WHERE l.utilizador_id = $1 AND le.data_fim < CURRENT_DATE',
      [userId]
    );

    console.log('Auction history retrieved successfully');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error retrieving auction history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// View history of purchased auction items
router.get('/history', async (req, res) => {
  const { userId } = req.query;
  try {
      const result = await pool.query(`
          SELECT Leilao.*, ObjetoAchado.*
          FROM Licitacao
          INNER JOIN Leilao ON Licitacao.leilao_id = Leilao.ID
          INNER JOIN ObjetoAchado ON Leilao.objeto_achado_id = ObjetoAchado.ID
          WHERE Licitacao.utilizador_id = $1 AND Leilao.ativo = FALSE
      `, [userId]);
      res.status(200).json(result.rows);
  } catch (err) {
      res.status(500).json({ error: err.message });
  }
});
// Endpoint to view history of objects purchased at auction
router.get('/auction-history/:userId',doubleAuthMiddleware, async (req, res) => {
  const { userId } = req.params;

  try {
      const result = await pool.query(
          `SELECT L.*, O.*
           FROM Licitacao L
           JOIN Leilao A ON L.leilao_id = A.ID
           JOIN ObjetoAchado O ON A.objeto_achado_id = O.ID
           WHERE L.utilizador_id = $1`,
          [userId]
      );
      res.json(result.rows);
  } catch (err) {
      console.error(err);
      res.status(500).send('Server error');
  }
});

// Endpoint to notify of auction events
router.post('/notify-auction-event', doubleAuthMiddleware, async (req, res) => {
  const { utilizador_id, mensagem, data } = req.body;

  try {
      const result = await pool.query(
          `INSERT INTO Notificacao (utilizador_id, mensagem, data) VALUES ($1, $2, $3) RETURNING *`,
          [utilizador_id, mensagem, data]
      );
      res.status(201).json(result.rows[0]);
  } catch (err) {
      console.error(err);
      res.status(500).send('Server error');
  }
});

// Endpoint to register a possible owner of a found object
router.post('/register-owner', doubleAuthMiddleware, async (req, res) => {
  const { objetoAchadoId, utilizadorId } = req.body;
//sanitize input

  try {
      const result = await pool.query(
          `UPDATE ObjetoAchado SET utilizador_id = $1 WHERE ID = $2 RETURNING *`,
          [utilizadorId, objetoAchadoId]
      );
      res.status(200).json(result.rows[0]);
  } catch (err) {
      console.error(err);
      res.status(500).send('Server error');
  }
});

// Endpoint to edit a possible owner of a found object
router.put('/edit-owner', doubleAuthMiddleware, async (req, res) => {
  const { objetoAchadoId, utilizadorId } = req.body;

  try {
      const result = await pool.query(
          `UPDATE ObjetoAchado SET utilizador_id = $1 WHERE ID = $2 RETURNING *`,
          [utilizadorId, objetoAchadoId]
      );
      res.status(200).json(result.rows[0]);
  } catch (err) {
      console.error(err);
      res.status(500).send('Server error');
  }
});

// Endpoint to remove a possible owner of a found object
router.delete('/remove-owner/:objetoAchadoId',  policeAuthMiddleware, doubleAuthMiddleware, async (req, res) => {
  const { objetoAchadoId } = req.params;

  try {
      const result = await pool.query(
          `UPDATE ObjetoAchado SET utilizador_id = NULL WHERE ID = $1 RETURNING *`,
          [objetoAchadoId]
      );
      res.status(200).json(result.rows[0]);
  } catch (err) {
      console.error(err);
      res.status(500).send('Server error');
  }
});

//get the highest bidder of an auction
router.get('/auctions/:auctionId/highest-bidder', isAuthenticated, async (req, res) => {
  const { auctionId } = req.params;

  try {
    const result = await pool.query(`
      SELECT utilizador_id, valor_licitacao
      FROM Licitacao
      WHERE leilao_id = $1
      ORDER BY valor_licitacao DESC
      LIMIT 1
    `, [auctionId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No bids found for this auction' });
    }

    console.log('Highest bidder retrieved successfully:', result.rows[0]);
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching highest bidder:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to get auction history for logged-in user
router.get('/auction-history', isAuthenticated, async (req, res) => {
  const userId = req.userId;

  try {
    const result = await pool.query(`
      SELECT 
        l.ID as leilao_id,
        l.data_inicio,
        l.data_fim,
        l.localizacao,
        l.valor_base,
        p.data_pagamento,
        p.valor,
        obj.descricao as objeto_descricao
      FROM Pagamento p
      JOIN Licitacao li ON p.licitacao_id = li.ID
      JOIN Leilao l ON li.leilao_id = l.ID
      JOIN ObjetoAchado obj ON l.objeto_achado_id = obj.ID
      WHERE p.utilizador_id = $1 AND p.ativo = true
      ORDER BY p.data_pagamento DESC
    `, [userId]);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching auction history:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;