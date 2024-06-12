const express = require('express');
const cors = require('cors');
const router = express.Router();
const Stripe = require('stripe');
const stripe = Stripe('sk_test_51PK5IeFruPD66GZILbxm0eX7aH5ho2JKIBefBWDPDfwsp29YdUS0vO1UmzD5Nu7jSrNnwHOZtuRSh82lQVTzg9Yg00g0kr3CZ7'); // Use your Stripe secret key

// Middleware to parse request body
router.use(express.json());
router.use(cors());

const sanitizeInput = (input) => {
  return input.replace(/[^a-zA-Z0-9\s]/g, '');
};

//deve receber 
// Endpoint to create a Checkout Session
router.post('/create-checkout-session', async (req, res) => {
  const { amount } = req.body;

  try {
    const sanitizedCurrency = sanitizeInput(currency);
    const parsedAmount = parseInt(amount, 10);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: 'Test Product',
            },
            unit_amount: parsedAmount, // Amount in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: 'http://localhost:5173/success',
      cancel_url: 'http://localhost:5173/failure',
    });

    res.status(200).json({ id: session.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


//FALTA PROTEGER COM O FIREBASE E FALTA METER OS ENDPOINTS NO YAML

module.exports = router;
