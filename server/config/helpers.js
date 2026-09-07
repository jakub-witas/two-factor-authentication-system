const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const redis = require("./redisClient");
const { v4: uuidv4 } = require("uuid");
const { blacklistedTokens } = require("./tokenStore"); 
const rateLimit = require("express-rate-limit");

const authenticateToken = (req, res, next) => {
    const  authHeader = req.headers.authorization;
    
    if(!req.headers.authorization) return res.status(401).json({ message: "Authorization header is missing" });
    
    const token = authHeader.split(' ')[1];
    if(!token) return res.status(401).json({ message: "Token is missing" });

    if (blacklistedTokens.has(token)) {
      console.log("Usage of unauthorised token!");
      return res.status(403).json({ message: "Token is blacklisted" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.body.email = decoded.email;
        next();
    } catch (error) {
        console.error("Token verification failed:", error);
        res.status(403).json({ message: "Invalid or expired token", tokenExpired: true });
    }
};

const validateInput = [
  body('email')
    .isEmail()
    .optional()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

    body('newEmail')
    .isEmail()
    .optional()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

      body('password')
      .optional()
        .isString()
        .withMessage('Password must be a string.')
        .isLength({ min: 4 })
        .withMessage('Password must be at least 4 characters long.')
        .trim(),

        body('newPassword')
      .optional()
        .isString()
        .withMessage('Password must be a string.')
        .isLength({ min: 4 })
        .withMessage('Password must be at least 4 characters long.')
        .trim(),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

async function createTempSession(userId, method) {
  const tempSessionId = uuidv4();

  const sessionData = JSON.stringify({
    userId: userId.toString(),
    method
  });

  await redis.setEx(`tempSession:${tempSessionId}`, 300, sessionData);

  return tempSessionId;
}

async function verifyTempSession(tempSessionId) {
  const sessionData = await redis.get(`tempSession:${tempSessionId}`);

  if (!sessionData) {
    return null;
  }
  
  await redis.del(`temp:${tempSessionId}`);

  return JSON.parse(sessionData);
}

const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, 
  max: 10,
  handler: (req, res, next, options) => {
    res.status(options.statusCode).json({
      error: "too_many_requests",
      message: options.message,
      retryAfter: 300
    });
  },
  message: "Zbyt wiele nieudanych prób logowania. Spróbuj ponownie za 5 minut."
});
const loginOTPLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, 
  max: 10,
  handler: (req, res, next, options) => {
    res.status(options.statusCode).json({
      error: "too_many_requests",
      message: options.message,
      retryAfter: 300
    });
  },
  message: "Zbyt wiele nieudanych prób logowania. Spróbuj ponownie za 5 minut."
});
const loginBIOLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, 
  max: 10,
  handler: (req, res, next, options) => {
    res.status(options.statusCode).json({
      error: "too_many_requests",
      message: options.message,
      retryAfter: 300
    });
  },
  message: "Zbyt wiele nieudanych prób logowania. Spróbuj ponownie za 5 minut."
});

const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, 
  max: 5,
  handler: (req, res, next, options) => {
    res.status(options.statusCode).json({
      error: "too_many_requests",
      message: options.message,
      retryAfter: 600
    });
  },
  message: "Zbyt wiele nieudanych prób logowania. Spróbuj ponownie za 10 minut."
});

module.exports = { authenticateToken, verifyTempSession, createTempSession, validateInput, loginLimiter, authLimiter, loginBIOLimiter, loginOTPLimiter };