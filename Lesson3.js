// Load necessary modules
const express = require('express');

const nodemailer = require('nodemailer');

const bodyParser = require('body-parser');

const app = express();

// Middleware to parse incoming JSON request bodies
app.use(bodyParser.json());

// POST endpoint to handle email sending
app.post('/send-email', async (req, res) => {

  const { email, subject, message } = req.body;

  // Validate the input data
  if (!email || !subject || !message) {
    return res.status(400).json({ error: 'Please provide email, subject, and message' });
  }

  // Setup Nodemailer transporter
  let transporter = nodemailer.createTransport({
    service: 'gmail', // or any other email service
    auth: {
      user: 'waecbay@gmail.com',  // replace with your email
      pass: 'puae vhmw tugh ltrb',   // replace with your email password or app password
    },
  }); 

  // Define email options
  let mailOptions = {
    from:  'ALLE-AI <waecbay@gmail.com>',    // sender's email
    to: email,                       // recipient's email (from input)
    subject: subject,                // subject (from input)
    text: message,                   // message (from input)
  };

  // Send email
  try {
    await transporter.sendMail(mailOptions);
    res.json({ message: 'Email sent successfully!' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Error sending email: ' + error.message });
  }
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
