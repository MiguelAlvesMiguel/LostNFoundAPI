const express = require('express');
const pool = require('../db');
const { getAuth } = require('firebase/auth');

const router = express.Router();
const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert(require('../adminKey.json')),
});

const isAuthenticated = async (req, res, next) => {
    console.log('Checking authentication...');
    const { authorization } = req.headers;
  
    if (authorization && authorization.startsWith('Bearer ')) {
      const idToken = authorization.split('Bearer ')[1];
      try {
        console.log('Verifying ID token...');
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        console.log('ID token is valid:', decodedToken);
        req.userId = decodedToken.uid;
        return next();
      } catch (e) {
        console.error('Error while verifying Firebase ID token:', e);
      }
    } else {
      console.log('No authorization token was found');
    }
    res.status(401).json({ error: 'Unauthorized' });
  };

// Register a lost item
router.post(
  '/lost',
  isAuthenticated,
  [
    body('descricao').notEmpty().withMessage('Description is required'),
    body('categoria').notEmpty().withMessage('Category is required'),
    body('data_perdido').isDate().withMessage('Invalid date'),
    body('localizacao_perdido').notEmpty().withMessage('Location is required'),
    body('ativo').isBoolean().withMessage('Invalid status'),
  ],
  validateRequest,
  async (req, res) => {
    const { descricao, categoria, data_perdido, localizacao_perdido, ativo } = req.body;
    const userId = req.userId;

    try {
      const result = await pool.query(
        'INSERT INTO ObjetoPerdido (descricao, categoria, data_perdido, localizacao_perdido, ativo, utilizador_id) VALUES ($1, $2, $3, $4, $5, $6)',
        [descricao, categoria, data_perdido, JSON.stringify(localizacao_perdido), ativo, userId]
      );
      res.status(201).json({ message: 'Lost item registered successfully' });
    } catch (error) {
      console.error('Error registering lost item:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Edit details of a lost item
router.put(
  '/lost/:itemId',
  isAuthenticated,
  [
    param('itemId').isInt().withMessage('Invalid item ID'),
    body('descricao').notEmpty().withMessage('Description is required'),
    body('categoria').notEmpty().withMessage('Category is required'),
    body('data_perdido').isDate().withMessage('Invalid date'),
    body('localizacao_perdido').notEmpty().withMessage('Location is required'),
    body('ativo').isBoolean().withMessage('Invalid status'),
  ],
  validateRequest,
  async (req, res) => {
    const { itemId } = req.params;
    const { descricao, categoria, data_perdido, localizacao_perdido, ativo } = req.body;
    const userId = req.userId;

    try {
      const result = await pool.query(
        'UPDATE ObjetoPerdido SET descricao = $1, categoria = $2, data_perdido = $3, localizacao_perdido = $4, ativo = $5 WHERE ID = $6 AND utilizador_id = $7',
        [descricao, categoria, data_perdido, localizacao_perdido, ativo, itemId, userId]
      );

      if (result.rowCount === 0) {
        res.status(404).json({ error: 'Item not found or not authorized' });
      } else {
        res.status(200).json({ message: 'Lost item details updated' });
      }
    } catch (error) {
      console.error('Error updating lost item details:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Remove a lost item
router.delete(
  '/lost/:itemId',
  isAuthenticated,
  [param('itemId').isInt().withMessage('Invalid item ID')],
  validateRequest,
  async (req, res) => {
    const { itemId } = req.params;
    const userId = req.userId;

    try {
      const result = await pool.query('DELETE FROM ObjetoPerdido WHERE ID = $1 AND utilizador_id = $2', [itemId, userId]);

      if (result.rowCount === 0) {
        res.status(404).json({ error: 'Item not found or not authorized' });
      } else {
        res.status(204).end();
      }
    } catch (error) {
      console.error('Error removing lost item:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Search lost items by description or category
router.get(
  '/lost/search',
  isAuthenticated,
  [
    body('description').optional().isString().withMessage('Invalid description'),
    body('category').optional().isString().withMessage('Invalid category'),
    body('page').optional().isInt({ min: 1 }).withMessage('Invalid page number'),
    body('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('Invalid page size'),
  ],
  validateRequest,
  async (req, res) => {
    const { description, category, page = 1, pageSize = 10 } = req.query;

    try {
      let query = 'SELECT * FROM ObjetoPerdido';
      const values = [];

      if (description || category) {
        query += ' WHERE';

        if (description) {
          query += ' descricao ILIKE $1';
          values.push(`%${description}%`);
        }

        if (category) {
          if (description) {
            query += ' AND';
          }
          query += ' categoria = $2';
          values.push(category);
        }
      }

      const offset = (page - 1) * pageSize;
      query += ' ORDER BY ID LIMIT $3 OFFSET $4';
      values.push(pageSize, offset);

      const result = await pool.query(query, values);
      res.status(200).json(result.rows);
    } catch (error) {
      console.error('Error searching lost items:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Compare a lost item with a found item
router.get(
  '/compare/:lostItemId/:foundItemId',
  isAuthenticated,
  [
    param('lostItemId').isInt().withMessage('Invalid lost item ID'),
    param('foundItemId').isInt().withMessage('Invalid found item ID'),
  ],
  validateRequest,
  async (req, res) => {
    const { lostItemId, foundItemId } = req.params;
    const userId = req.userId;

    try {
      const lostItemResult = await pool.query('SELECT * FROM ObjetoPerdido WHERE ID = $1 AND utilizador_id = $2', [lostItemId, userId]);
      const foundItemResult = await pool.query('SELECT * FROM ObjetoAchado WHERE ID = $1', [foundItemId]);

      if (lostItemResult.rowCount === 0 || foundItemResult.rowCount === 0) {
        res.status(404).json({ error: 'Item not found or not authorized' });
      } else {
        const lostItem = lostItemResult.rows[0];
        const foundItem = foundItemResult.rows[0];

        const similarities = [];
        const differences = [];

        // Compare properties and populate similarities and differences arrays
        if (lostItem.descricao === foundItem.descricao) {
          similarities.push('descricao');
        } else {
          differences.push('descricao');
        }

        if (lostItem.categoria === foundItem.categoria) {
          similarities.push('categoria');
        } else {
          differences.push('categoria');
        }

        // Compare other properties as needed

        res.status(200).json({ similarities, differences });
      }
    } catch (error) {
      console.error('Error comparing items:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Search for found items
router.get(
  '/found',
  isAuthenticated,
  [
    body('description').optional().isString().withMessage('Invalid description'),
    body('page').optional().isInt({ min: 1 }).withMessage('Invalid page number'),
    body('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('Invalid page size'),
  ],
  validateRequest,
  async (req, res) => {
    const { description, page = 1, pageSize = 10 } = req.query;

    try {
      let query = 'SELECT * FROM ObjetoAchado';
      const values = [];

      if (description) {
        query += ' WHERE descricao ILIKE $1';
        values.push(`%${description}%`);
      }

      const offset = (page - 1) * pageSize;
      query += ' ORDER BY ID LIMIT $2 OFFSET $3';
      values.push(pageSize, offset);

      const result = await pool.query(query, values);
      res.status(200).json(result.rows);
    } catch (error) {
      console.error('Error searching found items:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// View history of a lost item
router.get(
  '/lost/:itemId/history',
  isAuthenticated,
  [param('itemId').isInt().withMessage('Invalid item ID')],
  validateRequest,
  async (req, res) => {
    const { itemId } = req.params;
    const userId = req.userId;

    try {
      const result = await pool.query(
        'SELECT data_perdido, localizacao_perdido, ativo FROM ObjetoPerdido WHERE ID = $1 AND utilizador_id = $2',
        [itemId, userId]
      );

      if (result.rowCount === 0) {
        res.status(404).json({ error: 'Item not found or not authorized' });
      } else {
        const history = result.rows.map((row) => ({
          date: row.data_perdido,
          location: row.localizacao_perdido,
          status: row.ativo ? 'active' : 'inactive',
        }));
        res.status(200).json(history);
      }
    } catch (error) {
      console.error('Error retrieving lost item history:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Register delivery of a found item to its owner
router.post(
  '/found/:itemId/deliver',
  isAuthenticated,
  [
    param('itemId').isInt().withMessage('Invalid item ID'),
    body('ownerId').notEmpty().withMessage('Owner ID is required'),
    body('deliveryDate').isDate().withMessage('Invalid delivery date'),
  ],
  validateRequest,
  async (req, res) => {
    const { itemId } = req.params;
    const { ownerId, deliveryDate } = req.body;
    const userId = req.userId;

    try {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Validate that the current user is a police officer and authorized to register the delivery
        const userResult = await client.query('SELECT * FROM MembroPolicia WHERE ID = $1', [userId]);
        if (userResult.rowCount === 0) {
          res.status(403).json({ error: 'Forbidden' });
          return;
        }

        const result = await client.query(
          'UPDATE ObjetoAchado SET utilizador_id = $1, data_entrega = $2, ativo = false WHERE ID = $3',
          [ownerId, deliveryDate, itemId]
        );

        if (result.rowCount === 0) {
          res.status(404).json({ error: 'Item not found' });
        } else {
          await client.query('COMMIT');
          res.status(200).json({ message: 'Found item delivery registered' });
        }
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error registering found item delivery:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

module.exports = router;