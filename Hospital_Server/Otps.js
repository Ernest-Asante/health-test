const express = require("express");
const router = express.Router();
const { db } = require("./firebase");
const nodemailer = require("nodemailer");
const jwt = require('jsonwebtoken');
const crypto = require("crypto");
const axios = require("axios");
const admin = require("firebase-admin");

const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');

import fetch from 'node-fetch'; // Use global fetch if on Node 18+
import pdfParse from 'pdf-parse';
//const pptxParser = require('pptx-parser'); // or whatever parser you are using
const path = require('path'); // Built-in, no install needed


const API_KEY = "AIzaSyDIVPljDwKtn3GhwfkvzxP6JeP_OBoQkh4"; // Get API key from .env
if (!API_KEY) {
    console.error("GEMINI_API_KEY is not set in .env file!");
    // You might want to exit the process or handle this more gracefully
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// Configure Multer for file uploads
const storage = multer.memoryStorage(); // Store the file in memory as a Buffer
const upload = multer({ storage: storage });

// OTP Expiry Time (10 minutes)
const OTP_EXPIRY_TIME = 10 * 60 * 1000;
const apiSecret = "tzessysupzy5w6dj365mdfbg52bwm4w73rev4unnbyearyj6f4uxp3eq4c4psju2"; // Replace with your actual Stream API Secret

const ARKESEL_API_KEY = "TndkTnRCeHdLUHFXVkJDcGdST3E";

// Nodemailer Transporter
const transporter = nodemailer.createTransport({
  service: "gmail", 
  auth: {
    user: "hollyghana@gmail.com",
    pass: "mzne ajcf zbuz oeul",
  }, 
});

// Function to generate OTP
const generateOtp = () => crypto.randomInt(100000, 999999).toString();

async function isPhoneUnique(phone) {
  const myPhone = parseInt(phone)
  const snapshot = await db.collection("h-users").where("phone", "==", myPhone).limit(1).get();
  return snapshot.empty
}

async function isPhoneUnique2(phone) {
  const myPhone = parseInt(phone)
  const snapshot = await db.collection("merchants").where("phone", "==", myPhone).limit(1).get();
  return snapshot.empty
}

async function isEmailUnique(email) {
  const snapshot = await db.collection("h-users").where("email", "==", email).limit(1).get();
  return snapshot.empty
}

async function isEmailUnique2(email) {
  const snapshot = await db.collection("merchants").where("email", "==", email).limit(1).get();
  return snapshot.empty
}

/* 
=========================================
✅ Send OTP for Registration
=========================================
*/
router.post("/send-otp", async (req, res) => {
  try {
    const { email, number } = req.body;
    if (!email || !number) return res.status(400).json({ error: "Email and Number is required" });

    const unique = await isPhoneUnique(number)
    const uniqueEmail = await isEmailUnique(email)
    const uniqueEmail2 = await isEmailUnique2(email)

    if(!uniqueEmail){
      console.log("email is already in use")
      return res.json({ message: "Email is already registered"});
    }

    if(!uniqueEmail2){
      console.log("email is already in use")
      return res.json({ message: "Email is already registered"});
    }

    if(!unique){
      console.log("phone is already in use")
      return res.json({ message: "Phone number is already registered"});
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
    
    
    return res.json({ message: "OTP sent successfully", data: response.data, success: true});
  } catch (error) {
    console.error("Error sending OTP:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data || "Failed to send OTP",
    });
  }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});



router.post("/send-merchant-otp", async (req, res) => {
  try {
    const { email, number } = req.body;
    if (!email || !number) return res.status(400).json({ error: "Email and Number is required" });

    const unique = await isPhoneUnique(number)
    const unique2 = await isPhoneUnique2(number)
    const uniqueEmail = await isEmailUnique(email)
    const uniqueEmail2 = await isEmailUnique2(email)

    if(!uniqueEmail){
      console.log("email is already in use")
      return res.json({ message: "Email is already registered"});
    }

    if(!unique){
      console.log("phone is already in use")
      return res.json({ message: "Phone number is already registered"});
    }

    if(!uniqueEmail2){
      console.log("email is already in use")
      return res.json({ message: "Email is already registered"});
    }

    if(!unique2){
      console.log("phone is already in use")
      return res.json({ message: "Phone number is already registered"});
    }

     const data = {
        expiry: 10,
        length: 6,
        medium: "sms",
        message: "This is your OTP from HealthLine. Ignore it if you didn't request for it: %otp_code%",
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
    
    
    return res.json({ message: "OTP sent successfully", data: response.data, success: true});
  } catch (error) {
    console.error("Error sending OTP:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data || "Failed to send OTP",
    });
  }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/* 
=========================================
✅ Verify OTP & Register User
=========================================
*/



router.post("/verify-otp", async (req, res) => {
  try {
    const { name, email, phone, otp, userAuthId } = req.body;
    if (!name || !email || !otp || !phone || !userAuthId) {
      return res.status(400).json({ error: "All fields are required" });
    }

    console.log(userAuthId)
    
      const data = {
        api_key: ARKESEL_API_KEY,
        code: otp,
        number: phone, 
      };
    
      try {
        const response = await axios.post("https://sms.arkesel.com/api/otp/verify", data, {
          headers: {
            "api-key": ARKESEL_API_KEY,
          },
        });

        if(response){
          const data = response.data
          console.log(response.data)

          if(data.message == "Invalid code"){
            return res.json({ message: "Invalid OTP"});
          }
        }

       



       
      } catch (error) {
        console.error("Error verifying OTP:", error.response?.data || error.message)
       return res.status(500).json({
          success: false,
          message: "An error occured",
          error: error.response?.data || "Failed to verify OTP",
        });
      }

    // Generate unique user ID
    const generateUserId = (name) => {
      // Step 1: Split and get the first two parts of the name
      const nameParts = name.trim().toLowerCase().split(/\s+/).slice(0, 2);
    
      // Step 2: Trim each name to 10 characters and clean up
      const trimmedParts = nameParts.map(part =>
        part
          .slice(0, 10)
          .replace(/[^a-z0-9@_-]+/g, "_") // remove invalid characters
          .replace(/_+/g, "_") // remove extra underscores
      );
    
      const baseName = trimmedParts.join("_");
    
      // Step 3: Generate a short timestamp (last 6 digits of Unix timestamp)
      const shortTimestamp = Math.floor(Date.now() / 1000).toString().slice(-6);
    
      // Step 4: Combine and trim to max 30 characters
      let userId = `${baseName}_${shortTimestamp}`;
      return userId.slice(0, 28);
    };
    
    
    // Generate unique user ID
    const myName = `${name}`;
    const userId = generateUserId(myName);


    // Generate JWT token
    const generateJWT = (userId, name) => {
      const payload = {
        user_id: userId,
        Name: name,
        iat: Math.floor(Date.now() / 1000),
      };
      return jwt.sign(payload, apiSecret, { algorithm: "HS256" });
    };
    
    const token = generateJWT(userId, name);

    const balance = parseFloat((0).toFixed(2)); // will be 0.00 as number

    // Store user info in Firestore
    await admin.firestore().collection("h-users").doc(userAuthId).set({
      email,
      name: name,
      phone: Number(phone),
      balance: balance,
      verified: true, // ✅ Add verified true
      userId,
      authId: userAuthId,
      dateCreated: admin.firestore.Timestamp.now(),
      token,
      userType: "client"
    });
 
    

    return res.json({
      message: "User registered successfully",
      userId: userId,
      authId: userAuthId,
      token,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});


router.post("/verify-merchant-otp", async (req, res) => { 
  try {
    const {businessName, email, otp, userAuthId, phone } = req.body;
    if (!businessName || !email || !otp || !userAuthId  || !phone) { 
      return res.status(400).json({ error: "All fields are required" });
    }
 
    console.log(userAuthId)
    
      const data = {
        api_key: ARKESEL_API_KEY,
        code: otp,
        number: phone, 
      };
    
      try {
        const response = await axios.post("https://sms.arkesel.com/api/otp/verify", data, {
          headers: {
            "api-key": ARKESEL_API_KEY,
          },
        });

        if(response){
          const data = response.data
          console.log(response.data)

          if(data.message == "Invalid code"){
            return res.json({ message: "Invalid OTP"});
          }
        }

       



       
      } catch (error) {
        console.error("Error verifying OTP:", error.response?.data || error.message)
       return res.status(500).json({
          success: false,
          message: "An error occured",
          error: error.response?.data || "Failed to verify OTP",
        });
      }


      const generateUserId = (name) => {
        // Step 1: Split and get the first two parts of the name
        const nameParts = name.trim().toLowerCase().split(/\s+/).slice(0, 2);
      
        // Step 2: Trim each name to 10 characters and clean up
        const trimmedParts = nameParts.map(part =>
          part
            .slice(0, 10)
            .replace(/[^a-z0-9@_-]+/g, "_") // remove invalid characters
            .replace(/_+/g, "_") // remove extra underscores
        );
      
        const baseName = trimmedParts.join("_");
      
        // Step 3: Generate a short timestamp (last 6 digits of Unix timestamp)
        const shortTimestamp = Math.floor(Date.now() / 1000).toString().slice(-6);
      
        // Step 4: Combine and trim to max 30 characters
        let userId = `${baseName}_${shortTimestamp}`;
        return userId.slice(0, 28);
      };
      
      
    // Generate unique user ID
    const myBusinessName = `${businessName}`;
    const userId = generateUserId(myBusinessName);

   

   
    // Generate JWT token
    const generateJWT = (userId, businessName) => {
      const payload = {
        user_id: userId,
        name: businessName,
        iat: Math.floor(Date.now() / 1000),
      };
      return jwt.sign(payload, apiSecret, { algorithm: "HS256" });
    };
    
    const token = generateJWT(userId, businessName);

    

    

    return res.json({
      message: "Merchant registered successfully",
      userId: userId,
      authId : userAuthId,
      token,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});



/* 
=========================================
✅ Resend OTP (Same as `send-otp`)
=========================================
*/
router.post("/resend-otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    // Check if the user exists
    const userRecord = await admin.auth().getUserByEmail(email).catch(() => null);
    if (!userRecord) return res.status(400).json({ error: "User not found" });

    const otp = generateOtp();
    const docRef = db.collection("otps").doc(email);

    // Store the new OTP in Firestore
    await docRef.set({ otp, timestamp: new Date() });

    // Send OTP via Email
    await transporter.sendMail({
      from: "MediTrack <hollyghana@gmail.com>",
      to: email,
      subject: "Resend OTP",
      text: `Your new OTP is ${otp}. It expires in 10 minutes.`,
    });

    return res.json({ message: "New OTP sent successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});




/* 
=========================================
✅ Forgot Password - Send OTP
=========================================
*/
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const userRecord = await admin.auth().getUserByEmail(email).catch(() => null);
    if (!userRecord) return res.status(400).json({ error: "User not found" });

    const otp = generateOtp();
    await db.collection("otps").doc(email).set({ otp, timestamp: new Date() });

    // Send OTP via Email
    await transporter.sendMail({
      from: "MediTrack <hollyghana@gmail.com>",
      to: email,
      subject: "Reset Password OTP",
      text: `Your OTP for password reset is ${otp}. It expires in 10 minutes.`,
    });

    return res.json({ success: true, message: "OTP sent successfully" });

  } catch (error) {
    console.error(error);
    return res.json({ success: false, message: "Something went wrong" });

  }
});



router.post("/update-pincode", async (req, res) => {
   try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: "Email and Number is required" });

  

     const data = {
        expiry: 10,
        length: 6,
        medium: "sms",
        message: "This is your OTP from HealthLine. If you didn't request for it, ignore it: %otp_code%",
        number: phone,
        sender_id: "HealthLine",
        type: "numeric",
      };
    
      try {
        const response = await axios.post("https://sms.arkesel.com/api/otp/generate", data, {
          headers: {
            "api-key": ARKESEL_API_KEY,
          },
        });
    
    
    return res.json({ message: "OTP sent successfully", data: response.data, success: true});
  } catch (error) {
    console.error("Error sending OTP:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data || "Failed to send OTP",
    });
  }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/* 
=========================================
✅ Verify Forgot Password OTP
=========================================
*/
router.post("/verify-forgot-password-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: "Email and OTP are required" });

    const docRef = db.collection("otps").doc(email);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(400).json({ error: "Invalid OTP or expired" });

    const { otp: storedOtp, timestamp } = doc.data();
    if (storedOtp !== otp) return res.status(400).json({ error: "Incorrect OTP" });

    if (new Date() - timestamp.toDate() > OTP_EXPIRY_TIME) {
      return res.status(400).json({ error: "OTP expired, request a new one" });
    }

    return res.json({ success: true, message: "OTP verified successfully" });

  } catch (error) {
    console.error(error);
    return res.json({ success: false, message: "Email verification failed" });

  }
});


router.post("/verify-pincode-otp", async (req, res) => {
  try {
    const {phone, otp } = req.body;

      if (!otp) return res.status(400).json({ error: "Number is required" });


     const data = {
        api_key: ARKESEL_API_KEY,
        code: otp,
        number: phone, 
      };
    
      try {
        const response = await axios.post("https://sms.arkesel.com/api/otp/verify", data, {
          headers: {
            "api-key": ARKESEL_API_KEY,
          },
        });

        if(response){
          const data = response.data
          console.log(response.data)

          if(data.message == "Invalid code"){
            return res.json({ message: "Invalid OTP"});
          }
        }

       



    return res.json({ success: true, message: "OTP verified successfully" });

      } catch (error) {
        console.error("Error verifying OTP:", error.response?.data || error.message)
       return res.status(500).json({
          success: false,
          message: "An error occured",
          error: error.response?.data || "Failed to verify OTP",
        });
      }


  } catch (error) {
    console.error(error);
    return res.json({ success: false, message: "Email verification failed" });

  }
});

/* 
=========================================
✅ Update Password Route
=========================================
*/
router.post("/update-password", async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) return res.status(400).json({ error: "Email and new password are required" });

    const userRecord = await admin.auth().getUserByEmail(email).catch(() => null);
    if (!userRecord) return res.status(400).json({ error: "User not found" });

    // Update password in Firebase Auth
    await admin.auth().updateUser(userRecord.uid, { password: newPassword });

    // Delete OTP after successful password reset
    await db.collection("otps").doc(email).delete();

    return res.json({ success: true, message: "password updated successfully" });

  } catch (error) {
    console.error(error);
    return res.json({ success: false, message: "Failed to update password" });

  }
});


router.post("/send-sms", async (req, res) => {
  let { senderName, senderPhone, receiverName, receiverPhone, amount, transactionId } = req.body;

  // Validate inputs
  if (!senderName || !senderPhone || !receiverName || !receiverPhone || !amount || !transactionId) {
    return res.status(400).json({ 
      success: false,
      error: "Missing required fields: senderName, senderPhone, receiverName, receiverPhone, amount, transactionId"
    });
  }

  try {
    // 🛠 Convert phone numbers and amount to integers
    senderPhone = senderPhone.toString(); // Convert to string
    receiverPhone = receiverPhone.toString(); // Convert to string
    amount = parseFloat(amount); // Convert amount to float

    // Safety check after parsing
    if (isNaN(senderPhone) || isNaN(receiverPhone) || isNaN(amount)) {
      return res.status(400).json({
        success: false,
        error: "Invalid senderPhone, receiverPhone, or amount format",
      });
    }
  

    // 1. Message for the Sender
    const senderMessage = `Hello ${senderName}, your payment of GHS ${amount.toFixed(2)} has been successfully sent to ${receiverName}. Transaction ID: ${transactionId}. Thank you!`;

    // 2. Message for the Receiver
    const receiverMessage = `Hello ${receiverName}, you have received a payment of GHS ${amount.toFixed(2)} from ${senderName}. Transaction ID: ${transactionId}.`;

    // Send SMS to Sender
    const sendToSender = axios.post("https://sms.arkesel.com/api/v2/sms/send", {
      sender: "HealthLine",
      message: senderMessage,
      recipients: [senderPhone],
    }, {
      headers: {
        "api-key": ARKESEL_API_KEY,
      }
    });

    // Send SMS to Receiver
    const sendToReceiver = axios.post("https://sms.arkesel.com/api/v2/sms/send", {
      sender: "HealthLine",
      message: receiverMessage,
      recipients: [receiverPhone],
    }, {
      headers: {
        "api-key": ARKESEL_API_KEY,
      }
    });

    // Wait for both SMS to complete
    const [senderResponse, receiverResponse] = await Promise.all([sendToSender, sendToReceiver]);

    res.json({
      success: true,
      message: "SMS sent successfully to both parties",
      senderResponse: senderResponse.data,
      receiverResponse: receiverResponse.data,
    });
  } catch (error) {
    console.error("Error sending SMS:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data || "Failed to send SMS",
    });
  }
});


router.post("/send-sms-merchant", async (req, res) => {
  let { senderName, senderPhone, merchantId, receiverName, receiverPhone, amount, transactionId } = req.body;

  // Validate inputs
  if (!senderName || !senderPhone || !merchantId || !receiverName || !receiverPhone || !amount || !transactionId) {
    return res.status(400).json({ 
      success: false,
      error: "Missing required fields: senderName, senderPhone, receiverName, receiverPhone, amount, transactionId"
    });
  }

  try {
    // 🛠 Convert phone numbers and amount to integers
    senderPhone = senderPhone.toString(); // Convert to string
    receiverPhone = receiverPhone.toString(); // Convert to string
    amount = parseFloat(amount); // Convert amount to float

    // Safety check after parsing
    if (isNaN(senderPhone) || isNaN(receiverPhone) || isNaN(amount)) {
      return res.status(400).json({
        success: false,
        error: "Invalid senderPhone, receiverPhone, or amount format",
      });
    }

    // 1. Message for the Sender
    const senderMessage = `Hello ${senderName}, your payment of GHS ${amount.toFixed(2)} has been successfully sent to ${receiverName}. Account Number: ${merchantId}. Transaction ID: ${transactionId}. Thank you!`;

    // 2. Message for the Receiver
    const receiverMessage = `Hello ${receiverName}, you have received a payment of GHS ${amount.toFixed(2)} from ${senderName}. Transaction ID: ${transactionId}.`;

    // Send SMS to Sender
    const sendToSender = axios.post("https://sms.arkesel.com/api/v2/sms/send", {
      sender: "HealthLine",
      message: senderMessage,
      recipients: [senderPhone],
    }, {
      headers: {
        "api-key": ARKESEL_API_KEY,
      }
    });

    // Send SMS to Receiver
    const sendToReceiver = axios.post("https://sms.arkesel.com/api/v2/sms/send", {
      sender: "HealthLine",
      message: receiverMessage,
      recipients: [receiverPhone],
    }, {
      headers: {
        "api-key": ARKESEL_API_KEY,
      }
    });

    // Wait for both SMS to complete
    const [senderResponse, receiverResponse] = await Promise.all([sendToSender, sendToReceiver]);

    console.log('successfully sent sms')
    res.json({
      success: true,
      message: "SMS sent successfully to both parties",
      senderResponse: senderResponse.data,
      receiverResponse: receiverResponse.data,
    });
  } catch (error) {
    console.error("Error sending SMS:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data || "Failed to send SMS",
    });
  }
});


router.post("/send-sms-to-recipient", async (req, res) => {
  let { senderName, receiverName, receiverPhone, amount, transactionId } = req.body;

  // Validate inputs for recipient SMS
  if (!senderName || !receiverName || !receiverPhone || !amount || !transactionId) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields: senderName (organization), receiverName, receiverPhone, amount, transactionId"
    });
  }

  try {
    // Ensure phone number is string for API and amount is float 
    receiverPhone = receiverPhone.toString();
    amount = parseFloat(amount);
 
    // Safety check after parsing
    if (isNaN(receiverPhone) || isNaN(amount)) {
      return res.status(400).json({
        success: false,
        error: "Invalid receiverPhone or amount format",
      });
    }

    // Message for the Receiver
    // `senderName` will be the organization's name, as passed from the frontend.
    const receiverMessage = `Hello ${receiverName}, you have received a payment of GHS ${amount.toFixed(2)} from ${senderName}. Transaction ID: ${transactionId}. Your balance has been updated.`;

    // Send SMS to Receiver
    const smsResponse = await axios.post("https://sms.arkesel.com/api/v2/sms/send", {
      sender: "HealthLine", // Your SMS sender ID
      message: receiverMessage,
      recipients: [receiverPhone],
    }, {
      headers: {
        "api-key": ARKESEL_API_KEY,
      }
    });

    res.json({
      success: true,
      message: "SMS sent successfully to recipient",
      smsResponse: smsResponse.data,
    });
  } catch (error) {
    console.error("Error sending SMS to recipient:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data || "Failed to send SMS to recipient",
    });
  }
});

