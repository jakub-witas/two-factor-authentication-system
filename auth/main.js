const express = require("express");
const dotenv = require("dotenv");
const sequelize = require("./config/db");
const authRoutes = require("./routes/auth");
const rateLimit = require("express-rate-limit");
const xss = require("xss-clean");
const helmet = require("helmet");
const { validateServerAccess } = require('./config/helpers');

dotenv.config();

const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 1000,
    message: "Too many login attempts from this IP, please try again after 15 minutes",
  });
  
  const app = express();
  app.use((req, res, next) => {
  console.log(">> Incoming:", req.method, req.url);
  next();
});
app.use(express.json());
app.use(globalLimiter);
app.use(xss());
app.use(validateServerAccess);
app.use(helmet());
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      "'unsafe-inline'" 
    ],
    styleSrc: [
      "'self'",
      "'unsafe-inline'" 
    ],
    imgSrc: ["'self'", "data:"],
    connectSrc: ["'self'"],
    fontSrc: ["'self'"],
    objectSrc: ["'none'"],
    mediaSrc: ["'none'"],
    frameSrc: ["'none'"]
  }
}));

app.use("/2fa", authRoutes);

const PORT = process.env.API_PORT || 3000;

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
