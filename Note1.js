const express = require("express");
const { Expo } = require("expo-server-sdk");

const app = express();
const expo = new Expo();

const HARD_CODED_PUSH_TOKEN = "ExponentPushToken[FMQ9uHHDinOehk_9qJB-pr]"; // 🔥 Replace with your token

app.get("/send-notification", async (req, res) => {
  if (!Expo.isExpoPushToken(HARD_CODED_PUSH_TOKEN)) {
    return res.status(400).json({ error: "Invalid Expo push token" });
  }

  try {
    const response = await expo.sendPushNotificationsAsync([
      {
        to: HARD_CODED_PUSH_TOKEN,
        sound: "default",
        title: "🔥 KELVIN IS CALLING", 
        body: "This is a hardcoded message from the server!",
        priority: "high",
      },
    ]);

    console.log("Notification response:", response);
    res.json({ success: response.status, response });
  } catch (error) {
    console.error("Error sending notification:", error);
    res.status(500).json({ error: "Failed to send notification" });
  }
});

// Start server
const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