router.post('/analyze-file-url', async (req, res) => {
  const { fileUrl } = req.body;

  if (!fileUrl) {
    return res.status(400).json({ error: 'Missing fileUrl in request body.' });
  }

  try {
    const fileRes = await fetch(fileUrl);

    if (!fileRes.ok) {
      throw new Error(Failed to fetch file. Status: ${fileRes.status});
    }

   const buffer = Buffer.from(await fileRes.arrayBuffer());

    const pdfData = await pdfParse(buffer);
    const fullText = pdfData.text;

    const prompt = 
You're an AI tutor. Analyze the following course content and generate:

1. A summary broken into units or subtopics.
2. For each unit, include at most 3 MCQs with 4 options and the correct answer.
3. For each unit, try to include a relevant YouTube video link if it helps with understanding.
4. Structure the response in JSON like this:
[
  {
    "unit": "Unit title",
    "summary": "Short summary of this unit...",
    "youtube": "https://youtube.com/...",
    "questions": [
      {
        "question": "What is ...?",
        "options": [
          {"value": "A", "text": "Option A"},
          {"value": "B", "text": "Option B"},
          {"value": "C", "text": "Option C"},
          {"value": "D", "text": "Option D"}
        ],
        "answer": "C"
      }
    ]
  }
]

Here is the course content:
${fullText}
;

    const aiResponse = await model.generateContent(prompt);
    const rawText = aiResponse.response.text();
    const cleanedText = rawText.trim().replace(/
(json)?/g, '').trim();

    try {
      const parsed = JSON.parse(cleanedText);
      return res.status(200).json(parsed);
    } catch (jsonError) {
      console.error('❌ JSON parse error:', jsonError.message);
      return res.status(500).json({ error: 'Failed to parse AI response.' });
    }

  } catch (err) {
    console.error('❌ Processing error:', err.message);
    return res.status(500).json({ error: 'Could not process file.', details: err.message });
  }
});

module.exports = router;
