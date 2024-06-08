// stripeRoutes.js
const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const stripe = Stripe('sk_test_51PK5IeFruPD66GZILbxm0eX7aH5ho2JKIBefBWDPDfwsp29YdUS0vO1UmzD5Nu7jSrNnwHOZtuRSh82lQVTzg9Yg00g0kr3CZ7'); // Use your Stripe secret key

// Middleware to parse request body
router.use(express.json());

// Endpoint to create a Payment Intent
router.post('/create-payment-intent', async (req, res) => {
  const { amount, currency } = req.body;

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never' // Disable redirects
      },
    });

    res.status(200).json({ clientSecret: paymentIntent.client_secret, id: paymentIntent.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to confirm the Payment Intent using a payment method ID
router.post('/confirm-payment-intent', async (req, res) => {
  const { paymentIntentId, paymentMethodId } = req.body;

  try {
    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: paymentMethodId
    });

    res.status(200).json(paymentIntent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to check the status of the Payment Intent
router.get('/payment-intent/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(id);

    res.status(200).json(paymentIntent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


//FALTA PROTEGER COM O FIREBASE E FALTA METER OS ENDPOINTS NO YAML

module.exports = router;
