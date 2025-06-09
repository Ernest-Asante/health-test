const jwt = require('jsonwebtoken');

const apiSecret = 'tzessysupzy5w6dj365mdfbg52bwm4w73rev4unnbyearyj6f4uxp3eq4c4psju2'; // Replace with your actual Stream API Secret
const userId = 'Kelvin'; // Replace with the user ID

const generateJWT = (userId) => {
    const payload = {
        user_id: userId,
        iat: Math.floor(Date.now() / 1000), // Issued at time
    };

    // Generate JWT
    const token = jwt.sign(payload, apiSecret, { algorithm: 'HS256' });
    return token;
};

// Generate and print the token
const token = generateJWT(userId);
console.log('Generated JWT:', token);
