// utils/paystack.js
const axios = require('axios');

// ⚠️ Replace with your real Paystack secret key (test or live)
// Example: sk_test_xxxxxxxxxxxxxxxxxxxxxxxx
const PAYSTACK_SECRET = 'sk_test_6c610086b04a2bcf687ab3ac7481186a310639ba';

const paystack = axios.create({
  baseURL: 'https://api.paystack.co',
  headers: {
    Authorization: `Bearer ${PAYSTACK_SECRET}`,
    'Content-Type': 'application/json'
  }
});

module.exports = paystack;
