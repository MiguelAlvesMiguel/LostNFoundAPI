const express = require('express');
const pool = require('../db'); // Assuming this is your configured PostgreSQL connection pool
const admin = require('../middlewares/firebaseAdmin');
const { getAuth } = require('firebase/auth');
const moment = require('moment');

const router = express.Router();

// Sanitize input data
const sanitizeInput = (input) => {
    return input.replace(/[^a-zA-Z0-9\s]/g, '');
  };


//fazer um payment intent para meter os valores na bd (mas com ativo a falso porque ainda nao foi pago).
//payment intent e feito quando o utilizador passa da pagina do leilao para a pagina de pagamento
// Define the POST endpoint to create a payment intent
router.post('/payments/intents', async (req, res) => {
    const { licitacao_id, utilizador_id, data_pagamento, valor } = req.body;
  
    const sanitizedLicitacaoId = parseInt(sanitizeInput(licitacao_id));
    const sanitizedUtilizadorId = sanitizeInput(utilizador_id);
    const sanitizedDataPagamento = sanitizeInput(data_pagamento);
    const sanitizedValor = parseFloat(sanitizeInput(valor));
  
    if (isNaN(sanitizedLicitacaoId) || !sanitizedUtilizadorId || !sanitizedDataPagamento || isNaN(sanitizedValor)) {
      return res.status(400).json({ error: 'Invalid input: missing required fields "licitacao_id", "utilizador_id", "data_pagamento", or "valor".' });
    }
  
    // Validate date format
    if (!moment(sanitizedDataPagamento, 'YYYY-MM-DD', true).isValid()) {
      return res.status(400).send('Invalid date format. Please use YYYY-MM-DD.');
    }
  
    try {
      // Prepare the SQL query to insert a new payment intent
      const insertQuery = `
        INSERT INTO Pagamento (licitacao_id, utilizador_id, data_pagamento, valor, ativo)
        VALUES ($1, $2, $3, $4, false)
        RETURNING ID;
      `;
      const values = [sanitizedLicitacaoId, sanitizedUtilizadorId, sanitizedDataPagamento, sanitizedValor];
  
      // Execute the query with parameterized values to prevent SQL injection
      const result = await pool.query(insertQuery, values);
  
      // Retrieve the ID of the newly created payment intent
      const newPaymentId = result.rows[0].id;
  
      // Return a 201 response to indicate successful creation
      res.status(201).json({ message: 'Payment intent created successfully', id: newPaymentId });
  
    } catch (error) {
      console.error('Error creating payment intent:', error);
      res.status(500).json({ error: 'Server error while creating the payment intent.' });
    }
  });

//quando e clicado no botao de pagar, meter o ativo a true
// Define the PUT endpoint to complete a payment
router.put('/payments/complete', async (req, res) => {
    const { payment_id } = req.body;
    const paymentId = parseInt(payment_id);
  
    if (isNaN(paymentId)) {
      return res.status(400).json({ error: 'Invalid input: missing or invalid "payment_id".' });
    }
  
    try {
      // Check if the payment exists
      const checkQuery = 'SELECT 1 FROM Pagamento WHERE ID = $1';
      const checkResult = await pool.query(checkQuery, [paymentId]);
  
      if (checkResult.rowCount === 0) {
        return res.status(404).json({ error: 'Payment not found.' });
      }
  
      // Prepare the SQL query to update the payment's ativo field to true
      const updateQuery = `
        UPDATE Pagamento
        SET ativo = true
        WHERE ID = $1
      `;
      await pool.query(updateQuery, [paymentId]);
  
      // Return a 200 response to indicate successful update
      res.status(200).json({ message: 'Payment completed successfully' });
  
    } catch (error) {
      console.error('Error completing payment:', error);
      res.status(500).json({ error: 'Server error while completing the payment.' });
    }
  });


module.exports = router;