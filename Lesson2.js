// Load the express module
const express = require('express');

// Create an instance of Express
const app = express();

// Define the port
const PORT = 3000;

// Define a route handler for the default home page
app.get('/login', (req, res) => {
  /* 
  
  
  */
  res.send('Login successful');
});

// Start the server and listen on the specified port
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
