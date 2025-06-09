const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const ARKESEL_API_KEY = "TndkTnRCeHdLUHFXVkJDcGdST3E"; // Replace with your actual API key

app.post("/verify-otp", async (req, res) => {
  const { number, code } = req.body; // Get phone number and OTP from request body

  if (!number || !code) {
    return res.status(400).json({ error: "Phone number and OTP are required" });
  }

  const data = {
    api_key: ARKESEL_API_KEY,
    code: code,
    number: number,
  };

  try {
    const response = await axios.post("https://sms.arkesel.com/api/otp/verify", data, {
      headers: {
        "api-key": ARKESEL_API_KEY,
      },
    });

    res.json({
      success: true,
      message: "OTP verified successfully",
      data: response.data,
    });
  } catch (error) {
    console.error("Error verifying OTP:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data || "Failed to verify OTP",
    });
  }
});

const PORT =  3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
