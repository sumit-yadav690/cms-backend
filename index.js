const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const connect = require("./config/db");
require("dotenv").config();

const app = express();

// ✅ Global CORS setup
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "ngrok-skip-browser-warning",
    ],
  })
);

// ✅ Extra safety: manual headers
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, ngrok-skip-browser-warning"
  );

  // Preflight handle
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

// ✅ Routes
const userRoute = require("./routes/user.route");
const referralRoute = require("./routes/referral.route");
const withdrawRoute = require("./routes/withdraw.route");

app.use("/user", userRoute);
app.use("/referral", referralRoute);
app.use("/withdraw", withdrawRoute);

const PORT = process.env.PORT || 8080;

// ✅ DB connect & start server
connect()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Failed to connect to MongoDB:", err.message);
  });
