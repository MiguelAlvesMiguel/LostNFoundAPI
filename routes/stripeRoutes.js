const express = require('express');
const cors = require('cors');
const router = express.Router();
const Stripe = require('stripe');
const stripe = Stripe('sk_test_51PK5IeFruPD66GZILbxm0eX7aH5ho2JKIBefBWDPDfwsp29YdUS0vO1UmzD5Nu7jSrNnwHOZtuRSh82lQVTzg9Yg00g0kr3CZ7'); // Use your Stripe secret key
const pool = require('../db'); // Import the database connection

// Middleware to parse request body
router.use(express.json());
router.use(cors());

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

const sanitizeInput = (input) => {
  return input.replace(/[^a-zA-Z0-9\s]/g, '');
};

// Endpoint to create a Checkout Session
router.post('/create-checkout-session', async (req, res) => {
  console.log('Received request to create checkout session');
  const { pagamento_id } = req.body;

  try {
    const sanitizedPagamentoId = parseInt(pagamento_id);

    if (isNaN(sanitizedPagamentoId) || sanitizedPagamentoId <= 0) {
      console.error('Invalid pagamento_id:', pagamento_id);
      return res.status(400).json({ error: 'Invalid pagamento_id' });
    }

    const result = await pool.query('SELECT valor FROM Pagamento WHERE ID = $1', [sanitizedPagamentoId]);
    if (result.rows.length === 0) {
      console.error('No payment found for pagamento_id:', sanitizedPagamentoId);
      return res.status(400).json({ error: 'Invalid pagamento_id' });
    }

    const amount = parseFloat(result.rows[0].valor) * 100; // Convert to cents
    console.log('Amount to be charged:', amount);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: 'Test Product',
            },
            unit_amount: amount, // Amount in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `http://localhost:5173/success?pagamento_id=${sanitizedPagamentoId}`,
      cancel_url: 'http://localhost:5173/failure',
    });

    res.status(200).json({ id: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to add a new row to Pagamento with ativo set to false
router.post('/add-pagamento', async (req, res) => {
  console.log('Received request to add pagamento');
  const { licitacao_id, utilizador_id, valor } = req.body;

  try {
    const sanitizedUtilizadorId = sanitizeInput(utilizador_id);
    const sanitizedLicitacaoId = parseInt(licitacao_id, 10);
    const sanitizedValor = parseFloat(valor);

    if (isNaN(sanitizedLicitacaoId) || isNaN(sanitizedValor) || !sanitizedUtilizadorId || sanitizedValor <= 0) {
      console.error('Invalid input:', { licitacao_id, utilizador_id, valor });
      return res.status(400).json({ error: 'Invalid input' });
    }

    const existingPayment = await pool.query(
      'SELECT * FROM Pagamento WHERE licitacao_id = $1 AND utilizador_id = $2',
      [sanitizedLicitacaoId, sanitizedUtilizadorId]
    );

    if (existingPayment.rows.length > 0) {
      if (existingPayment.rows[0].ativo) {
        console.log('Payment already made');
        return res.status(400).json({ error: 'Payment already made' });
      } else {
        console.log('Existing inactive payment found, proceeding to checkout');
        return res.status(200).json(existingPayment.rows[0]);
      }
    }

    const result = await pool.query(
      'INSERT INTO Pagamento (licitacao_id, utilizador_id, data_pagamento, valor, ativo) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [sanitizedLicitacaoId, sanitizedUtilizadorId, null, sanitizedValor, false]
    );

    console.log('Pagamento added:', result.rows[0]);
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding pagamento:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to update ativo to true after a successful payment
router.post('/update-pagamento', async (req, res) => {
  console.log('Received request to update pagamento');
  const { pagamento_id } = req.body;

  try {
    const sanitizedPagamentoId = parseInt(pagamento_id);

    if (isNaN(sanitizedPagamentoId) || sanitizedPagamentoId <= 0) {
      console.error('Invalid pagamento_id:', pagamento_id);
      return res.status(400).json({ error: 'Invalid pagamento_id' });
    }

    const currentDate = new Date().toISOString().split('T')[0]; // Get the current date in YYYY-MM-DD format

    const result = await pool.query(
      'UPDATE Pagamento SET ativo = $1, data_pagamento = $2 WHERE ID = $3 RETURNING *',
      [true, currentDate, sanitizedPagamentoId]
    );

    if (result.rows.length === 0) {
      console.error('Invalid pagamento_id:', sanitizedPagamentoId);
      return res.status(400).json({ error: 'Invalid pagamento_id' });
    }

    console.log('Pagamento updated:', result.rows[0]);
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating pagamento:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
