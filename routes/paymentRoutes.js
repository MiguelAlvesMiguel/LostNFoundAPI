const express = require('express');
const pool = require('../db'); // Assuming this is your configured PostgreSQL connection pool
const admin = require('../middlewares/firebaseAdmin');
const { getAuth } = require('firebase/auth');

const router = express.Router();

// Sanitize input data
const sanitizeInput = (input) => {
    return input.replace(/[^a-zA-Z0-9\s]/g, '');
  };


//fazer um payment intent para meter os valores na bd (mas com ativo a falso porque ainda nao foi pago).
//payment intent e feito quando o utilizador passa da pagina do leilao para a pagina de pagamento






//quando e clicado no botao de pagar, meter o ativo a true