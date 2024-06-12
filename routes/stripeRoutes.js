const express = require('express');
const cors = require('cors');
const router = express.Router();
const Stripe = require('stripe');
const stripe = Stripe('sk_test_51PK5IeFruPD66GZILbxm0eX7aH5ho2JKIBefBWDPDfwsp29YdUS0vO1UmzD5Nu7jSrNnwHOZtuRSh82lQVTzg9Yg00g0kr3CZ7'); // Use your Stripe secret key
const pool = require('../db'); // Import the database connection

// Middleware to parse request body
router.use(express.json());
router.use(cors());

const sanitizeInput = (input) => {
  return input.replace(/[^a-zA-Z0-9\s]/g, '');
};

// Endpoint to create a Checkout Session
router.post('/create-checkout-session', async (req, res) => {
  const { pagamento_id } = req.body;

  try {
    const sanitizedPagamentoId = parseInt(sanitizeInput(pagamento_id), 10);

    if (isNaN(sanitizedPagamentoId) || sanitizedPagamentoId <= 0) {
      return res.status(400).json({ error: 'Invalid pagamento_id' });
    }

    const result = await pool.query('SELECT valor FROM Pagamento WHERE ID = $1', [sanitizedPagamentoId]);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid pagamento_id' });
    }

    const amount = parseFloat(result.rows[0].valor) * 100; // Convert to cents

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
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to add a new row to Pagamento with ativo set to false
router.post('/add-pagamento', async (req, res) => {
  const { licitacao_id, utilizador_id, data_pagamento, valor } = req.body;

  try {
    const sanitizedLicitacaoId = parseInt(sanitizeInput(licitacao_id), 10);
    const sanitizedUtilizadorId = sanitizeInput(utilizador_id);
    const sanitizedDataPagamento = sanitizeInput(data_pagamento);
    const sanitizedValor = parseFloat(valor);

    if (isNaN(sanitizedLicitacaoId) || isNaN(sanitizedValor) || !sanitizedUtilizadorId || !sanitizedDataPagamento) {
      return res.status(400).json({ error: 'Invalid input' });
    }

    const result = await pool.query(
      'INSERT INTO Pagamento (licitacao_id, utilizador_id, data_pagamento, valor, ativo) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [sanitizedLicitacaoId, sanitizedUtilizadorId, sanitizedDataPagamento, sanitizedValor, false]
    );

    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to update ativo to true after a successful payment
router.post('/update-pagamento', async (req, res) => {
  const { pagamento_id } = req.body;

  try {
    const sanitizedPagamentoId = parseInt(sanitizeInput(pagamento_id), 10);

    if (isNaN(sanitizedPagamentoId) || sanitizedPagamentoId <= 0) {
      return res.status(400).json({ error: 'Invalid pagamento_id' });
    }

    const result = await pool.query(
      'UPDATE Pagamento SET ativo = $1 WHERE ID = $2 RETURNING *',
      [true, sanitizedPagamentoId]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid pagamento_id' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


//FALTA PROTEGER COM O FIREBASE E FALTA METER OS ENDPOINTS NO YAML

module.exports = router;
