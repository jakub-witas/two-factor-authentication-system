const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const sequelize = require("./config/db");
const authRoutes = require("./routes/auth");
const rateLimit = require("express-rate-limit");
// const fs = require("fs");
// const https = require("https");
const xss = require("xss-clean");
const helmet = require("helmet");

dotenv.config();

// const options = {
//   key: fs.readFileSync('./ssl/localhost-key.pem'),
//   cert: fs.readFileSync('./ssl/localhost-cert.pem')
// };

const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000,
    message: "Too many login attempts from this IP, please try again after 15 minutes",
  });

const app = express();
app.use(cors());
app.use(express.json());
app.use(globalLimiter);
app.use(xss());
app.use(helmet());

app.use("/api", authRoutes);

const PORT = process.env.API_PORT || 3000;

// https.createServer(options, app).listen(PORT, () => {
//   console.log(`HTTPS server running on port ${PORT}`);
// });

process.on("SIGINT", async () => {
  console.log("Closing database connection...");
  try {
  await sequelize.close();
  console.log("Database connection closed.");
  } catch (err) {
    console.error("Error closing Sequelize connection:", err);
    process.exit(1);
  }
  console.log("Server shutting down...");
  process.exit(0);
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
