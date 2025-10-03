const express = require("express");
const cors = require("cors");
const otpRoutes = require("./Otps");
const payRoutes = require("./Paystack-recepient");


const app = express();

app.use(cors());
app.options('*', cors());
app.use(express.json());

// ✅ Include all routes here
app.use("/auth", otpRoutes);
app.use("/", payRoutes);

const PORT = 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
