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

const { v4: uuidv4 } = require('uuid');
const paystack = require('./utils');

//const fetch = require('node-fetch'); // For fetching URLs
const path = require('path'); // For path operations like extname
const { URL } = require('url'); // For parsing URL from fileUrl

const fs = require('fs/promises'); // Async file operations
const os = require('os'); // To get the system temp directory

const mammoth = require('mammoth'); // For .docx parsing
const pdfParse = require('pdf-parse'); // For .pdf parsing

// --- NEW: Replace pptx2json with node-pptx-parser ---
const PptxParser = require('node-pptx-parser').default;
// --- END NEW ---
const JSON5 = require('json5'); // Add this to your top-level imports


const FieldValue = admin.firestore.FieldValue;

const API_KEY = "AIzaSyDIVPljDwKtn3GhwfkvzxP6JeP_OBoQkh4"; // Get API key from .env
if (!API_KEY) {
    console.error("GEMINI_API_KEY is not set in .env file!");
    // You might want to exit the process or handle this more gracefully
    process.exit(1);
}



const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-001" });

// Configure Multer for file uploads
const storage = multer.memoryStorage(); // Store the file in memory as a Buffer
const upload = multer({ storage: storage });

// OTP Expiry Time (10 minutes)
const OTP_EXPIRY_TIME = 10 * 60 * 1000;
const apiSecret = "cpkg9yrgqbxc786esgdvvmbkuz82y37gfecdrsaks6bgdnys67e57xsxdycn3xnj"; // Replace with your actual Stream API Secret

const ARKESEL_API_KEY = "TndkTnRCeHdLUHFXVkJDcGdST3E";

const YOUTUBE_API_KEY = 'AIzaSyBozBKoer2PI00pheCSXU2V8sNOgdT5urM';

const PAYSTACK_SECRET = 'sk_test_6c610086b04a2bcf687ab3ac7481186a310639ba'

async function fetchYouTubeVideo(query) {
  const apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&key=${YOUTUBE_API_KEY}&type=video&maxResults=1`;

  const response = await fetch(apiUrl);
  if (!response.ok) {
    console.log(`YouTube API request failed: ${response.statusText}`)
    throw new Error(`YouTube API request failed: ${response.statusText}`);
  }

  const data = await response.json();
  console.log(data)
  const video = data.items[0];
  if (!video) return null;

  const videoId = video.id.videoId;
  console.log(`https://www.youtube.com/embed/${videoId}`)
  return `https://www.youtube.com/embed/${videoId}`;
}


// Nodemailer Transporter
const transporter = nodemailer.createTransport({
  service: "gmail", 
  auth: {
    user: "lyncamgh@gmail.com",
    pass: "bars wfau krdw wdqk",
  }, 
});

// Function to generate OTP
const generateOtp = () => crypto.randomInt(100000, 999999).toString();



// ✅ Check if phone is unique in h-users
const isPhoneUnique = async (number) => {
  try {
    const usersRef = admin.firestore().collection("h-users");
    const snapshot = await usersRef.where("phone", "==", Number(number)).get();
     

    if (!snapshot.empty) {
      console.log(`Phone ${number} already exists in h-users`);
      return false; // Not unique
    }
    return true; // Unique
  } catch (error) {
    console.error("Error checking phone uniqueness in h-users:", error);
    throw error;
  }
};

