const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const ARKESEL_API_KEY = "TndkTnRCeHdLUHFXVkJDcGdST3E"; // Replace with your actual API key

app.post("/send-otp", async (req, res) => {
  const { number } = req.body; // Get phone number from request body

 
  if (!number) {
    return res.status(400).json({ error: "Phone number is required-1" });
  }

  const data = {
    expiry: 10,
    length: 6,
    medium: "sms",
    message: "This is your OTP from HealthLine. If you didn't request for it, ignore it: %otp_code%",
    number,
    sender_id: "HealthLine",
    type: "numeric",
  };

  try {
    const response = await axios.post("https://sms.arkesel.com/api/otp/generate", data, {
      headers: {
        "api-key": ARKESEL_API_KEY,
      },
    });

    res.json({
      success: true,
      message: "OTP sent successfully",
      data: response.data,
    });
  } catch (error) {
    console.error("Error sending OTP:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data || "Failed to send OTP",
    });
  }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
