const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const sequelize = require("./config/db");
const authRoutes = require("./routes/auth");
const rateLimit = require("express-rate-limit");
const xss = require("xss-clean");
const helmet = require("helmet");

dotenv.config();

const app = express();
app.use(express.json());

const isDevelopment = process.env.NODE_ENV === 'development';

if (isDevelopment) {
  const customCors = (req, res, next) => {
    const origin = req.headers.origin;

    if (!origin) {
      return next();
    }
    
    const isExpoTunnel = /^https?:\/\/.*\.exp\.direct/.test(origin);
    const isLocalNetwork = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.0\.\d+\.\d+)/.test(origin);
    
    if (isExpoTunnel || isLocalNetwork) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      next();
    } else {
      res.status(403).json({ 
        error: 'CORS policy violation',
        code: 'CORS_BLOCKED',
        origin: origin 
      });
    }
  };
  
  app.use(customCors);
}

const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    handler: (req, res, next, options) => {
    res.status(options.statusCode).json({
      error: "too_many_requests",
      message: options.message,
      retryAfter: 900
    });
  },
    message: "Zbyt wiele akcji. Spróbuj ponownie za 15 minut.", });
app.use(globalLimiter);
app.use(xss());
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

app.use("/api", authRoutes);

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
