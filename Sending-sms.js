const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const ARKESEL_API_KEY = "TndkTnRCeHdLUHFXVkJDcGdST3E"; // Replace with your actual API key

// 📩 Route to send SMS
app.post("/send-sms", async (req, res) => {
  const { sender, message, recipients } = req.body;

  if (!sender || !message || !recipients || recipients.length === 0) {
    return res.status(400).json({ error: "Sender, message, and recipients are required" });
  }

  const data = {
    sender,
    message,
    recipients, // Ensure this is an array of recipient numbers
  };

  try {
    const response = await axios.post("https://sms.arkesel.com/api/v2/sms/send", data, {
      headers: {
        "api-key": ARKESEL_API_KEY,
      },
    });

    res.json({
      success: true,
      message: "SMS sent successfully",
      data: response.data,
    });
  } catch (error) {
    console.error("Error sending SMS:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data || "Failed to send SMS",
    });
  }
});

// 🌍 Start server
const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