// ✅ Check if phone is unique in merchants
const isPhoneUnique2 = async (number) => {
  try {
    const merchantsRef = admin.firestore().collection("merchants");
    const snapshot = await merchantsRef.where("phone", "==", Number(number)).get();
     

    if (!snapshot.empty) {
      console.log(`Phone ${number} already exists in merchants`);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error checking phone uniqueness in merchants:", error);
    throw error;
  }
};

// ✅ Check if email is unique in h-users
const isEmailUnique = async (email) => {
  try {
    const usersRef = admin.firestore().collection("h-users");
    const snapshot = await usersRef.where("email", "==", email).get();
     

    if (!snapshot.empty) {
      console.log(`Email ${email} already exists in h-users`);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error checking email uniqueness in h-users:", error);
    throw error;
  }
};

// ✅ Check if email is unique in merchants
const isEmailUnique2 = async (email) => {
  try {
    const merchantsRef = admin.firestore().collection("merchants");
    const snapshot = await merchantsRef.where("email", "==", email).get();
     

    if (!snapshot.empty) {
      console.log(`Email ${email} already exists in merchants`);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error checking email uniqueness in merchants:", error);
    throw error;
  }
};


/* 
=========================================
✅ Send OTP for Registration
=========================================
*/

router.post("/email/users", async (req, res) => {
  try {
    const { message } = req.body;
    const usersSnap = await db.collection("h-users").get();
    const emails = usersSnap.docs.map(doc => doc.data().email);

    await Promise.all(emails.map(email =>
      transporter.sendMail({
        from: "Lyncam HealthLink <lyncamgh@gmail.com>",
        to: email,
        subject: "Broadcast Message",
        text: message,
      })
    ));

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// Broadcast Email to Merchants
router.post("/email/merchants", async (req, res) => {
  try {
    const { message } = req.body;
    const merchantsSnap = await db.collection("merchants").get();
    const emails = merchantsSnap.docs.map(doc => doc.data().email);

    await Promise.all(emails.map(email =>
      transporter.sendMail({
        from: "Lyncam HealthLink <lyncamgh@gmail.com>",
        to: email,
        subject: "Broadcast Message",
        text: message,
      })
    ));

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


router.post("/grant-email", async (req, res) => {
  try {
    const { message, email } = req.body;

    // Validate input
    if (!email || !message) {
      return res.status(400).json({ success: false, error: "Email and message are required" });
    }

    // Send email to a single recipient
    await transporter.sendMail({
      from: "Lyncam HealthLink <lyncamgh@gmail.com>",
      to: email,
      subject: "Account Approval Message",
      text: message,
    });

    console.log("Email sent successfully to:", email);
    res.json({ success: true, email });
  } catch (error) {
    console.error("Error sending email:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});



// Utility function to normalize phone numbers
function normalizePhone(phone) {
  if (!phone) return null;
  phone = phone.toString().trim();

  if (phone.startsWith("233")) {
    return phone;
  } else if (phone.startsWith("0")) {
    return "233" + phone.substring(1);
  } else {
    return phone;
  }
}

// Broadcast SMS to Users
router.post("/sms/users", async (req, res) => {
  try {
    const { message } = req.body;
    const usersSnap = await db.collection("h-users").get();
    const phones = usersSnap.docs.map(doc => normalizePhone(doc.data().phone)).filter(Boolean);

    await Promise.all(phones.map(phone =>
      axios.post("https://sms.arkesel.com/api/v2/sms/send", {
        sender: "Lyncam",
        message,
        recipients: [phone],
      }, {
        headers: { "api-key": ARKESEL_API_KEY }
      })
    ));

    res.json({ success: true });
      console.log("success")
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Broadcast SMS to Merchants
router.post("/sms/merchants", async (req, res) => {
  try {
    const { message } = req.body;
    const merchantsSnap = await db.collection("merchants").get();
    const phones = merchantsSnap.docs.map(doc => normalizePhone(doc.data().phone)).filter(Boolean);

    await Promise.all(phones.map(phone =>
      axios.post("https://sms.arkesel.com/api/v2/sms/send", {
        sender: "Lyncam",
        message,
        recipients: [phone],
      }, {
        headers: { "api-key": ARKESEL_API_KEY }
      })
    ));

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


router.post("/grant-sms", async (req, res) => {
  try {
    const { message, phone } = req.body;

    if (!phone || !message) {
      return res.status(400).json({ success: false, error: "Phone and message are required" });
    }

    // Normalize the phone number if you have a function for it
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      return res.status(400).json({ success: false, error: "Invalid phone number" });
    }

    // Send SMS to one recipient
    await axios.post(
      "https://sms.arkesel.com/api/v2/sms/send",
      {
        sender: "Lyncam",
        message,
        recipients: [normalizedPhone],
      },
      {
        headers: { "api-key": ARKESEL_API_KEY },
      }
    );

    console.log("SMS sent successfully to:", normalizedPhone);
    res.json({ success: true, phone: normalizedPhone });
  } catch (error) {
    console.error("Error sending SMS:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});






router.post("/send-otp", async (req, res) => {
  try {
    const { email, number } = req.body;
    if (!email || !number) return res.status(400).json({ error: "Email and Number is required" });
      console.log(number)

   const uniquePhoneHUsers = await isPhoneUnique(number);
const uniqueEmailHUsers = await isEmailUnique(email);
const uniqueEmailMerchants = await isEmailUnique2(email);
      console.log(uniquePhoneHUsers)

if (!uniqueEmailHUsers || !uniqueEmailMerchants) {
  console.log("Email already in use");
  return res.json({ success: false, message: "Email is already registered" });
}

if (!uniquePhoneHUsers) {
  console.log("Phone already in use");
  return res.json({ success: false, message: "Phone number is already registered" });
}


     const data = {
        expiry: 5,
        length: 6,
        medium: "sms",
        message: "This is your OTP from Lyncam HealthLink. If you didn't request for it, ignore it: %otp_code%",
        number,
        sender_id: "Lyncam",
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

   const uniquePhoneHUsers = await isPhoneUnique(number);
const uniquePhoneMerchants = await isPhoneUnique2(number);
const uniqueEmailHUsers = await isEmailUnique(email);
const uniqueEmailMerchants = await isEmailUnique2(email);

if (!uniqueEmailHUsers || !uniqueEmailMerchants) {
  console.log("Email already in use");
  return res.json({ success: false, message: "Email is already registered" });
}

if (!uniquePhoneHUsers || !uniquePhoneMerchants) {
  console.log("Phone already in use");
  return res.json({ success: false, message: "Phone number is already registered" });
}


     const data = {
        expiry: 5,
        length: 6,
        medium: "sms",
        message: "This is your OTP from Lyncam HealthLink. Ignore it if you didn't request for it: %otp_code%",
        number,
        sender_id: "Lyncam",
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
    const { name, email, phone, userAuthId, otp } = req.body;

    // ✅ Validate required fields
    if (!name || !email || !phone || !userAuthId || !otp) {
      return res.status(400).json({ error: "All fields including OTP are required" });
    }

    console.log("User Auth ID:", userAuthId);

    // ✅ Step 1: Verify OTP with Arkesel
    const otpData = {
      api_key: ARKESEL_API_KEY,
      code: otp,
      number: phone,
    };

    try {
      const otpResponse = await axios.post(
        "https://sms.arkesel.com/api/otp/verify",
        otpData,
        {
          headers: { "api-key": ARKESEL_API_KEY },
        }
      );

      const otpResult = otpResponse.data;
      console.log("Arkesel OTP Verify Response:", otpResult);

     if (otpResult.message !== "Successful") {
  return res.status(400).json({ success: false, message: "Invalid OTP" });
}
    } catch (error) {
      console.error("Error verifying OTP:", error.response?.data || error.message);
      return res.status(500).json({
        success: false,
        message: "An error occurred during OTP verification",
        error: error.response?.data || "Failed to verify OTP",
      });
    }

    // ✅ Step 2: Check if email is unique
  

    // ✅ Step 3: Generate unique userId (string-based)
    const generateUserId = (name) => {
      const nameParts = name.trim().toLowerCase().split(/\s+/).slice(0, 2);
      const trimmedParts = nameParts.map((part) =>
        part
          .slice(0, 10)
          .replace(/[^a-z0-9@_-]+/g, "_")
          .replace(/_+/g, "_")
      );
      const baseName = trimmedParts.join("_");
      const shortTimestamp = Math.floor(Date.now() / 1000).toString().slice(-6);
      let userId = `${baseName}_${shortTimestamp}`;
      return userId.slice(0, 28);
    };

    const userId = generateUserId(name);

    // ✅ Step 4: Generate a unique 7-digit number (for user code)
    const generateUniqueNumber = async () => {
      let uniqueNumber;
      let exists = true;

      while (exists) {
        uniqueNumber = Math.floor(1000000 + Math.random() * 9000000).toString(); // 7-digit number
        const snapshot = await admin
          .firestore()
          .collection("userIds")
          .doc(uniqueNumber)
          .get();

        if (!snapshot.exists) {
          exists = false;
        }
      }

      // Store it in userIds collection
      await admin.firestore().collection("userIds").doc(uniqueNumber).set({
        createdAt: admin.firestore.Timestamp.now(),
        userAuthId,
        userEmail: email,
      });

      return uniqueNumber;
    };

    const userCode = await generateUniqueNumber();

    // ✅ Step 5: Generate JWT token
    const generateJWT = (userId, name) => {
      const payload = {
        user_id: userId,
        Name: name,
        iat: Math.floor(Date.now() / 1000),
      };
      return jwt.sign(payload, apiSecret, { algorithm: "HS256" });
    };

    const token = generateJWT(userId, name);
    const balance = parseFloat((0).toFixed(2));

    // ✅ Step 6: Register user in Firestore
    await admin.firestore().collection("h-users").doc(userAuthId).set({
      email,
      name,
      phone: Number(phone),
      balance,
      verified: true,
      userId,
      userCode: Number(userCode), // store 7-digit number
      authId: userAuthId,
      dateCreated: admin.firestore.Timestamp.now(),
      token,
      userType: "client",
    });

    return res.json({
      success: true,
      message: "User registered successfully",
      userId,
      userCode,
      authId: userAuthId,
      token,
    });
  } catch (error) {
    console.error("Error in verify-otp:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/verify-merchant-otp", async (req, res) => { 
  try {
    const {businessName, email, userAuthId, phone, otp } = req.body;
    if (!businessName || !email || !userAuthId  || !phone || !otp) { 
      return res.status(400).json({ error: "All fields are required" });
    }
 
   const otpData = {
      api_key: ARKESEL_API_KEY,
      code: otp,
      number: phone,
    };

    const otpResponse = await axios.post("https://sms.arkesel.com/api/otp/verify", otpData, {
      headers: { "api-key": ARKESEL_API_KEY },
    });

    const otpResult = otpResponse.data;
    console.log("🔸 Arkesel OTP Verify Response:", otpResult);

    // ✅ Step 2: If OTP verification fails
    if (otpResult.message !== "Successful") {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
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
    if (!phone) return res.status(400).json({ error: "Phone is required" });

  

     const data = {
        expiry: 5,
        length: 6,
        medium: "sms",
        message: "This is your OTP from Lyncam HealthLink. If you didn't request for it, ignore it: %otp_code%",
        number: phone,
        sender_id: "Lyncam",
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

      if (!otp || !phone) return res.status(400).json({ error: "Phone and Otp is required" });


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

               if (data.message !== "Successful") {
            return res.status(400).json({ success: false, message: "Invalid OTP" });
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



 router.post('/analyze-file-urls', async (req, res) => {
  const { fileUrl } = req.body;

  if (!fileUrl) {
    return res.status(400).json({ error: 'Missing fileUrl in request body.' });
  }

  let tempFilePath = null;

  try {
    const fileRes = await fetch(fileUrl);
    if (!fileRes.ok) {
      throw new Error(`Failed to fetch file. Status: ${fileRes.status}`);
    }

    const buffer = Buffer.from(await fileRes.arrayBuffer());
    const parsedUrl = new URL(fileUrl);
    const ext = path.extname(parsedUrl.pathname).toLowerCase();

    let fullText = '';

    if (ext === '.pdf') {
      const pdfData = await pdfParse(buffer);
      fullText = pdfData.text;
    } else if (ext === '.docx') {
      const result = await mammoth.extractRawText({ buffer });
      fullText = result.value;
    } else if (ext === '.pptx') {
      const uniqueFilename = `temp_pptx_${Date.now()}_${Math.random().toString(36).substring(2, 15)}.pptx`;
      tempFilePath = path.join(os.tmpdir(), uniqueFilename);
      await fs.writeFile(tempFilePath, buffer);

      try {
        const parser = new PptxParser(tempFilePath);
        const slides = await parser.extractText();

        fullText = slides
          .map(slide => slide.text.join('\n'))
          .join('\n\n')
          .trim();
      } catch (error) {
        return res.status(500).json({ error: 'Failed to parse PPTX file.' });
      }
    }

    // 🔍 Step 1: Fetch YouTube Video for Entire Lecture
    const lectureVideoUrl = await fetchYouTubeVideo(fullText.slice(0, 200)); // Use only first 500 chars for brevity

    // 🎯 Step 2: Generate Gemini Prompt (link inserted only in final unit)
    const prompt = `
You're an AI tutor. Analyze the following course content and generate:

1. A well-detailed summary broken into units or subtopics.
2. For each unit, include at most 3 MCQs with 4 options and the correct answer.
3. Only the final unit should include this YouTube video to help understand the overall lecture: ${lectureVideoUrl}
4. Strictly generate valid JSON in the format:

[
  {
    "unit": "Unit title",
    "summary": "Short summary of this unit...",
    "youtube": "https://youtube.com/embed/....", // Only in the last unit
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
`;

    // Gemini Response
    const aiResponse = await model.generateContent(prompt);
    const rawText = aiResponse.response.text();
    const cleanedText = rawText.trim().replace(/```json\n|```/g, '').trim();

    try {
      const parsed = JSON5.parse(cleanedText);
      console.log(parsed)
      return res.status(200).json(parsed);
      
    } catch (jsonError) {
      return res.status(500).json({
        error: 'AI response could not be parsed as JSON.',
        rawOutput: cleanedText,
      });
    }

  } catch (err) {
    return res.status(500).json({ error: 'Could not process file.', details: err.message });
  }
});


router.post('/analyze-file-url', async (req, res) => {
  const { fileUrl } = req.body;
  if (!fileUrl) return res.status(400).json({ error: 'Missing fileUrl in request body.' });

  let tempFilePath = null;

 try {
    const fileRes = await fetch(fileUrl);
    if (!fileRes.ok) {
      throw new Error(`Failed to fetch file. Status: ${fileRes.status}`);
    }

    const buffer = Buffer.from(await fileRes.arrayBuffer());
    const parsedUrl = new URL(fileUrl);
    const ext = path.extname(parsedUrl.pathname).toLowerCase();

    let fullText = '';

    if (ext === '.pdf') {
      const pdfData = await pdfParse(buffer);
      fullText = pdfData.text;
    } else if (ext === '.docx') {
      const result = await mammoth.extractRawText({ buffer });
      fullText = result.value;
    } else if (ext === '.pptx') {
      const uniqueFilename = `temp_pptx_${Date.now()}_${Math.random().toString(36).substring(2, 15)}.pptx`;
      tempFilePath = path.join(os.tmpdir(), uniqueFilename);
      await fs.writeFile(tempFilePath, buffer);

      try {
        const parser = new PptxParser(tempFilePath);
        const slides = await parser.extractText();

        fullText = slides
          .map(slide => slide.text.join('\n'))
          .join('\n\n')
          .trim();
      } catch (error) {
        return res.status(500).json({ error: 'Failed to parse PPTX file.' });
      }
    }


    // Step 1: Ask Gemini for a good lecture title
    const titlePrompt = `
Given the following course content, generate a short and accurate title for it.
Only respond with the title as a plain string — no extra words or formatting.

Course Content:
${fullText.slice(0, 1500)}
`;

    const titleResponse = await model.generateContent(titlePrompt);
    const lectureTitle = titleResponse.response.text().trim().replace(/["']/g, '');

    console.log('📘 Gemini Lecture Title:', lectureTitle);

    // Step 2: Search YouTube with that title
    const lectureVideoUrl = await fetchYouTubeVideo(lectureTitle);

    // Step 3: Now prompt Gemini to analyze content and include only the final video link
    const mainPrompt = `
You're an AI tutor. Analyze the following course content and generate:

1. A well-detailed summary broken into units or subtopics.
2. For each unit, include at most 3 MCQs with 4 options and the correct answer.
3. Only the final unit should include this YouTube video to help understand the overall lecture: ${lectureVideoUrl}
4. Strictly generate valid JSON in the format:

[
  {
    "unit": "Unit title",
    "summary": "Short detailed summary of this unit...",
    "youtube": "https://youtube.com/embed/....", // Only in the first and last unit
    "questions": [
      {
        "question": "What is ...?",
        "options": [
          {"value": "A", "text": "Option A"},
          {"value": "B", "text": "Option B"},
          {"value": "C", "text": "Option C"}
         
        ],
        "answer": "C"
      }
    ]
  }
]

Here is the course content:
${fullText}
`;

    const aiResponse = await model.generateContent(mainPrompt);
    const rawText = aiResponse.response.text().trim().replace(/```json\n|```/g, '');
    const parsed = JSON5.parse(rawText);

    return res.status(200).json(parsed);

  } catch (err) {
    console.error('❌ Error:', err.message);
    return res.status(500).json({ error: 'Could not process file.', details: err.message });
  }
});

router.post("/webhook", async (req, res) => {
  try {
          res.status(200).send("Webhook received");
    const hash = crypto
      .createHmac("sha512", PAYSTACK_SECRET)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (hash !== req.headers["x-paystack-signature"]) {
      return res.status(401).send("Invalid signature");
    }

    const event = req.body;
      console.log(event)

    if (event.event === "charge.success") {
      const amount = event.data.amount / 100; // convert from kobo
      const email = event.data.customer?.email; // ✅ correct place
        console.log(email)

      if (!email) {
        console.error("⚠️ No email found in Paystack event");
        return res.status(400).send("No email in event");
      }

      const usersRef = admin.firestore().collection("h-users");
      const snapshot = await usersRef.where("email", "==", email).limit(1).get();

      if (!snapshot.empty) {
    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();
    const currentBalance = userData.balance || 0;
    const finalBalance = currentBalance + amount;

    // ✅ update balance
    await userDoc.ref.update({
      balance: finalBalance,
    });

    console.log(`✅ Balance updated for ${email}: +${amount}`);

    // ✅ add notification
    await admin.firestore().collection("notifications").add({
      type: "cashin",
      date: admin.firestore.FieldValue.serverTimestamp(),
      body: `Your account has been credited. Previous balance: ${currentBalance}, Amount added: ${amount}, Final balance: ${finalBalance}`,
      authId: userData.authId, // get from user document
      email: email, // optional if you want to store
    });

    console.log(`📩 Notification stored for ${email}`);
  } else {
    console.log(`⚠️ No user found with email ${email}`);
  }
    }



      if (event.event === "transfer.success") {
  const amountInGHS = event.data.amount / 100;
  const email = event.data.recipient.email;

  if (!email) {
    console.error("⚠️ No email found in transfer metadata");
    return;
  }

  // Find merchant by email
  const merchantsSnap = await db
    .collection("merchants")
    .where("email", "==", email)
    .limit(1)
    .get();

 if (merchantsSnap.empty) {
  console.error(`⚠️ No merchant found with email: ${email}`);
  return;
}

const merchantDoc = merchantsSnap.docs[0];
const merchantRef = merchantDoc.ref;
const merchantData = merchantDoc.data();

const currentBalance = merchantData.balance || 0;
const finalBalance = currentBalance - amountInGHS;

// Deduct balance
await merchantRef.update({
  balance: finalBalance,
});

console.log(`✅ Deducted GHS ${amountInGHS} from merchant ${email}`);

// ✅ Add notification
await admin.firestore().collection("notifications").add({
  type: "cashout",
  date: admin.firestore.FieldValue.serverTimestamp(),
  body: `You have made a withdrawal. Previous balance: ${currentBalance}, Amount deducted: ${amountInGHS}, Final balance: ${finalBalance}`,
  authId: merchantData.authId, // pulled from merchant doc
  email: email, // optional, good for querying later
});

console.log(`📩 Cashout notification stored for ${email}`);
}

if (event.event === "transfer.failed") {
  console.warn("❌ Transfer failed:", event.data);
}

if (event.event === "transfer.reversed") {
  console.warn("🔄 Transfer reversed:", event.data);
}

  } catch (err) {
    console.error("Webhook Error:", err);
    res.status(500).send("Webhook error");
  }
});



// Wake-up route
router.get("/ping", (req, res) => {
  res.status(200).send("Server is awake ✅");
});


router.post('/recipients', async (req, res) => {
  try {
    const { email, name, account_number, bank_code } = req.body;

    if (!email || !name || !account_number || !bank_code) {
      return res.status(400).json({ error: 'Missing required fields: email, name, account_number, bank_code' });
    }

    // 1. Call Paystack API
    const body = {
      type: 'mobile_money',
      name,
      email,
      account_number,
      bank_code, // "MTN", "TEL", "ATL"
      currency: 'GHS'
     
    };

    const response = await paystack.post('/transferrecipient', body);
    const recipient = response.data.data;

    console.log('Created recipient:', recipient);

       const newRecipient = {
      name: name,
      type: 'mobile_money',
      account_number: account_number,
      bank_code: bank_code,
      recipient_code: recipient.recipient_code,
      createdAt: admin.firestore.Timestamp.now()
    };

    // 2) find merchant by email
    const merchantQuery = db.collection('merchants').where('email', '==', email);
    const snapshot = await merchantQuery.get();

    if (snapshot.empty) {
      // Option: create merchant doc here if desired. For now return 404
      return res.status(404).json({ status: 'error', error: 'Merchant not found' });
    }

    const merchantDocRef = snapshot.docs[0].ref;
    const merchantData = snapshot.docs[0].data();
    const existingRecipients = merchantData.recipients || [];

    // Avoid adding duplicate recipient codes
    const alreadyExists = existingRecipients.some(r => r.recipient_code === newRecipient.recipient_code);

   if (!alreadyExists) {
  // Append recipient to merchant document
  await merchantDocRef.update({
    recipients: FieldValue.arrayUnion(newRecipient)
  });


}
 else {
      console.log('Recipient already exists in merchant doc, skipping arrayUnion.');
    }

    // return success
    return res.json({
      status: 'success',
      message: 'Recipient created & saved',
      recipient: newRecipient
    });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to create recipient' });
  }
});


/**
 * 2. Initiate transfer
 */
router.post('/transfer', async (req, res) => {
  try {
    const { recipient_code, amount, email } = req.body;

    if (!recipient_code || !amount || !email) {
      return res.status(400).json({ error: 'Missing required fields: recipient_code, amount' });
    }

    // ✅ Generate compliant transfer reference (UUID v4)
    let reference = `txn_${uuidv4()}`.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (reference.length > 50) reference = reference.slice(0, 50);

    const body = {
      source: 'balance',
      reason: ' Lyncam healthlink Payout',
      amount: Math.round(amount * 100), // GHS → pesewas
      recipient: recipient_code,
      reference,
       
    };

    const response = await paystack.post('/transfer', body);
    res.json({status: 'success', message: 'Transfer initiated', transfer: response.data.data });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to initiate transfer' });
  }
});


router.post('/webhook/paystack', async (req, res) => {
  try {
    const { event, data } = req.body;

    // ✅ Acknowledge Paystack right away
    res.sendStatus(200);

    // Continue processing in background
    if (event === 'transfer.success') {
      const recipientCode = data.recipient?.recipient_code;
      const amountInGHS = data.amount / 100;

      if (!recipientCode) {
        console.error("No recipient_code in webhook data");
        return;
      }

      // Find merchant
      const merchantsSnap = await db.collection('merchants').get();
      let merchantDoc = null;

      merchantsSnap.forEach((doc) => {
        const recipients = doc.data().recipients || [];
        if (recipients.some((r) => r.recipient_code === recipientCode)) {
          merchantDoc = doc.ref;
        }
      });

      if (!merchantDoc) {
        console.error(`No merchant found with recipient_code: ${recipientCode}`);
        return;
      }

      // Deduct balance
      await merchantDoc.update({
        balance: FieldValue.increment(-amountInGHS),
      });

      console.log(`Deducted GHS ${amountInGHS} from merchant balance`);
    }

    if (event === 'transfer.failed') {
      console.log("Transfer failed:", data);
    }

    if (event === 'transfer.reversed') {
      console.log("Transfer reversed:", data);
    }
  } catch (err) {
    console.error("Webhook error:", err.message);
    // Don’t send anything here because we already sent 200
  }
});



module.exports = router;
