const express = require('express');
const https = require('https');
const router = express.Router();
const { v4: uuidv4 } = require('uuid'); // Import UUID



// Paystack Secret Key (Replace with your actual key)
const PAYSTACK_SECRET_KEY = 'sk_test_3a65b1fafb0295f3a8e7cbdc32ff41c2940778e2';

console.log("PAYSTACK_SECRET_KEY:", PAYSTACK_SECRET_KEY);
console.log("PAYSTACK_SECRET_KEY:", JSON.stringify(PAYSTACK_SECRET_KEY));




// Route to create a transfer recipient
router.post('/create-recipient', (req, res) => {
    const { name, account_number, bank_code, currency } = req.body;
    console.log('Received Request Body:', req.body);


    if (!name || !account_number || !bank_code || !currency) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    const params = JSON.stringify({
        type: "mobile_money",
        name,
        account_number,
        bank_code,
        currency
    });

    const options = {
        hostname: 'api.paystack.co',
        port: 443,
        path: '/transferrecipient',
        method: 'POST',
        headers: {
            Authorization: 'Bearer sk_test_3a65b1fafb0295f3a8e7cbdc32ff41c2940778e2', // Using constant
            'Content-Type': 'application/json'
        }
    };

    const request = https.request(options, response => {
        let data = '';

        response.on('data', (chunk) => {
            data += chunk;
        });

        response.on('end', () => {
            res.json(JSON.parse(data)); // Send response to frontend
        });
    });

    request.on('error', error => {
        console.error(error);
        res.status(500).json({ error: 'Failed to create recipient' });
    });

    request.write(params);
    request.end();
});


// Route to initiate a transfer
router.post('/transfer', (req, res) => {
    const { amount, recipient, reason } = req.body;

    if (!amount || !recipient || !reason) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    const reference = uuidv4(); // Generate unique reference

    const params = JSON.stringify({
        source: "balance",
        amount,
        reference,
        recipient,
        reason
    });

    const options = {
        hostname: 'api.paystack.co',
        port: 443,
        path: '/transfer',
        method: 'POST',
        headers: {
            Authorization: 'Bearer SECRET_KEY',
            'Content-Type': 'application/json'
        }
    };

    const request = https.request(options, response => {
        let data = '';

        response.on('data', (chunk) => {
            data += chunk;
        });

        response.on('end', () => {
            res.json(JSON.parse(data));
        });
    });

    request.on('error', error => {
        console.error(error);
        res.status(500).json({ error: 'Failed to initiate transfer' });
    });

    request.write(params);
    request.end();
});


module.exports = router;